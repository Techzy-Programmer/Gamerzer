import { Player } from "./player.js";

export class State {
    static tOut = {};
    static cBack = {};
    static loggedIn = false;
    static me = new Player();

    static players = {
        "-1": new Player(),
        1011: new Player(1011, "Test User", 'idle')
    };
}
