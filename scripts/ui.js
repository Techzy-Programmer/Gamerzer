import { State } from "./state.js";

let activeScene = 0;
let sceneMap = {
    0: $('div#sandwich > #authform'),
    1: $('div#sandwich > #dash'),
    2: $('div#sandwich > #lobby')
}

export class UI {
    static async loadAuth() {
        await hideScene();
        await showScene(0);
    }

    static async loadDashboard() {
        await hideScene();
        await showScene(1);
    }

    static async loadLobby() {
        const schTxt = sceneMap[2].find('.text');
        const typeTxt = "Searching For Players";
        let tmpTxt = "";
        schTxt.text("");

        await hideScene();
        await showScene(2);
        this.setLoader(false);
        await wait(400);

        for (let i = 0; i < typeTxt.length; i++) {
            const typeChar = typeTxt[i];
            tmpTxt += typeChar;
            schTxt.text(tmpTxt);
            await wait(40);
        }

        if (typeof State.cBack.lobby == 'function') {
            await wait(500);
            State.cBack.lobby();
        }
    }

    static async loadGame(game) {
        switch (game) {
            case 'bingo':

                activeScene = 3;
                break;

            default:
                break;
        }
    }

    static async populateLobby(ids) {
        let i = 0;
        ids.forEach(async id => {
            const newUserEl = $('<b/>', { 'class': id });
            newUserEl.text(State.players[id].name);
            $('#lobby .players').append(newUserEl);
            await wait((i++) * 300);
            await wait(20);
            newUserEl.addClass('show');
        });
    }

    static setLoader(toShow) {
        if (!toShow) $('body').removeClass('loading');
        else $('body').addClass('loading');
    }

    static showToast(msg, type = 'i', dur = 4) {
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

        Toastify({
            text: msg,
            close: true,
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
        }).showToast();
    }

    static initLobby(gname) {
        sceneMap[2].find('i.gname').text(gname);
        sceneMap[2].find('.players').empty();
        sceneMap[2].find('.players').append($('<b>', { class: 'me show' }));
        sceneMap[2].find('b.me').text(`${State.me.name}`);
    }
}

export function wait(millis) {
    return new Promise(resolve =>
        setTimeout(resolve, millis));
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