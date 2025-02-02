import { db } from '#/db/query.js';

import LoggerEventType from '#/util/LoggerEventType.js';
import { profiles, resolveSelectedProfile } from '#/util/Profile.js';

export default function (f: any, opts: any, next: any) {
    f.get('/adventurelog/:username', async (req: any, res: any) => {
        try {
            const { username } = req.params;
            const profile = resolveSelectedProfile(req);

            const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirstOrThrow();

            return res.view('player/adventurelog', {
                profiles,
                profile,
                account,
                logs: await db.selectFrom('account_session').where('profile', '=', profile.id).where('account_id', '=', account.id).where('event_type', '=', LoggerEventType.ADVENTURE).orderBy('timestamp desc').limit(100).selectAll().execute()
            });
        } catch (err) {
            res.redirect('/', 302);
        }
    });

    next();
}
