import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { State } from "./state.js";
import { Player } from "./player.js";

export class Game {
    self = State.me;
    name = "Default";
    respawnToken = "";

    static respawnToken;
    static players = [];
    static ackCB = null;
    static isRunning = false;

    /*
        [To-Do] (Potential inactive player detection)
        Implement self pinging mechanism in game room also
        On server side itself
    */

    static async processMSG(gameMsg) {
        const { msg, data } = gameMsg;

        switch (msg) {
            case 'Send-ACK':
                this.respawnToken = data.rspTok;
                if (State.hasLobbyInit) invokeACK();
                else this.ackCB = invokeACK;                
                break;

            case "Goto-Game":
                const plrsLst = [];
                
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
            
            // Let the game room handle further communications
            default: State.curGame?.handleServerResp(msg, data); break;
        }
    }

    static send(msg, data) {
        const gmData = { msg, data }
        Master.send("Game-MSG", gmData);
    }
}

async function invokeACK() {
    await UI.typeLobby("Starting The Game...");
    UI.setLoader(true);
    Game.send("Ack");
}
