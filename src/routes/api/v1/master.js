import WorldList from '#/util/WorldList.js';

export default function (f, opts, next) {
    f.get('/worldlist', async (req, res) => {
        return WorldList;
    });

    next();
}
