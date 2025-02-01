import { FastifyInstance } from 'fastify';

import { db } from '#/db/query.js';

import Environment from '#/util/Environment.js';
import WorldList from '#/util/WorldList.js';

export default async function (app: FastifyInstance) {
    app.get('/', async (req, reply) => {
        return reply.view('index');
    });

    app.get('/disclaimer', async (req, reply) => {
        return reply.view('disclaimer');
    });

    app.get('/title', async (req, reply) => {
        let playerCount = 0;
        for (let world of WorldList) {
            playerCount += world.players;
        }

        const latestNews = Environment.DB_HOST ? await db.selectFrom('newspost').orderBy('id', 'desc').limit(5).selectAll().execute() : [];
        return reply.view('title', {
            playerCount,
            newsposts: latestNews
        });
    });

    interface QueryServerList {
        method: number;
        'hires.x'?: number;
        'hires.y'?: number;
        'lores.x'?: number;
        'lores.y'?: number;
    }

    app.get<{
        Querystring: QueryServerList
    }>('/serverlist', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    'hires.x': { type: 'number' },
                    'hires.y': { type: 'number' },
                    'lores.x': { type: 'number' },
                    'lores.y': { type: 'number' },
                    'method': { type: 'number' },
                },
                required: ['method']
            }
        }
    }, async (req, reply) => {
        let members = WorldList.filter(x => x.members).length;
        let regions = {
            'United States': 'us',
            Germany: 'ger',
            Australia: 'au',
            Japan: 'jp',
            Russia: 'rus',
            India: 'ind',
            Sweden: 'swe',
            'Local Development': 'uk'
        };
        let freeRegions = WorldList.filter(x => x.region && !x.members)
            .map(x => x.region)
            .filter((x, i, self) => self.indexOf(x) == i);
        let membersRegions = WorldList.filter(x => x.region && x.members)
            .map(x => x.region)
            .filter((x, i, self) => self.indexOf(x) == i);

        if (req.query.method == 4) {
            return reply.redirect('https://github.com/LostCityRS/Launcher/releases/latest');
        }

        return reply.view('serverlist', {
            detail: typeof req.query['hires.x'] !== 'undefined' ? 'high' : 'low',
            method: req.query.method,
            worlds: WorldList,
            members,
            regions,
            freeRegions,
            membersRegions
        });
    });

    app.get('/detail', async (req, reply) => {
        return reply.view('detail');
    });

    app.get('/worldmap', async (req, reply) => {
        return reply.view('worldmap/applet');
    });

    app.get('/guide', async (req, reply) => {
        return reply.view('guide');
    });
}
