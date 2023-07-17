import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { State } from "./state.js";

export class Game {
    self = State.me;
    name = "Default";

    static pings = null;
    static respawnToken;
    static players = [];
    static ackCB = null;
    static isRunning = false;

    static async processMSG(gameMsg) {
        const { msg, data } = gameMsg;

        if (this.isRunning) {
            this.respawnToken = `${this.respawnToken.split('@')[0]}@${Date.now()}`;
            localStorage.setItem('RMCS-Respawn-Token', this.respawnToken);
        }

        switch (msg) {
            case 'Send-ACK':
                this.respawnToken = `${data.rspTok}@${Date.now()}`;
                if (State.hasLobbyInit) invokeACK();
                else this.ackCB = invokeACK;
                this.isRunning = true;
                this.pings = [];
                break;

            case 'Goto-Game':
                const plrsLst = [];
                State.me.status = 'playing';
                
                for (let i = 0; i < data.plrIds.length; i++)
                    if (data.plrIds[i] !== State.me.id) // Skip self
                        plrsLst.push(State.players[data.plrIds[i]]);

                // Lazy module loading to prevent circular dependency
                switch (State.activeGCode) {
                    case 'rmcs':
                        const { RMCS } = await import("./rmcs.js");
                        State.curGame = new RMCS(plrsLst);
                        break;

                    default: break;
                }

                await wait(500);
                await UI.loadGame(State.activeGCode);
                break;

            case 'Server-TS':
                this.send('Client-TS', {
                    svrTS: data.svrTS,
                    clTS: Date.now()
                });
                break;

            case 'Server-ACK-TS':
                const svAckTS = data.svrAckTS;
                const clAckTS = Date.now();
                const svTS = data.svrTS;
                const clTS = data.clTS;

                const latency = (svAckTS - svTS) -
                    ((clAckTS - clTS) * 0.5);
                this.pings?.push(latency);
                const pgLen = 4;
                
                if (this.pings?.length === pgLen) {
                    let totalPing = 0, pingClr = 'g', extra = '';
                    for (let i = 0; i < pgLen; i++) totalPing += this.pings[i];
                    let finalPing = parseInt(totalPing / pgLen);
                    if (finalPing > 999) {
                        finalPing = 999;
                        extra = '+';
                    }
                    
                    if (finalPing > 750) pingClr = 'r';
                    else if (finalPing > 500) pingClr = 'o';
                    else if (finalPing > 250) pingClr = 'y';
                    const pingEl = $('.in-stage b.game-ping');
                    pingEl.text(`${finalPing}${extra} ms`);
                    pingEl.removeClass('g y o r');
                    pingEl.addClass(pingClr);
                    this.pings = [];
                }
                break;
            
            // Let the game room handle further communications
            default: State.curGame?.handleServerResp(msg, data); break;
        }
    }

    static send(msg, data) {
        const gmData = { msg, data }
        Master.send("Game-MSG", gmData);
    }

    static async quit(isAbnormal = false) {
        if (!State.curGame) return;
        this.send("Quit", { isAbnormal });
        if (isAbnormal) $('div.modal-bx').removeClass('show');

        // Reset back the state variables
        this.pings = null;
        this.players = [];
        this.ackCB = null;
        this.isRunning = false;
        State.me.status = 'idle';
        localStorage.removeItem('RMCS-Respawn-Token');

        // Load dashboard UI
        State.curGame.dispose();
        UI.setLoader(true);
        await wait(500);
        await UI.loadDashboard();
    }
}

async function invokeACK() {
    await UI.typeLobby("Starting The Game...");
    UI.setLoader(true);
    Game.send("Ack");
}
