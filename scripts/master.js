const productionSvr = 'wss://app-name.koyeb.app'; // [To-Do] Change it
const localSvr = `ws://${location.host}:8080`;
const isProd = false;
let svr;

export class Master {
    static connect() {
        let svrAddress = isProd ? productionSvr : localSvr;
        svr = new WebSocket(svrAddress);

        svr.addEventListener('open', () => {
            console.log("Connected");
        });

        svr.addEventListener('message', (event) => {
            console.log('Message from server ', event.data);
        });

        svr.addEventListener('close', () => {
            // [To-Do] Add reconnection attempts
        });

        svr.addEventListener('error', (erEvt) => {
            // [To-Do] Log error & try reconnection
        });
    }

    static send() {
        if (svr && svr.readyState == 1) {
            svr.send('Message');
        }
    }
}
