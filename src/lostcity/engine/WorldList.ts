import fs from 'fs';

import LoginClient from '#lostcity/server/LoginClient.js';

import Environment from '#lostcity/util/Environment.js';

interface World {
    id: number
    region: string
    address: string
    portOffset: number
    players: number
    members: boolean
}

const WorldList: World[] = [];

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

const login = new LoginClient();

async function refreshWorldList() {
    for (const world of WorldList) {
        world.players = await login.count(world.id + 9);
    }
}

if (Environment.LOGIN_KEY) {
    await refreshWorldList();
    setInterval(refreshWorldList, 20000);
}

export default WorldList;
