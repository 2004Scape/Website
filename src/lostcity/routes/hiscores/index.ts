export default function (f: any, opts: any, next: any) {
    f.get('/', async (req: any, res: any) => {
        if (req.query.user && req.query.category) {
            return res.view('hiscores/user');
        } else if (req.query.user) {
            return res.view('hiscores/personal');
        } else if (req.query.category) {
            return res.view('hiscores/index' + req.query.category);
        } else {
            return res.view('hiscores/index');
        }
    });

    next();
}
