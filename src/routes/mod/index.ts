import fs from 'fs';

import { FastifyInstance } from 'fastify';

import { db, toDbDate } from '#/db/query.js';
import { toDisplayName, toSafeName } from '#/jstring/JString.js';
import LoggerEventType from '#/util/LoggerEventType.js';
import { isUsernameExplicit, isUsernameValid } from '#/util/Username.js';

function toDisplayCoord(coord: number) {
    const level = (coord >> 28) & 0x3;
    const x = (coord >> 14) & 0x3fff;
    const z = coord & 0x3fff;

    const mx = (x / 64) | 0;
    const mz = (z / 64) | 0;
    const lx = x % 64;
    const lz = z % 64;
    return `${level}_${mx}_${mz}_${lx}_${lz}`;
}

function toAbsolute(coord: number) {
    const level = (coord >> 28) & 0x3;
    const x = (coord >> 14) & 0x3fff;
    const z = coord & 0x3fff;

    return { level, x, z };
}

function toCoord(level: number, x: number, z: number) {
    return (level << 28) | (x << 14) | z;
}

function embedCoord(coord: number) {
    const { level, x, z } = toAbsolute(coord);
    return `https://mejrs.github.io/historical?era=rs2_2004_06_01&p=${level}&x=${x}&y=${z}&z=4&layer=grid`;
}

const reasons = [
    'Offensive language',
    'Item scamming',
    'Password scamming',
    'Bug abuse',
    'Staff impersonation',
    'Account sharing/trading',
    'Macroing',
    'Multiple logging in',
    'Encouraging others to break rules',
    'Misuse of customer support',
    'Advertising / website',
    'Real world item trading'
];

