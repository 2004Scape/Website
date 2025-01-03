export default function (f, opts, next) {
    f.get(
        '/',
        {
            schema: {
                querystring: {
                    pollid: { type: 'integer' }
                },
            }
        },
        async (req, res) => {
            return res.view(`polls/poll${req.query.pollid}.ejs`);
        }
    );

    next();
}
