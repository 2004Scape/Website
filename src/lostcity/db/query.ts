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
    dialect
});
