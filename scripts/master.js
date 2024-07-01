import { UI, wait } from "./ui.js";
import { State } from "./state.js";
import { Player } from "./player.js";
import { Game } from "./game.js";
import { Utils } from "./utils.js";

const isProd = window.location.protocol === 'https:';
const localSvr = `ws://${location.hostname}:8844`;
const productionSvr = 'wss://gsvr.040203.xyz';
let isRetryDisabled = false;
let isDisconnected = true;
let hasNotified = false;
let pingIOut = 0;
let fsId = 0;
let svr;

export class Master {
    static retryQueue = {};

    static connect() {
        if (!isDisconnected) return;
        let svrAddress = isProd ? productionSvr : localSvr;
        svr = new WebSocket(svrAddress);

        svr.addEventListener('open', () => {
            UI.showToast('Connected to the server');
            const sess = localStorage.getItem('User-Session');

            if (sess !== null) {
                this.send("Login", {
                    queue: this.retryQueue,
                    sess
                });
            }
            else UI.setLoader(false);

            isDisconnected = false;
            hasNotified = false;

            clearInterval(pingIOut);
            pingIOut = setInterval(() =>
                svr.readyState == 1 && svr.send('Ping'), 4 * 1000);
        });

        svr.addEventListener('message', this.handleMsg);
        svr.addEventListener('close', onDisconnection.bind(this, 0));
        svr.addEventListener('error', onDisconnection.bind(this, 1));
    }

    static send(type, data, failSafe = false) {
        if (!svr || svr.readyState !== 1) {
            if (failSafe) {
                this.retryQueue[`fs-${fsId++}`] = {
                    failSafe,
                    type,
                    data
                };

                localStorage.setItem("Retry-Queue",
                    JSON.stringify(this.retryQueue));
            }
            else UI.showToast("Something went wrong :(");
            UI.setLoader(false);
            return false;
        }
    
        const msg = { type, data };
        svr.send(JSON.stringify(msg));
        return true;
    }

    static async handleMsg(event) {
        const strData = event.data.toString();
        if (strData == 'Pong') return;
        const msg = JSON.parse(strData);
        const { data } = msg;
    
        switch (msg.type) {
            case 'Logged-In':
                data.players.forEach(p => State.players[p.id] = new Player(p.id, p.name, p.status));
                State.me = new Player(data.id, data.name, 'idle', true);
                $('#dash .top-bar .name b').text(data.name);
                const gcards = $('#dash div.gcard');
                State.me.setSession(data.session);
                Utils.nullifyNav('dashboard');
                State.loggedIn = true;
                
                for (let i = 0; i < gcards.length; i++) {
                    const gcard = gcards.eq(i); // this retrieves element in jquery's fashion
                    const gcardCode = gcard.attr('data-gcode');
                    if (!data.playables.includes(gcardCode))
                        gcard.addClass('disabled');
                }

                data.parsedQueueItems.forEach(qi => {
                    if (qi in this.retryQueue)
                        delete this.retryQueue[qi];
                });
                
                localStorage.setItem('Retry-Queue',
                    JSON.stringify(this.retryQueue));
    
                if (UI.getScene() === 0) {
                    UI.showToast(`Welcome ${data.name}`);
                    Utils.replaceState('dashboard');
                    await UI.loadDashboard(true);
                }
    
                await wait(250);
    
                if (data.respawned) {
                    const srfTok = data.respawnFactor;

                    if (!data.wasPlaying) {
                        if (State.onGame)
                            Game.quit(false, srfTok);
                        else UI.setLoader(false);
                        return;
                    }

                    State.me.status = 'playing';
                    let toReJoin = false;

                    if (window.location.pathname.startsWith('/game-')) toReJoin = true;
                    else {
                        let confRspPromise = Utils.showGetModal("Join Previous Game?", // Ask user for re-join
                            `You were playing "${data.gname}" & got disconnected abnormally! Would you like to re-join the game?`, 'Yes', 'No');
                        toReJoin = (await confRspPromise).accepted;
                    }
                    
                    if (toReJoin) {
                        if (!State.onGame)
                            UI.setLoader(true);
                        await wait(500);
                        State.activeGCode = data.gcode;
                        Game.send("Respawn-Me", { srf: srfTok }, true);
                        return;
                    }
                    else Game.quit(false, srfTok, true);
                }
                
                UI.setLoader(false);
                break;
    
            case 'Joined':
                if (State.me.status !== 'playing') UI.showToast(`${data.name} Joined`); // Don't distract player while gameplay
                State.players[data.id] = new Player(data.id, data.name, 'idle');
                break;
    
            case 'Left':
                if (data.id in State.players) {
                    if (State.me.status !== 'playing')
                        UI.showToast(`${State.players[data.id].name} Left`, 'w');
                    delete State.players[data.id];
                }
                break;
    
            case 'Statistics':
                /*
                    ToDo: Add rows based on data received from server
                    ToDo: Afterwards make table visible with 'display: block'
                */
                break;
    
            case 'Goto-Lobby':
                State.hasLobbyInit = false;
                $('#lobby > button').css('display', 'block');
                await UI.loadLobby(); // Loader get closed by this function itself
                break;
    
            case 'In-Lobby':
                UI.populateLobby(data.ids);
                break;
    
            case 'New-Opponent':
                UI.populateLobby([data.id]);
                break;
    
            case 'Match-Making-Left':
                const remPlrElem = $(`#lobby .players > b.show.p-${data.id}`);
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
                if (msg.data.includes('Session expired!'))
                    localStorage.removeItem("User-Session");
                break;
        }
    }
}

async function checkOnline() {
    let notified = false;
    let caught = false;
    let dispToast;

    while (true) {
        if (isRetryDisabled) return false;

        if ((caught || !navigator.onLine) && !notified) {
            notified = true;
            
            if (State.me.status !== 'playing') {
                dispToast = UI.showToast('Waiting for Internet connection...', 'w', 0, false);
                UI.setLoader(true);
            }
        }

        try {
            !navigator.onLine && await (new Promise(res => window.addEventListener('online', res)));
            const fetchController = new AbortController();
            const signal = fetchController.signal;
            setTimeout(() => fetchController.abort(), 2000);
            await fetch('./media/ping.png', { cache: 'no-store', signal });
            if (typeof State.curGame?.handleNetStatus === 'function')
                State.curGame.handleNetStatus(true);
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
        if (typeof State.curGame?.handleNetStatus === 'function') State.curGame.handleNetStatus(false);
        if (popType == 0) UI.showToast("Disconnected from server!", 'e');
        else UI.showToast("Error connecting to server!", 'e');
        if (UI.getScene() == 2) await UI.loadDashboard();
        clearInterval(pingIOut);
        hasNotified = true;
    }

    svr.removeEventListener('message', this.handleMsg);
    if (isDisconnected) return;
    isDisconnected = true;
    State.loggedIn = false;
    
    if (svr.readyState != 1)
        if (!isRetryDisabled && await checkOnline())
            Master.connect(); // Retry connection
        else UI.setLoader(false);
}
