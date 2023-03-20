import { Player } from "./player.js";

export class State {
    static cBack = {};
    static loggedIn = false;
    static me = new Player();

    static players = {
        12345: new Player(12345, "Test User", 'idle') // Just a dummy player for testings
    };
}
