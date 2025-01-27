import 'dotenv/config';

import { tryParseBoolean, tryParseInt, tryParseString} from '#/util/TryParse.js';

export default {
    PUBLIC_IP: tryParseString(process.env.PUBLIC_IP, 'localhost'),

    WEB_PORT: tryParseInt(process.env.WEB_PORT, 80),
    SKIP_CORS: tryParseBoolean(process.env.SKIP_CORS, false),
    HTTPS_ENABLED: tryParseBoolean(process.env.HTTPS_ENABLED, false),
    ADDRESS_SHOWPORT: tryParseBoolean(process.env.ADDRESS_SHOWPORT, true),
    ADMIN_IP: tryParseString(process.env.ADMIN_IP, 'localhost'),

    DB_HOST: tryParseString(process.env.DB_HOST, ''),
    DB_PORT: tryParseInt(process.env.DB_PORT, 3306),
    DB_USER: tryParseString(process.env.DB_USER, ''),
    DB_PASS: tryParseString(process.env.DB_PASS, ''),
    DB_NAME: tryParseString(process.env.DB_NAME, ''),

    LOGIN_HOST: tryParseString(process.env.LOGIN_HOST, 'localhost'),
    LOGIN_PORT: tryParseInt(process.env.LOGIN_PORT, 43500),
    LOGIN_KEY: tryParseString(process.env.LOGIN_KEY, ''),
};
