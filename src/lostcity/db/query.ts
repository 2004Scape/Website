import { DB } from '#lostcity/db/types.js';
import { createPool } from 'mysql2';
import { Kysely, MysqlDialect } from 'kysely';

import Environment from '#lostcity/util/Environment.js';

const dialect = new MysqlDialect({
    pool: async () =>
        createPool({
            database: Environment.DB_NAME,
            host: Environment.DB_HOST,
            port: Environment.DB_PORT,
            user: Environment.DB_USER,
            password: Environment.DB_PASS
        })
});

export const db = new Kysely<DB>({
    dialect,
    // log(event) {
    //     if (event.level === 'query') {
    //         console.log(event.query.sql);
    //         console.log(event.query.parameters);
    //     }
    // }
});

export function toDbDate(date: Date | string | number) {
    if (typeof date === 'string' || typeof date === 'number') {
        date = new Date(date);
    }

    return date.toISOString().slice(0, 19).replace('T', ' ');
}