export default async function (app: FastifyInstance) {
    app.get('/overview/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/overview/${username}`, 302);
            }

            const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/overview', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                account,
                sessions: await db.selectFrom('session').where('account_id', '=', account.id)
                    .orderBy('timestamp desc').selectAll().execute(),
                chats: await db.selectFrom('public_chat').where('account_id', '=', account.id)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                pms: await db.selectFrom('private_chat').where('account_id', '=', account.id)
                    .leftJoin('account', 'private_chat.to_account_id', 'account.id')
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                logs: await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '!=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
                wealth: await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').limit(100).selectAll().execute(),
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.post('/note/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/overview/${username}`, 302);
            }

            const { notes } = req.body;

            await db.updateTable('account').set({
                notes,
                notes_updated: toDbDate(new Date())
            }).where('username', '=', username).execute();

            return res.redirect(`/mod/overview/${username}`, 302);
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    })

    app.get('/reports', async (req: any, res: any) => {
        try {
            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect('/account/login?redirectUrl=/mod/reports', 302);
            }

            return res.view('mod/reports', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                reports: await db.selectFrom('report').selectAll('report')
                    .innerJoin('account', 'report.account_id', 'account.id').select('account.username')
                    .orderBy('timestamp desc').execute(),
                reasons
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/uid/:uid', async (req: any, res: any) => {
        try {
            const { uid } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/uid/${uid}`, 302);
            }

            const sessions = await db.selectFrom('session').select('uid')
                .where('uid', '=', uid)
                .groupBy('account_id')
                .leftJoin('account', 'session.account_id', 'account.id').select('account.username')
                .execute();

            return res.view('mod/uid', {
                toDisplayName,
                sessions
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/ip/:ip', async (req: any, res: any) => {
        try {
            const { ip } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/ip/${ip}`, 302);
            }

            const sessions = await db.selectFrom('session').select('ip')
                .where('ip', '=', ip)
                .groupBy('account_id')
                .leftJoin('account', 'session.account_id', 'account.id').select('account.username')
                .execute();

            return res.view('mod/ip', {
                toDisplayName,
                sessions
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.post('/ban/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { banned_until } = req.body;

        if (!banned_until) {
            return res.status(400).send({ error: `Missing 'banned_until' in body` });
        }

        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        const bannedDate = new Date(banned_until);
        const isInvalidDate = isNaN(bannedDate.getTime()) || bannedDate.getTime() - (new Date()).getTime() < 0;

        await db.updateTable('account')
            .set({ banned_until: isInvalidDate ? null : toDbDate(banned_until), logged_in: 0 })
            .where('id', '=', id)
            .execute();

        return res.status(200).send({ success: true });
    });

    app.post('/unban/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ banned_until: null, logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/mute/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send();
        }

        const { id } = req.params;
        const { muted_until } = req.body;

        if (!muted_until) {
            return res.status(400).send({ error: `Missing 'muted_until' in body` });
        }

        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        const mutedDate = new Date(muted_until);
        const isInvalidDate = isNaN(mutedDate.getTime()) || mutedDate.getTime() - (new Date()).getTime() < 0;

        await db.updateTable('account')
            .set({ muted_until: isInvalidDate ? null : toDbDate(muted_until) })
            .where('id', '=', id)
            .execute();

        return res.status(200).send({ success: true });
    });

    app.post('/unmute/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send();
        }

        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ muted_until: null, logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/kick/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send();
        }

        const { id } = req.params;
        const account = db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();
        
        if (!account) {
            return res.status(400).send({ error: `Account with ID '${id}' does not exist` });
        }

        await db.updateTable('account')
            .set({ logged_in: 0 })
            .where('id', '=', id)
            .execute();
        
        return res.status(200).send({ success: true });
    });

    app.post('/change-name/:id', async (req: any, res: any) => {
        if (!req.session.account || req.session.account.staffmodlevel < 1) {
            return res.status(401).send({ error: 'Unauthorized' });
        }

        const { id } = req.params;
        const { new_username, unban } = req.body;

        if (!new_username) {
            return res.status(400).send({ error: `Missing 'new_username' in body` });
        }

        const nameCheck = isUsernameValid(new_username);
        if (!nameCheck.success) {
            return res.status(400).send({ error: nameCheck.message });
        }

        const profanityCheck = isUsernameExplicit(new_username);
        if (!profanityCheck.success) {
            return res.status(400).send({ error: nameCheck.message });
        }

        const account = await db.selectFrom('account')
            .where('id', '=', id)
            .selectAll()
            .executeTakeFirst();

        if (!account) {
            return res.status(400).send({ error: `User with '${id}' does not exist.` });
        }

        const safeNewName = toSafeName(new_username);
        const existingAccount = await db.selectFrom('account')
            .where('username', '=', safeNewName)
            .selectAll()
            .executeTakeFirst();

        if (existingAccount) {
            return res.status(400).send({ error: `User with ${new_username} already exists - please select a new name.` });
        }

        let updatePlayerModel: any = { username: safeNewName };
        if (unban === true) {
            updatePlayerModel.banned_until = null;
            updatePlayerModel.logged_in = 0;
        }

        await db.updateTable('account')
            .set(updatePlayerModel)
            .where('id', '=', id)
            .execute();

        await db.insertInto('account')
            .values({
                username: account.username,
                password: 'blocked'
            })
            .execute();

        // todo: profiles
        if (fs.existsSync(`data/players/beta/${account.username}.sav`)) {
            fs.renameSync(`data/players/beta/${account.username}.sav`, `data/players/beta/${safeNewName}.sav`);
        }

        return res.status(200).send({ success: true });
    });

    app.get('/wealth/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/wealth/${username}`, 302);
            }

            const account = await db.selectFrom('account')
                .where('username', '=', username)
                .selectAll()
                .executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/wealth', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                account,
                logs: await db.selectFrom('account_session').select(['timestamp', 'coord', 'event', 'world'])
                    .where('profile', '=', 'beta')
                    .where('account_id', '=', account.id)
                    .where('event_type', '=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').execute()
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/events/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/events/${username}`, 302);
            }

            const account = await db.selectFrom('account')
                .where('username', '=', username)
                .selectAll()
                .executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/events', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                account,
                logs: await db.selectFrom('account_session').select(['timestamp', 'coord', 'event', 'world'])
                    .where('profile', '=', 'beta')
                    .where('account_id', '=', account.id)
                    .where('event_type', '!=', LoggerEventType.WEALTH)
                    .orderBy('timestamp desc').execute()
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/chat', async (req: any, res: any) => {
        try {
            const { coord, world, timestamp } = req.query;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/chat?coord=${coord}&world=${world}&timestamp=${timestamp}`, 302);
            }

            if (typeof coord === 'undefined' || typeof world === 'undefined' || typeof timestamp === 'undefined') {
                return res.redirect('/', 302);
            }

            const center = toAbsolute(coord);
            const topLeft = { level: center.level, x: center.x - 15, z: center.z - 15 };
            const bottomRight = { level: center.level, x: center.x + 15, z: center.z + 15 };

            const allCoords: number[] = [];
            for (let x = topLeft.x; x <= bottomRight.x; x++) {
                for (let z = topLeft.z; z <= bottomRight.z; z++) {
                    allCoords.push(toCoord(center.level, x, z));
                }
            }

            const sixMinutesBefore = toDbDate(parseInt(timestamp) - (1000 * 60 * 6));
            const sixMinutesAfter = toDbDate(parseInt(timestamp) + (1000 * 60 * 6));

            const logs = await db.selectFrom('public_chat').select(['timestamp', 'coord', 'message', 'world'])
                .innerJoin('account', 'public_chat.account_id', 'account.id').select('account.username')
                .where('profile', '=', 'beta')
                .where('world', '=', world)
                .where((eb: any) => eb.or(
                    allCoords.map(c =>
                        eb('coord', '=', c)
                    )
                ))
                .where('timestamp', '<', sixMinutesAfter)
                .where('timestamp', '>', sixMinutesBefore)
                .orderBy('timestamp desc').execute();

            return res.view('mod/chat', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                logs
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/item', async (req: any, res: any) => {
        try {
            const { coord, world, timestamp } = req.query;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/item?coord=${coord}&world=${world}&timestamp=${timestamp}`, 302);
            }

            if (typeof coord === 'undefined' || typeof world === 'undefined' || typeof timestamp === 'undefined') {
                return res.redirect('/', 302);
            }

            const center = toAbsolute(coord);
            const topLeft = { level: center.level, x: center.x - 10, z: center.z - 10 };
            const bottomRight = { level: center.level, x: center.x + 10, z: center.z + 10 };

            const allCoords: number[] = [];
            for (let x = topLeft.x; x <= bottomRight.x; x++) {
                for (let z = topLeft.z; z <= bottomRight.z; z++) {
                    allCoords.push(toCoord(center.level, x, z));
                }
            }

            const sixMinutesBefore = toDbDate(parseInt(timestamp) - (1000 * 60 * 6));
            const sixMinutesAfter = toDbDate(parseInt(timestamp) + (1000 * 60 * 6));

            const logs = await db.selectFrom('account_session').select(['timestamp', 'coord', 'event', 'world'])
                .innerJoin('account', 'account_session.account_id', 'account.id').select('account.username')
                .where('profile', '=', 'beta')
                .where('world', '=', world)
                .where('event_type', '=', LoggerEventType.WEALTH)
                .where((eb: any) => eb.or(
                    allCoords.map(c =>
                        eb('coord', '=', c)
                    )
                ))
                .where('timestamp', '<', sixMinutesAfter)
                .where('timestamp', '>', sixMinutesBefore)
                .orderBy('timestamp desc').execute();

            return res.view('mod/item', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                logs
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/public/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/public/${username}`, 302);
            }

            const account = await db.selectFrom('account')
                .where('username', '=', username)
                .selectAll()
                .executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/public', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                account,
                chats: await db.selectFrom('public_chat').where('account_id', '=', account.id)
                    .orderBy('timestamp desc').selectAll().execute(),
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/private/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/private/${username}`, 302);
            }

            const account = await db.selectFrom('account')
                .where('username', '=', username)
                .selectAll()
                .executeTakeFirst();

            if (!account) {
                return res.view('mod/notfound', {
                    username
                });
            }

            return res.view('mod/private', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                account,
                chats: await db.selectFrom('private_chat').where('account_id', '=', account.id)
                    .leftJoin('account', 'private_chat.to_account_id', 'account.id')
                    .orderBy('timestamp desc').selectAll().execute(),
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/conversation', async (req: any, res: any) => {
        try {
            const { from, to } = req.query;

            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect(`/account/login?redirectUrl=/mod/conversation?from=${from}&to=${to}`, 302);
            }

            const fromAcc = await db.selectFrom('account')
                .where('username', '=', toSafeName(from))
                .selectAll()
                .executeTakeFirst();

            if (!fromAcc) {
                return res.view('mod/notfound', {
                    username: from
                });
            }

            const toAcc = await db.selectFrom('account')
                .where('username', '=', toSafeName(to))
                .selectAll()
                .executeTakeFirst();

            if (!toAcc) {
                return res.view('mod/notfound', {
                    username: to
                });
            }

            return res.view('mod/conversation', {
                toDisplayName,
                toDisplayCoord,
                embedCoord,
                fromAcc,
                toAcc,
                pms: await db.selectFrom('private_chat')
                    .where((eb) => eb.or([
                        eb('account_id', '=', fromAcc.id),
                        eb('account_id', '=', toAcc.id)
                    ]))
                    .where((eb) => eb.or([
                        eb('to_account_id', '=', fromAcc.id),
                        eb('to_account_id', '=', toAcc.id)
                    ]))
                    .orderBy('timestamp desc').selectAll().execute(),
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/recent', async (req: any, res: any) => {
        try {
            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect('/account/login?redirectUrl=/mod/recent', 302);
            }

            const recent = await db.selectFrom('account').select(['username', 'registration_ip', 'registration_date'])
                .leftJoin('session', 'account.id', 'session.account_id').select(['ip', 'uid'])
                .groupBy('id')
                .orderBy('registration_date', 'desc')
                .orderBy('timestamp', 'desc')
                .execute();

            return res.view('mod/recent', {
                toDisplayName,
                recent
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });

    app.get('/active', async (req: any, res: any) => {
        try {
            if (!req.session.account || req.session.account.staffmodlevel < 1) {
                return res.redirect('/account/login?redirectUrl=/mod/active', 302);
            }

            const recent = await db.selectFrom('account').select(['username', 'registration_ip', 'registration_date'])
                .where('logged_in', '!=', 0)
                .leftJoin('session', 'account.id', 'session.account_id').select(['ip', 'uid'])
                .groupBy('id')
                .orderBy('timestamp', 'desc')
                .execute();

            return res.view('mod/active', {
                toDisplayName,
                recent
            });
        } catch (err) {
            console.error(err);
            res.redirect('/', 302);
        }
    });
}
