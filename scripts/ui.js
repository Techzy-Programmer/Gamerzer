import { Game } from "./game.js";
import { State } from "./state.js";
import { Utils } from "./utils.js";

let loaderToken = "n/a";
let activeScene = 0;
let typerID = -1;

let sceneMap = {
    0: $('div#sandwich > #authform'),
    1: $('div#sandwich > #dash'),
    2: $('div#sandwich > #lobby'),
    3: $('div#sandwich > #rmcs')
}

export class UI {
    static sameScene(scn) {
        let condt = scn === activeScene;
        if (condt) this.setLoader(false);
        return condt;
    }

    static async loadAuth() {
        const scene = 0;
        if (this.sameScene(scene)) return;
        
        await hideScene();
        await showScene(scene);
        Utils.replaceState('auth');
    }

    static async loadDashboard(prevPush = false) {
        const scene = 1;
        if (this.sameScene(scene)) return;
                
        await hideScene();
        await showScene(scene);
        if (!prevPush) Utils.pushState('dashboard');
    }

    static async loadLobby() {
        const scene = 2;
        if (this.sameScene(scene)) return;

        await hideScene();
        await showScene(scene);
        this.setLoader(false);
        await wait(400);
        Utils.pushState('lobby');
        State.me.status = 'searching';
        this.typeLobby("Searching For Players");

        State.hasLobbyInit = true;
        if (typeof Game.ackCB == 'function') {
            Game.ackCB();
            Game.ackCB = null;
        }
    }

    static typeLobby(typeTxt) {
        const schTxt = sceneMap[2].find('.text');
        cancelAnimationFrame(typerID);
        let tmpTxt = "";
        let i = 0;

        async function startTyping() {
            const typeChar = typeTxt[i];
            tmpTxt += typeChar;
            schTxt.text(tmpTxt);
            await wait(20); i++;
            if (i >= typeTxt.length) return;
            typerID = requestAnimationFrame(startTyping);
        }

        typerID = requestAnimationFrame(startTyping);
    }

    static async loadGame(gcode) {
        switch (gcode) {
            case 'rmcs': { // Raja Mantri Chor Sipahi
                const scene = 3;
                await hideScene();
                await showScene(scene);
            }

            default:
                break;
        }

        Utils.pushState('game-quit');
        Utils.pushState('game-play');
    }

    static async populateLobby(ids) {
        let i = 0;
        ids.forEach(async id => {
            const newUserEl = $('<b/>', { 'class': `p-${id}` });
            newUserEl.text(State.players[id].name);
            $('#lobby .players').append(newUserEl);
            await wait((i++) * 300); await wait(20);
            newUserEl.addClass('show');
        });
    }

    static setLoader(toShow, ownerToken = "n/a") {
        if (this.getScene() === 0 && !toShow)
            $('#authform a[disabled="true"]').removeAttr('disabled');

        // ownerToken verifies if caller has enough rights to close the loader
        if (toShow) loaderToken = ownerToken;
        else {
            if (ownerToken != loaderToken) {
                return;
            }
        }

        if (!toShow) $('body').removeClass('loading');
        else $('body').addClass('loading');
    }

    static showToast(msg, type = 'i', dur = 4, closable = true) {
        let strBG = '#000000db';

        switch (type) {
            case 'i':
                strBG = 'linear-gradient(to right, #2816ffeb, #002532e8)';
                break;
            case 'w':
                strBG = 'linear-gradient(to right, #726700eb, #473a00e8)';
                break;
            case 'e':
                strBG = 'linear-gradient(to right, #ff5000eb, #980099e8)';
                break;
        }

        const toast =
        Toastify({
            text: msg,
            close: closable,
            gravity: 'bottom',
            stopOnFocus: true,
            duration: dur * 1000,
            offset: { y: '15px' },
            style: {
                display: "flex",
                background: strBG,
                "text-align": "center",
                "border-radius": "40px",
                "max-width": "calc(100% - 20px)",
                "justify-content": "space-between",
                "transition": "all .4s cubic-bezier(0.18, 0.89, 0.32, 1.28)"
            }
        });

        toast.showToast();
        return toast;
    }

    static initLobby(gname) {
        sceneMap[2].find('.text').text("");
        sceneMap[2].find('i.gname').text(gname);
        sceneMap[2].find('.players').empty();
        sceneMap[2].find('.players').append($('<b>', { class: 'me show' }));
        sceneMap[2].find('b.me').text(`${State.me.name}`);
    }

    static getScene() {
        return activeScene;
    }
}

export function wait(millis) {
    return new Promise(resolve => {
        const start = performance.now();

        function tick(timestamp) {
            const elapsed = timestamp - start;
            if (elapsed >= millis) resolve();
            else requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    });
}

async function hideScene() {
    const outS = sceneMap[activeScene];
    outS.removeClass('in-stage');
    outS.addClass('out-stage');
    await wait(520);
    outS.css('display', 'none');
    await wait(50);
}

async function showScene(sceneNo) {
    activeScene = sceneNo;
    const inS = sceneMap[activeScene];
    inS.css('display', 'flex');
    await wait(20);
    inS.addClass('in-stage');
    inS.removeClass('out-stage');
    await wait(520);
}
