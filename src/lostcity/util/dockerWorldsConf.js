/**
 * @fileoverview
 * This script dynamically loads a world configuration file from the Server repo.
 * 
 * Purpose:
 * - This script loads worlds file dynamically from server repo
 * - Its meant to be used only with docker production build
 * 
 * Why? 
 * - You don't have to pull and modify Website repository just to configure your worlds
 * - Simplifies running prod setup
 * - Keeps the Server repo as the single source 
*/

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
