import { WebSocket } from 'ws';
import WsSyncReq from '#3rdparty/ws-sync/ws-sync.js';

import Environment from '#lostcity/util/Environment.js';

export default class LoginClient {
    private ws: WebSocket | null = null;
    private wsr: WsSyncReq | null = null;

    async connect() {
        if (this.wsr && this.wsr.checkIfWsLive()) {
            return;
        }

        return new Promise<void>((res, rej) => {
            this.ws = new WebSocket(`ws://${Environment.LOGIN_HOST}:${Environment.LOGIN_PORT}`);

            const timeout = setTimeout(() => {
                this.ws = null;
                this.wsr = null;
                res();
            }, 10000);

            this.ws.once('close', () => {
                clearTimeout(timeout);

                this.ws = null;
                this.wsr = null;
                res();
            });

            this.ws.once('error', (err) => {
                clearTimeout(timeout);

                this.ws = null;
                this.wsr = null;
                res();
            });

            this.ws.once('open', () => {
                clearTimeout(timeout);

                this.wsr = new WsSyncReq(this.ws);
                res();
            });
        });
    }

    async count(world: number) {
        await this.connect();

        if (!this.ws || !this.wsr || !this.wsr.checkIfWsLive()) {
            return -1;
        }

        const message = await this.wsr.fetchSync({
            type: 4,
            world
        });

        if (message.error) {
            return { reply: -1, data: null };
        }

        const { count } = message.result;

        return count;
    }
}
