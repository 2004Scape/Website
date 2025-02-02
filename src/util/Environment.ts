import 'dotenv/config';

import { tryParseInt, tryParseString} from '#/util/TryParse.js';

export default {
    WEB_PORT: tryParseInt(process.env.WEB_PORT, 80),
    ADMIN_IP: tryParseString(process.env.ADMIN_IP, 'localhost'),

    DB_BACKEND: tryParseString(process.env.DB_BACKEND, 'sqlite'),
    DB_HOST: tryParseString(process.env.DB_HOST, ''),
    DB_PORT: tryParseInt(process.env.DB_PORT, 3306),
    DB_USER: tryParseString(process.env.DB_USER, ''),
    DB_PASS: tryParseString(process.env.DB_PASS, ''),
    DB_NAME: tryParseString(process.env.DB_NAME, ''),

    SESSION_SECRET: tryParseString(process.env.SESSION_SECRET, 'qxG38pWSAW5u6XS5pJS7jrSqwxbFgQdH'),
};
