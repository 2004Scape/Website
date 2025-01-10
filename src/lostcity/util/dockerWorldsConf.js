import fs from 'fs';
import path from 'path';

const worldConfig = [
    {
        id: 10,
        region: process.env.REGION || 'Docker build test',
        address: `http://localhost:${process.env.WEB_PORT || 3000}`,
        members: process.env.MEMBERS_WORLD === 'true',
        portOffset: 0
    }
];

const filePath = path.resolve('/usr/src/app/data/config/worlds.json');

fs.mkdirSync(path.dirname(filePath), { recursive: true });
fs.writeFileSync(filePath, JSON.stringify(worldConfig, null, 2));

console.log('[INFO] Worlds config generated! Much wow ');
console.log(`
    (\\(\\ 
    ( -.-) ☆彡
    o_(")(")   You're a star!`
);
