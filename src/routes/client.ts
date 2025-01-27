import WorldList from '#/util/WorldList.js';

export default function (f: any, opts: any, next: any) {
    f.get('/banner', async (req: any, res: any) => {
        return res.view('banner');
    });

    f.get('/client', async (req: any, res: any) => {
        if (typeof req.query.detail == 'undefined' || !req.query.detail) {
            return res.redirect('/detail', 302);
        }

        if (typeof req.query.world == 'undefined' || !req.query.world) {
            return res.redirect('/detail', 302);
        }

        if (typeof req.query.method == 'undefined') {
            return res.redirect('/detail', 302);
        }

        const world = WorldList.find(x => x.id == req.query.world);
        if (!world) {
            return res.redirect('/detail', 302);
        }

        return res.view('client', {
            world,
            detail: req.query.detail === 'low' ? 1 : 0,
            method: req.query.method
        });
    });

    next();
}
