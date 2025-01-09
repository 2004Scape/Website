import Environment from '#lostcity/util/Environment.js';

export default function (f, opts, next) {
    f.get('/', async (req, res) => {
        return res.view('about/index', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/getstart', async (req, res) => {
        return res.view('about/getstart', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/virtual', async (req, res) => {
        return res.view('about/virtual', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    f.get('/whatisrs', async (req, res) => {
        return res.view('about/whatisrs', {HTTPS_ENABLED: Environment.HTTPS_ENABLED});
    });

    next();
}
