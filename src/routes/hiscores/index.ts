import { toDisplayName, toSafeName } from '#/jstring/JString.js';
import { db } from '#/db/query.js';
import { profiles, resolveSelectedProfile } from '#/util/Profile.js';

const categories = [
    { id: 0, name: 'Overall', large: true, level: true },
    { id: 1, name: 'Attack' },
    { id: 2, name: 'Defence' },
    { id: 3, name: 'Strength' },
    { id: 4, name: 'Hitpoints' },
    { id: 5, name: 'Ranged' },
    { id: 6, name: 'Prayer' },
    { id: 7, name: 'Magic' },
    { id: 8, name: 'Cooking' },
    { id: 9, name: 'Woodcutting' },
    { id: 10, name: 'Fletching' },
    { id: 11, name: 'Fishing' },
    { id: 12, name: 'Firemaking' },
    { id: 13, name: 'Crafting' },
    { id: 14, name: 'Smithing' },
    { id: 15, name: 'Mining' },
    { id: 16, name: 'Herblore' },
    { id: 17, name: 'Agility' },
    { id: 18, name: 'Thieving' },
    { id: 21, name: 'Runecrafting' }
];

const levelExperience = new Int32Array(99);

let acc = 0;
for (let i = 0; i < 99; i++) {
    const level = i + 1;
    const delta = Math.floor(level + Math.pow(2.0, level / 7.0) * 300.0);
    acc += delta;
    levelExperience[i] = Math.floor(acc / 4) * 10;
}

function getLevelByExp(exp: number) {
    for (let i = 98; i >= 0; i--) {
        if (exp >= levelExperience[i]) {
            return Math.min(i + 2, 99);
        }
    }

    return 1;
}

function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function (f: any, opts: any, next: any) {
    f.get('/', async (req: any, res: any) => {
        const profile = resolveSelectedProfile(req);

        let category = categories.find(c => c.id == req.query.category);
        if (typeof category === 'undefined') {
            category = categories[0];
        }

        let query = db.selectFrom(category.large ? 'hiscore_large' : 'hiscore')
            .innerJoin('account', 'account.id', category.large ? 'hiscore_large.account_id' : 'hiscore.account_id')
            .select(['account_id', 'type', 'level', 'value', 'date', 'account.username'])
            .where('type', '=', category.id).where('profile', '=', profile.id)
            .select((eb) =>
                eb.fn.agg<number>('row_number', [])
                    .over((ob) => category.level ?
                        ob.partitionBy('type').orderBy('level', 'desc').orderBy('value', 'desc').orderBy('date', 'asc') :
                        ob.partitionBy('type').orderBy('value', 'desc').orderBy('date', 'asc')
                    )
                    .as('rank')
            );

        query = query.limit(21);

        let selectedRank: number = req.query.rank ? parseInt(req.query.rank) : 0;

        if (req.query.username) {
            const username = toSafeName(req.query.username);

            const usernameRankQuery = db.selectFrom(category.large ? 'hiscore_large' : 'hiscore')
                .select(['account_id', 'type'])
                .select((eb) =>
                    eb.fn.agg<number>('row_number', [])
                        .over((ob) => category.level ?
                            ob.partitionBy('type').orderBy('level', 'desc').orderBy('value', 'desc').orderBy('date', 'asc') :
                            ob.partitionBy('type').orderBy('value', 'desc').orderBy('date', 'asc')
                        )
                        .as('rank')
                )
                .where('profile', '=', profile.id);

            const usernameRank = await db.selectFrom(usernameRankQuery.as('h'))
                .innerJoin('account', 'account.id', 'h.account_id')
                .select(['rank'])
                .where('account.username', '=', username).where('type', '=', category.id)
                .executeTakeFirst();

            if (usernameRank && usernameRank.rank) {
                selectedRank = usernameRank.rank
            }
        }

        if (selectedRank > 0) {
            // note: RS has their rank search place the rank at the bottom of the list
            query = query.offset(Math.max(selectedRank - 21, 0));
        }

        const results: {
            account_id: number,
            type: number,
            level: number,
            value: number | bigint,
            date: string,
            rank?: number,
            highlighted?: boolean
        }[] = await query.orderBy('rank').execute();

        if (selectedRank > 0) {
            const row = results.find(r => r.rank == selectedRank);
            if (row) {
                row.highlighted = true;
            }
        }

        return res.view('hiscores/index', {
            toDisplayName,
            numberWithCommas,
            profile,
            profiles,
            categories,
            category,
            results,
            rank: req.query.rank,
            username: req.query.username
        });
    });

    f.get('/player/:username', async (req: any, res: any) => {
        const profile = resolveSelectedProfile(req);

        const username = req.params.username || req.query.username;

        const columnsToSelect = ['account_id','h.type','h.level','h.value','h.date'] as const;

        const hiscoreRankQuery = db.selectFrom('hiscore as h')
            .select([...columnsToSelect])
            .select((eb) =>
                eb.fn.agg<number>('row_number', [])
                    .over((ob) => ob.partitionBy('type').orderBy('value', 'desc').orderBy('date', 'asc'))
                    .as('rank')
            ).where('profile', '=', profile.id);

        const hiscoreLargeRankQuery = db.selectFrom('hiscore_large as h')
            .select([...columnsToSelect])
            .select((eb) =>
                eb.fn.agg<number>('row_number', [])
                    .over((ob) => ob.partitionBy('type').orderBy('level', 'desc').orderBy('value', 'desc').orderBy('date', 'asc'))
                    .as('rank')
            ).where('profile', '=', profile.id);

        const combinedQuery = db.selectFrom(hiscoreRankQuery.unionAll(hiscoreLargeRankQuery).as('h'))
            .innerJoin('account', 'account.id', 'h.account_id')
            .select([
                ...columnsToSelect,
                'h.rank',
            ])
            .where('account.username', '=', username)
            .orderBy('type', 'asc');

        const results: {
            account_id: number,
            type: number,
            level: number,
            value: number | bigint,
            date: string,
            rank?: number
        }[] = await combinedQuery.orderBy('rank').execute();

        if (results.length === 0) {
            return res.view('hiscores/no_results', {
                toDisplayName,
                profile,
                profiles,
                username
            })
        }
        
        return res.view('hiscores/player', {
            toDisplayName,
            numberWithCommas,
            profile,
            profiles,
            username,
            categories,
            results
        });
    });

    next();
}
