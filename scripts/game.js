import { UI } from "./ui.js";
import { Master } from "./master.js";
import { State } from "./state.js";

export class Game {
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
        switch (gameMsg.msg) {
            case 'Send-ACK':
                if (State.hasLobbyInit) invokeACK();
                else this.ackCB = invokeACK;                
                break;

            case "Goto-Game":
                await UI.loadGame(State.activeGCode);
                break;
            
            default:
                break;
        }
    }

    static quit(loadDash = true) {
        // [To-Do] Quit game and then load dashboard based on loadDash flag
    }

    static send(gdata) {
        Master.send("Game-MSG", gdata);
    }
}

async function invokeACK() {
    await UI.typeLobby("Starting The Game...");
    Game.send({ msg: "Ack" });
    UI.setLoader(true);
}
