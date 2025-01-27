import { db } from '#/db/query.js';

import WorldList from '#/util/WorldList.js';

import Environment from '#/util/Environment.js';

export default function (f, opts, next) {
    f.get('/', async (req, res) => {
        return res.view('index', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/disclaimer', async (req, res) => {
        return res.view('disclaimer', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/title', async (req, res) => {
        let playerCount = 0;
        for (let world of WorldList) {
            playerCount += world.players;
        }

        const latestNews = Environment.DB_HOST ? await db.selectFrom('newspost').orderBy('id', 'desc').limit(5).selectAll().execute() : [];
        return res.view('title', {
            HTTPS_ENABLED: Environment.HTTPS_ENABLED,
            playerCount,
            newsposts: latestNews
        });
    });

    f.get('/serverlist', async (req, res) => {
        if (typeof req.query['lores.x'] == 'undefined' && typeof req.query['hires.x'] == 'undefined') {
            return res.redirect(302, '/detail');
        }

        if (!req.query['lores.x'] && !req.query['hires.x']) {
            return res.redirect(302, '/detail');
        }

        if (typeof req.query.method == 'undefined' || !req.query.method.length) {
            return res.redirect(302, '/detail');
        }

        let members = WorldList.filter(x => x.members).length;
        let regions = {
            'United States': 'us',
            Germany: 'ger',
            Australia: 'au',
            Japan: 'jp',
            Russia: 'rus',
            'Local Development': 'uk'
        };
        let freeRegions = WorldList.filter(x => x.region && !x.members)
            .map(x => x.region)
            .filter((x, i, self) => self.indexOf(x) == i);
        let membersRegions = WorldList.filter(x => x.region && x.members)
            .map(x => x.region)
            .filter((x, i, self) => self.indexOf(x) == i);

        if (req.query.method == 4) {
            return res.redirect('https://github.com/LostCityRS/Launcher/releases/latest');
        }

        return res.view('serverlist', {
            HTTPS_ENABLED: Environment.HTTPS_ENABLED,
            detail: typeof req.query['hires.x'] !== 'undefined' ? 'high' : 'low',
            method: req.query.method,
            worlds: WorldList,
            members,
            regions,
            freeRegions,
            membersRegions
        });
    });

    f.get('/detail', async (req, res) => {
        return res.view('detail', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/worldmap', async (req, res) => {
        return res.view('worldmap/applet');
    });

    next();
}
