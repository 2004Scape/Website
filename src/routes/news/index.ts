import { db } from '#/db/query.js';
import Environment from '#/util/Environment.js';

function getOrdinalNum(value: number) {
    let selector;

    if (value <= 0) {
        selector = 4;
    } else if ((value > 3 && value < 21) || value % 10 > 3) {
        selector = 0;
    } else {
        selector = value % 10;
    }

    return value + ['th', 'st', 'nd', 'rd', ''][selector];
}

function niceDate(date: Date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const num = getOrdinalNum(day);
    return `${num} ${month} ${year}`;
}

const categories = [
    { id: 1, name: 'Game Updates', style: 'red' },
    { id: 2, name: 'Website', style: 'lblue' },
    { id: 3, name: 'Customer Support', style: 'yellow' },
    { id: 4, name: 'Technical', style: 'dblue' },
    { id: 5, name: 'Community', style: 'green' },
    { id: 6, name: 'Behind the Scenes', style: 'purple' },
    { id: 7, name: 'Archived', style: 'white' }
];

export default function (f: any, opts: any, next: any) {
    f.get('/', async (req: any, res: any) => {
        if (!req.query.page) {
            req.query.page = 1;
        } else {
            req.query.page = parseInt(req.query.page);
        }

        const { cat, page } = req.query;

        let newsposts = db.selectFrom('newspost').orderBy('id desc');

        let category = null;
        if (cat > 0) {
            category = categories.find(c => c.id == cat) ?? categories[0];
            newsposts = newsposts.where('category', '=', category.id);
        }

        const nextPage = await newsposts
            .offset(page * 17)
            .limit(1)
            .select('id')
            .execute();
        const more = nextPage.length > 0;

        if (page > 0) {
            newsposts = newsposts.offset((page - 1) * 17);
        }

        newsposts = newsposts.limit(17);

        return res.view('news/index', {
            category,
            page,
            more,
            categories,
            newsposts: await newsposts.selectAll().execute()
        });
    });

    f.get('/:id', async (req: any, res: any) => {
        const newspost = await db.selectFrom('newspost').where('id', '=', req.params.id).selectAll().executeTakeFirst();
        if (!newspost) {
            return res.redirect('/news', 302);
        }

        const category = categories.find(c => c.id == newspost.category) ?? categories[0];
        const prev = await db.selectFrom('newspost').where('id', '<', req.params.id).where('category', '=', category.id).orderBy('id', 'desc').select('id').executeTakeFirst();
        const next = await db.selectFrom('newspost').where('id', '>', req.params.id).where('category', '=', category.id).orderBy('id', 'asc').select('id').executeTakeFirst();

        return res.view('news/post', {
            newspost,
            category,
            date: niceDate(new Date(newspost.created)),
            categories,
            prev,
            next
        });
    });

    f.get('/cs', async (req: any, res: any) => {
        return '';
    });

    f.get('/create', async (req: any, res: any) => {
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Environment.ADMIN_IP != ip) {
            return res.redirect('/', 302);
        }

        const { post } = req.query;

        if (typeof post !== 'undefined') {
            const newspost = await db.selectFrom('newspost').where('id', '=', post).selectAll().executeTakeFirst();
            if (newspost) {
                return res.view('news/create', {
                    categories,
                    date: niceDate(new Date(newspost.created)),
                    post,
                    newspost
                });
            }
        }

        return res.view('news/create', {
            categories
        });
    });

    f.post('/create', async (req: any, res: any) => {
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Environment.ADMIN_IP != ip) {
            return res.redirect('/', 302);
        }

        const { post, title, html, category } = req.body;

        if (typeof title === 'undefined' || !title.length ||
            typeof html === 'undefined' || !html.length ||
            typeof category === 'undefined' || !category.length) {
            return res.redirect('/news/create', 302);
        }

        if (typeof post !== 'undefined') {
            // update post
            const updated = await db.updateTable('newspost').set({
                title,
                content: html,
                category: category
            }).where('id', '=', post).executeTakeFirst();

            if (updated.numChangedRows == 1n) {
                return res.redirect('/news/' + post, 302);
            }
        } else {
            // add post
            const row = await db.insertInto('newspost').values({
                title,
                content: html,
                category: category
            }).executeTakeFirst();

            if (row.numInsertedOrUpdatedRows == 1n) {
                return res.redirect('/news/' + post, 302);
            }
        }

        // failed to add/update post

        return res.view('news/create', {
            categories,
            post,
            date: niceDate(new Date()),
            title,
            category,
            preview: html
        });
    });

    f.post('/preview', async (req: any, res: any) => {
        console.log(req.socket.remoteAddress);
        const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Environment.ADMIN_IP != ip) {
            return res.redirect('/', 302);
        }

        const { post, title, html, category } = req.body;

        if (typeof post !== 'undefined') {
            const newspost = await db.selectFrom('newspost').where('id', '=', post).selectAll().executeTakeFirst();
            if (newspost) {
                return res.view('news/create', {
                    categories,
                    post,
                    newspost,
                    date: niceDate(new Date(newspost.created)),
                    title,
                    category,
                    preview: html
                });
            }
        }

        return res.view('news/create', {
            categories,
            post,
            date: niceDate(new Date()),
            title,
            category,
            preview: html
        });
    });

    next();
}
