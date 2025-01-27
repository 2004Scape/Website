import fs from 'fs';
import { db } from '#/db/query.js';

interface World {
    id: number
    region: string
    address: string
    portOffset: number
    players: number
    members: boolean
}

const WorldList: World[] = [];

// todo: move to db table
if (fs.existsSync('data/config/worlds.json')) {
    try {
        const worlds: World[] = JSON.parse(fs.readFileSync('data/config/worlds.json', 'utf8'));

        for (const world of worlds) {
            world.players = 0;
            WorldList.push(world);
        }
    } catch (err) {
        console.error('Error initializing world list', err);
    }
}

async function refreshWorldList() {
    try {
        for (const world of WorldList) {
            world.players = (await db.selectFrom('account').where('logged_in', '=', world.id + 9).select(db.fn.countAll().as('count')).executeTakeFirstOrThrow()).count as number;
        }
    } catch (err) {
        // no-op
    }
}

setImmediate(refreshWorldList);
setInterval(refreshWorldList, 20000);

export default WorldList;
