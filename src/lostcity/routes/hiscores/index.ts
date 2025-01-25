import { toDisplayName } from '#jagex2/jstring/JString.js';
import { db } from '#lostcity/db/query.js';

import Environment from '#lostcity/util/Environment.js';

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
        let category = categories.find(c => c.id == req.query.category);
        if (typeof category === 'undefined') {
            category = categories[0];
        }

        // todo: ranking (only showing top 21 currently)
        let query = db.selectFrom(category.large ? 'hiscore_large' : 'hiscore')
            .innerJoin('account', 'account.id', category.large ? 'hiscore_large.account_id' : 'hiscore.account_id')
            .selectAll()
            .where('type', '=', category.id);

        if (category.level) {
            query = query.orderBy('level', 'desc');
        } else {
            query = query.orderBy('value', 'desc');
        }

        const results = await query.orderBy('date', 'asc').limit(21).execute();

        return res.view('hiscores/index', {
            HTTPS_ENABLED: Environment.HTTPS_ENABLED,
            toDisplayName,
            getLevelByExp,
            numberWithCommas,
            categories,
            category,
            results
        });
    });

    next();
}
