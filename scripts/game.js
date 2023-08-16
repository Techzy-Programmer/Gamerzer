import { UI, wait } from "./ui.js";
import { State } from "./state.js";
import { Master } from "./master.js";

export class Game {
    static pings = null;
    static respawnToken;
    static players = [];
    static ackCB = null;
    static halted = false;
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
                Game.halted = false;
                break;

            case 'Goto-Game':
                if (State.onGame) {
                    if (typeof State.curGame?.startRejoin === 'function')
                        State.curGame?.startRejoin(data.srf);
                    return;
                }

                const plrsLst = [];
                State.onGame = true;
                State.me.status = 'playing';
                
                for (let i = 0; i < data.plrIds.length; i++)
                    if (data.plrIds[i] !== State.me.id && State.players[data.plrIds[i]]) // Skip self and do quick-checks
                        plrsLst.push(State.players[data.plrIds[i]]);

                // Lazy module loading to prevent circular dependency
                switch (State.activeGCode) {
                    case 'rmcs':
                        const { RMCS } = await import("./rmcs.js");
                        State.curGame = new RMCS(plrsLst, data.srf);
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
                
                if (this.pings?.length >= pgLen) {
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

            case 'Quit-Success': // ToDo: Implement it on Server-Side
                if (typeof State.curGame?.dispose === 'function') State.curGame.dispose();
                UI.showToast("Previous Game ended!");
                this.dispose();
                break;
            
            default: // Let the game room handle further communications
                if (typeof State.curGame?.handleServerResp === 'function')
                    State.curGame?.handleServerResp(msg, data);
                break;
        }
    }

    static send(msg, data, pass = false, failSafe = false) {
        if (this.halted && !pass) {
            UI.showToast("Game is Paused! ", "w");
            return false;
        }
        
        const gmData = { msg, data }
        return Master.send("Game-MSG", gmData, failSafe);
    }

    static quit(isAbnormal = false, srf = '', promptQuit = false) {
        if (isAbnormal) $('div.modal-bx').removeClass('show');
        State.me.status = 'idle';
        UI.setLoader(true);
        
        if (!this.send("Quit", {
            promptQuit,
            isAbnormal,
            srf
        }, true, true)) {
            if (typeof State.curGame?.dispose === 'function')
                State.curGame.dispose();
            this.dispose();
        }
    }
    
    static async dispose() { // Must only be called after disposing the running game instance
        // Reset back the state variables
        this.pings = null;
        this.players = [];
        this.ackCB = null;
        State.onGame = false;
        State.curGame = null;
        this.isRunning = false;
        State.me.status = 'idle';
        localStorage.removeItem('RMCS-Respawn-Token');
        
        // Load dashboard UI
        UI.setLoader(true);
        await wait(500);
        await UI.loadDashboard();
        UI.setLoader(false); // Done
    }
}

async function invokeACK() {
    $('#lobby > button').css('display', 'none'); await wait(500);
    UI.typeLobby("Starting The Game");
    UI.setLoader(true);
    Game.send("Ack");
}
