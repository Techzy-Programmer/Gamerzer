import { UI, wait } from "./ui.js";

const productionSvr = 'wss://gamerzer-rktech.koyeb.app';
const isProd = window.location.protocol === 'https:';
const localSvr = `ws://${location.host}:8844`;
let loggedIn = false;
let svr;

export class Master {
    static connect() {
        let svrAddress = isProd ? productionSvr : localSvr;
        svr = new WebSocket(svrAddress);

        svr.addEventListener('open', () => {
            UI.showToast('Connected to the server');
            const sess = localStorage.getItem('User-Session');
            if (sess != null) this.send("Login", { sess });
            else UI.setLoader(false);
        });

        svr.addEventListener('message', async (event) => {
            const msg = JSON.parse(event.data);
            const data = msg.data;

            switch (msg.type) {
                case 'Logged-In':
                    localStorage.setItem('User-Session', data.session);
                    UI.showToast(`Welcome ${data.name}`);
                    await UI.loadDashboard();
                    UI.setLoader(false);
                    loggedIn = true;
                    break;

                case 'Statistics':
                    /*
                        [To-To] ----------
                        Add rows based on data received from server
                        Afterwards make table visible with display: block
                    */
                    break;

                case '':
                    break;

                case '':
                    break;

                case 'Pong':
                    break;

                case 'Warn': case 'Error':
                    UI.setLoader(false); // Disable active loader
                    UI.showToast(msg.data, msg.type[0].toLowerCase()); // Display toast message

                    if (msg.data.includes('Session expired!')) {
                        localStorage.removeItem("User-Session");
                    }
                    break;
            }
        });

        svr.addEventListener('close', async () => {
            loggedIn = false;
            if (await checkOnline() && isProd) this.connect();
        });

        svr.addEventListener('error', async (erEvt) => {
            loggedIn = false;
            UI.showToast("Error in connecting with server", 'e', 6);

            if (svr.readyState != 1)
                if (await checkOnline() && isProd)
                    this.connect(); // Retry connection
        });
    }

    static send(type, data) {
        if (svr && svr.readyState == 1) {
            const msg = { type, data };
            svr.send(JSON.stringify(msg));
        }
        else {
            UI.setLoader(false);
        }
    }
}

async function checkOnline() {
    let notified = false;

    while (true) {
        try {
            await fetch('./media/ping.png', { cache: 'no-store' });
            return true;
        }
        catch { }

        if (!notified) {
            UI.showToast('You are offline!', 'w', 5);
            notified = true;
        }

        await wait(5000);
    }
}
