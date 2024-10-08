import fs from 'fs';
import path from 'path';

import Fastify from 'fastify';
import FormBody from '@fastify/formbody';
import Multipart from '@fastify/multipart';
import Static from '@fastify/static';
import View from '@fastify/view';
import Cookie from '@fastify/cookie';
import Session from '@fastify/session';
import Cors from '@fastify/cors';
import ejs from 'ejs';

import Environment from '#lostcity/util/Environment.js';

const fastify = Fastify();

fastify.register(FormBody);
fastify.register(Multipart);

fastify.register(Static, {
    root: path.join(process.cwd(), 'public')
});

fastify.register(View, {
    engine: {
        ejs
    },
    root: path.join(process.cwd(), 'view'),
    viewExt: 'ejs'
});

fastify.register(Cookie);
fastify.register(Session, {
    secret: 'qxG38pWSAW5u6XS5pJS7jrSqwxbFgQdH',
    cookie: {
        secure: false
    }
});

if (!Environment.SKIP_CORS) {
    fastify.register(Cors, {
        origin: '*',
        methods: ['GET']
    });
}

const loaded: Set<string> = new Set();
const ignored: Set<string> = new Set();

// replaces @fastify/autoload which had some TS issues as the time of writing
async function registerAll(searchDir: string, importDir: string, prefix: string = '') {
    const entries = fs.readdirSync(searchDir);

    for (const entry of entries) {
        const entryPath = path.join(searchDir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
            await registerAll(entryPath, importDir, prefix + '/' + entry);
        } else if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.ts'))) {
            const full = importDir + prefix + '/' + entry;
            if (loaded.has(full) || ignored.has(full)) {
                continue;
            }

            fastify.register(await import(importDir + prefix + '/' + entry), {
                prefix
            });
            loaded.add(full);
        }
    }
}

await registerAll('src/lostcity/routes', '#lostcity/routes');

fastify.listen(
    {
        port: Environment.WEB_PORT,
        host: '0.0.0.0'
    },
    (err: Error | null, address: string) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        console.log(`[Web]: Listening on port ${Environment.WEB_PORT}`);
    }
);
