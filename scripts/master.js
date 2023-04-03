import { UI, wait } from "./ui.js";
import { State } from "./state.js";
import { Player } from "./player.js";
import { Game } from "./game.js";
import { Utils } from "./utils.js";

const productionSvr = 'wss://gamerzer-rktech.koyeb.app';
const isProd = window.location.protocol === 'https:';
const localSvr = `ws://${location.host}:8844`;
let isRetryDisabled = false;
let isDisconnected = true;
let hasNotified = false;
let pingIOut = 0;
let svr;

export class Master {
    static connect() {
        if (!isDisconnected) return;
        let svrAddress = isProd ? productionSvr : localSvr;
        svr = new WebSocket(svrAddress);

        svr.addEventListener('open', () => {
            UI.showToast('Connected to the server');
            const sess = localStorage.getItem('User-Session');
            if (sess != null) this.send("Login", { sess });
            else UI.setLoader(false);
            isDisconnected = false;
            hasNotified = false;

            clearInterval(pingIOut);
            pingIOut = setInterval(() =>
                svr.readyState == 1 && svr.send('Ping'), 4 * 1000);
        });

        svr.addEventListener('message', async (event) => {
            const strData = event.data.toString();
            if (strData == 'Pong') return;
            const msg = JSON.parse(strData);
            const { data } = msg;

            switch (msg.type) {
                case 'Logged-In':
                    data.players.forEach(p => State.players[p.id] = new Player(p.id, p.name, p.status));
                    localStorage.setItem('User-Session', data.session);
                    State.me = new Player(data.id, data.name, 'idle');
                    $('#dash .top-bar .name b').text(data.name);
                    Utils.nullifyNav('dashboard');
                    
                    if (UI.getScene() === 0) {
                        UI.showToast(`Welcome ${data.name}`);
                        Utils.replaceState('dashboard');
                        await UI.loadDashboard(true);
                    }

                    State.loggedIn = true;
                    UI.setLoader(false);
                    break;

                case 'Joined':
                    if (State.me.status != 'playing') UI.showToast(`${data.name} Joined`); // Don't distract player while gameplay
                    State.players[data.id] = new Player(data.id, data.name, 'idle');
                    break;

                case 'Left':
                    if (data.id in State.players) {
                        if (State.me.status != 'playing') UI.showToast(`${State.players[data.id].name} Left`, 'w');
                        delete State.players[data.id];
                    }
                    break;

                case 'Statistics':
                    /*
                        [To-To] ----------
                        Add rows based on data received from server
                        Afterwards make table visible with display: block
                    */
                    break;

                case 'Goto-Lobby':
                    State.hasLobbyInit = false;
                    await UI.loadLobby(); // Loader get closed by this function itself
                    break;

                case 'In-Lobby':
                    State.cBack['lobby'] = () => UI.populateLobby(data.ids);
                    break;

                case 'New-Opponent':
                    UI.populateLobby([data.id]);
                    break;

                case 'Match-Making-Left':
                    const remPlrElem = $(`#lobby .players > b.show.${data.id}`);
                    remPlrElem.removeClass('show');
                    await wait(340);
                    remPlrElem.remove();
                    break;

                case 'Search-Cancelled':
                    await UI.loadDashboard();
                    State.me.status = 'idle';
                    UI.setLoader(false);
                    break;

                case "Game-MSG":
                    Game.processMSG(data);
                    break;

                case 'Session-Cancelled':
                    isRetryDisabled = true;
                    State.loggedIn = false;
                    UI.setLoader(true);
                    await UI.loadAuth();
                    UI.setLoader(false);
                    UI.showToast('Session opened in another tab', 'w', 0);
                    break;

                case 'Pong':
                    break;

                case 'Blocked':
                    UI.showToast("You are blocked by Admin!", 'w');
                    localStorage.clear();
                    UI.setLoader(true, "blocked-i5r0");
                    await wait(1000);
                    await UI.loadAuth();
                    UI.setLoader(false, "blocked-i5r0");
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

        svr.addEventListener('close', async () => onDisconnection(0));
        svr.addEventListener('error', async () => onDisconnection(1));
    }

    static send(type, data) {
        if (!svr || svr.readyState !== 1) {
          UI.showToast("Something went wrong :(");
          UI.setLoader(false);
          return;
        }
    
        const msg = { type, data };
        svr.send(JSON.stringify(msg));
    }
}

async function checkOnline() {
    let notified = false;
    let caught = false;
    let dispToast;

    while (true) {
        if (isRetryDisabled) return false;

        if ((caught || !navigator.onLine) && !notified) {
            dispToast = UI.showToast('You are offline!\nWaiting for Internet connection...', 'w', 0, false);
            UI.setLoader(true);
            notified = true;
        }

        try {
            !navigator.onLine && await (new Promise(res => window.addEventListener('online', res)));
            const fetchController = new AbortController();
            const signal = fetchController.signal;
            setTimeout(() => fetchController.abort(), 2000);
            await fetch('./media/ping.png', { cache: 'no-store', signal });
            dispToast?.hideToast();
            return true;
        }
        catch { }
        
        caught = true;
        await wait(5000);
    }
}

async function onDisconnection(popType) {
    if (!hasNotified) {
        if (popType == 0) UI.showToast("Disconnected from server!", 'e');
        else UI.showToast("Error connecting to server!", 'e');
        if (UI.getScene() == 2) await UI.loadDashboard();
        clearInterval(pingIOut);
        hasNotified = true;
    }

    if (isDisconnected) return;
    isDisconnected = true;

    State.loggedIn = false;
    if (svr.readyState != 1)
        if (!isRetryDisabled &&
            isProd && await checkOnline())
                Master.connect(); // Retry connection
        else UI.setLoader(false);
}
