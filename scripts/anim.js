let activeScene = 0;
let sceneMap = {
    0: $('div#sandwich > #authform'),
    1: $('div#sandwich > #dash'),
    2: $('div#sandwich > #lobby')
}

export class Animator {
    static async loadAuth() {
        await hideScene();
        await showScene(0);
    }

    static async loadDashboard() {
        await hideScene();
        await showScene(1);
    }

    static async loadMatchMaker() {
        await hideScene();
        await showScene(1);
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
}

function wait(millis) {
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