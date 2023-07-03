import { Game } from "./game.js";
import { Player } from "./player.js";

export class State {
    static curGame;
    static activeGCode = '';
    static loggedIn = false;
    static navState = 'null';
    static hasLobbyInit = false;
    static me = new Player(-1, 'Self', 'idle');

    static players = {
        12345: new Player(12345, "Test User", 'idle') // Just a dummy player for testings
    };
}
