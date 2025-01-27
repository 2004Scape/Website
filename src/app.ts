import path from 'path';

import Fastify from 'fastify';
import Autoload from '@fastify/autoload';
import FormBody from '@fastify/formbody';
import Multipart from '@fastify/multipart';
import Static from '@fastify/static';
import View from '@fastify/view';
import Cookie from '@fastify/cookie';
import Session from '@fastify/session';
import ejs from 'ejs';

import Environment from '#/util/Environment.js';

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

fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send();
});

fastify.setErrorHandler(function (error, request, reply) {
    if (error.validation) {
        reply.status(400).send('');
    }
})

await fastify.register(Autoload, {
    dir: 'src/routes',
    forceESM: true
});

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
