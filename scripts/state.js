import { Player } from "./player.js";

export class State {
    static onGame = false;
    static urlSearch = '';
    static curGame = null;
    static activeGCode = '';
    static loggedIn = false;
    static navState = 'null';
    static hasLobbyInit = false;
    static me = new Player('-', 'Self', 'idle');

    static players = {
        "-": new Player("-", "Test User", 'idle') // Just a dummy player for testings
    };
}
