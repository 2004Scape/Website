import bcrypt from 'bcrypt';
import { pwnedPassword } from 'hibp';

import { db } from '#/db/query.js';

import { toDisplayName, toSafeName } from '#/jstring/JString.js';
import { isUsernameExplicit, isUsernameValid } from '#/util/Username.js';

enum CreateStep {
    USERNAME,
    TERMS,
    PASSWORD,
    FINISH
}

export default function (f: any, opts: any, next: any) {
    f.get('/', async (req: any, res: any) => {
        if (typeof req.query.reset !== 'undefined' || typeof req.session.createStep === 'undefined') {
            req.session.createStep = CreateStep.USERNAME;
            delete req.session.createUsername;
        }

        if (typeof req.session.createUsername !== 'undefined' && req.session.createStep !== CreateStep.FINISH) {
            // double check when loading between steps so the user isn't left confused if it gets sniped
            const exists = await db.selectFrom('account').where('username', '=', toSafeName(req.session.createUsername)).selectAll().executeTakeFirst();
            if (exists) {
                req.session.createStep = CreateStep.USERNAME;
                req.session.createError = `The username "${req.session.createUsername}" is already taken.`;
                delete req.session.createUsername;
                return res.redirect('/create', 302);
            }
        }

        const { createStep, createUsername, createError } = req.session;
        delete req.session.createError;

        if (createStep === CreateStep.USERNAME) {
            req.session.createStep = CreateStep.USERNAME;
            delete req.session.createUsername;

            return res.view('create/username', {
                error: createError
            });
        } else if (createStep === CreateStep.TERMS) {
            return res.view('create/terms', {
                username: createUsername
            });
        } else if (createStep === CreateStep.PASSWORD) {
            return res.view('create/password', {
                username: createUsername,
                error: createError
            });
        } else if (createStep === CreateStep.FINISH) {
            delete req.session.createStep;
            delete req.session.createUsername;

            return res.view('create/finish');
        }
    });

    f.post('/', async (req: any, res: any) => {
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const recentlyCreated = await db.selectFrom('account').where('registration_date', '>', oneHourAgo.toString()).where('registration_ip', '=', ip).selectAll().execute();
        if (recentlyCreated.length >= 3) {
            req.session.createStep = CreateStep.USERNAME;
            req.session.createError = 'You have created too many accounts recently. Please try again later.';
            delete req.session.createUsername;
            return res.redirect('/create', 302);
        }

        const { createStep } = req.session;
        const { username, password, password2, terms } = req.body;
        const name = toSafeName(username);

        if (typeof username !== 'undefined') {
            const nameCheck = isUsernameValid(username);

            if (!nameCheck.success) {
                req.session.createStep = CreateStep.USERNAME;
                req.session.createError = nameCheck.message;
                delete req.session.createUsername;
                return res.redirect('/create', 302);
            }

            const displayName = toDisplayName(username);
            const displayNameCheck = isUsernameExplicit(displayName);
            if (!displayNameCheck.success) {
                req.session.createStep = CreateStep.USERNAME;
                req.session.createError = displayNameCheck.message;
                delete req.session.createUsername;
                return res.redirect('/create', 302);
            }

            req.session.createUsername = displayName;
            const exists = await db.selectFrom('account').where('username', '=', name).selectAll().executeTakeFirst();
            if (exists) {
                req.session.createStep = CreateStep.USERNAME;
                req.session.createError = `The username "${req.session.createUsername}" is already taken.`;
                delete req.session.createUsername;
                return res.redirect('/create', 302);
            }
        }

        if (createStep === CreateStep.USERNAME) {
            req.session.createStep = CreateStep.TERMS;
        } else if (createStep === CreateStep.TERMS) {
            req.session.createStep = CreateStep.PASSWORD;
        } else if (createStep === CreateStep.PASSWORD) {
            if (!password || password.length < 5 || password.length > 20) {
                req.session.createError = 'Your password must be between 5 and 20 characters long.';
                return res.redirect('/create', 302);
            }

            if (password !== password2) {
                req.session.createError = 'Your passwords do not match.';
                return res.redirect('/create', 302);
            }

            if (terms !== 'yes') {
                req.session.createError = 'You must agree to the terms and conditions to create an account.';
                return res.redirect('/create', 302);
            }

            let { email } = req.body;
            if (typeof email === 'undefined' || !email.length) {
                email = null;
            }

            if (email !== null && !email.match(/^\S+@\S+\.\S+$/)) {
                req.session.createError = 'You must enter a valid email address.';
                return res.redirect('/create', 302);
            }

            const displayNameCheck = isUsernameExplicit(username);
            if (!displayNameCheck.success) {
                req.session.createStep = CreateStep.USERNAME;
                req.session.createError = displayNameCheck.message;
                delete req.session.createUsername;
                return res.redirect('/create', 302);
            }

            if (await pwnedPassword(password)) {
                req.session.createError = 'Your chosen password is too insecure to use.';
                return res.redirect('/create', 302);
            }

            // case insensitivity is authentic :(
            const hash = await bcrypt.hash(password.toLowerCase(), 10);
            await db
                .insertInto('account')
                .values({
                    username: toSafeName(username),
                    password: hash,
                    email,
                    registration_ip: ip
                })
                .execute();

            req.session.createStep = CreateStep.FINISH;
        }

        return res.redirect('/create', 302);
    });

    next();
}
