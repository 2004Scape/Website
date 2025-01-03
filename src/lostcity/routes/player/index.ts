import { db } from '#lostcity/db/query.js';
import LoggerEventType from '#lostcity/util/LoggerEventType.js';

export default function (f: any, opts: any, next: any) {
    f.get('/adventurelog/:username', async (req: any, res: any) => {
        const { username } = req.params;

        try {
            const account = await db.selectFrom('account').where('username', '=', username).selectAll().executeTakeFirstOrThrow();

            return res.view('player/adventurelog', {
                account,
                logs: await db.selectFrom('account_session').where('account_id', '=', account.id).where('event_type', '=', LoggerEventType.ADVENTURE).orderBy('timestamp desc').limit(100).selectAll().execute()
            });
        } catch (err) {
            res.redirect('/', 302);
        }
    });

    next();
}
