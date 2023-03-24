import { Player } from "./player.js";

export class State {
    static cBack = {};
    static activeGCode = '';
    static loggedIn = false;
    static me = new Player();
    static hasLobbyInit = false;

    static players = {
        12345: new Player(12345, "Test User", 'idle') // Just a dummy player for testings
    };
}
