import fs from 'fs';
import path from 'path';
import worldConfig from '/usr/src/prodWorldsConf.js';

const filePath = path.resolve('/usr/src/app/data/config/worlds.json');

fs.mkdirSync(path.dirname(filePath), {recursive: true});
fs.writeFileSync(filePath, JSON.stringify(worldConfig, null, 2));

console.log('[INFO] Worlds config generated! Much wow ');
console.log(`
    (\\(\\ 
    ( -.-) ☆彡
    o_(")(")   You're a star!\n`
);
