import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { initTable } from "./table.js";
import { Utils } from "./utils.js";
import { State } from "./state.js";
import { Game } from "./game.js";

const rq = JSON.parse(localStorage.getItem("Retry-Queue") ?? "{}");
const isTestMode = location.protocol === 'http:'
    && location.search.startsWith('?test');
const signupBtn = $('#authform #signupBtn');
const loginBtn = $('#authform #loginBtn');
State.urlSearch = location.search;
Utils.replaceState('auth');
Master.retryQueue = rq;
Master.connect();
let targetGCard;
initTable();

if (isTestMode) {
    console.log("UI Testing Enabled");
    const { setUpTesting } = await import('./test.js');
    setUpTesting(); // Setup test & do UI testing
}

signupBtn.on("click", async function(e) {
    e.preventDefault();
    if ($(this).attr('disabled')) return;
    $(this).attr('disabled', 'true');

    let name = $('#sname').val(),
        pass = $('#spass').val(),
        email = $('#semail').val(),
        access = $('#saccess').val();
    
    UI.setLoader(true);
    await wait(500);
    
    Master.send('Register', {
        access,
        email,
        pass,
        name
    });
});

loginBtn.on("click", async function(e) {
    e.preventDefault();
    if ($(this).attr('disabled')) return;
    $(this).attr('disabled', 'true');

    let pass = $('#lpass').val(),
        email = $('#lemail').val();

    UI.setLoader(true);
    await wait(500);
    
    Master.send('Login', {
        queue: Master.retryQueue,
        email,
        pass
    });
});

$('#authform input.input-tb, #authform .btn').keypress(function(e) {
    if (e.which === 13) { // Enter(Return) button
        e.preventDefault();
        const nameAttr = $(this).attr('name');
        if (nameAttr == "lpass") loginBtn.click();
        else if (nameAttr == "saccess") signupBtn.click();
    }
});

$('#authform .btn').keypress(function(e) {
    if (e.which === 13) { // Enter(Return) button
        e.preventDefault();
        $(this).click();
    }
});

$('#authform h6 > span').click(function() {
    const cbaf = $('#authform input[type="checkbox"]')[0];
    cbaf.checked = !this.classList.contains('l');
});

$('#dash .top-bar .logout').click(async (e) => {
    e.preventDefault();
    UI.setLoader(true);
    Master.send('Logout');
    await wait(500);
    Utils.nullifyNav('auth');
    UI.showToast("Logged out successfully", 'i', 3);
    localStorage.removeItem('User-Session');
    await wait(2000);
    UI.showToast("Reloading the app....");
    await UI.loadAuth();
    await wait(1000);
    location.reload();
});

$('#dash .games > .gcard').click(async e => {
    targetGCard = $(e.currentTarget);
    loadMatching();
});

async function loadMatching() {
    if (!targetGCard) return;
    let gcode = targetGCard.attr('data-gcode'),
        gname = targetGCard.attr('data-gname'),

    pmap = { // ToDo: Take players count as input from user for each game
        'rmcs': 4,
        'bgo': 2,
        'ttt': 2,
        'uno': 6
    };
    
    UI.initLobby(gname);
    UI.setLoader(true);
    await wait(500);
    State.activeGCode = gcode;
    
    Master.send("Search", {
        plrCount: pmap[gcode],
        gameId: gcode
    });
}

$('#lobby button').click(async e => {
    e.preventDefault();
    UI.setLoader(true);
    await wait(500);
    Master.send("Cancel-Search");
});

window.addEventListener('popstate', async (ev) => {
    const curState = ev.state;
    if (!curState) return;
    let idf = curState.identifier;
    const { fwd, idx } = Utils.getNextNavIndex(idf, curState.dir);
    Utils.go(idx); // Conditional & custom navigation implementation
    
    if (!State.loggedIn) {
        UI.setLoader(true);
        Utils.replaceState('auth');
        UI.showToast("Please login to continue!", 'w');
        await UI.loadAuth();
        UI.setLoader(false);
        return;
    }

    if (idf == 'dashboard') {
        UI.setLoader(true);
        await wait(500);
        
        if (State.me.status == "searching") {
            Master.send("Cancel-Search");
        }
        else {
            await UI.loadDashboard();
            UI.setLoader(false);
        }
    }
    else if (idf == 'lobby') {
        UI.setLoader(true);
        await wait(500);
        
        if (State.me.status === "playing") {
            Game.quit(false);
            return;
        }

        await wait(1000);
        loadMatching();
    }
    else if (idf == 'game-quit' && !fwd && State.me.status === 'playing') {
        Utils.setModalOpt(); // Reset back the modal props
        const confRes = await Utils.showGetModal("Quit the Game?",
            "Are you sure to Quit the ongoing game? you may lose the game and progress!", "Quit", "Cancel");
        if (confRes.accepted) Game.quit();
        else window.history.forward();
    }
    
    if (idf.startsWith('game-') && State.me.status !== 'playing' && !fwd) {
        UI.showToast("Unable to join the previous game!", 'e');
        window.history.forward();
        // Utils.replaceState(State.navState);
    }

    State.navState = idf;
});

(() => {
    const mdlBox = $('#sandwich > .modal-bx');
    const focusables = mdlBox.find('a, input, textarea, button, select');
    const firstFocusable = focusables[0], lastFocusable = focusables[focusables.length - 1];
    
    mdlBox.on('keydown', (e) => {
        if (e.key !== 'Tab' || e.keyCode !== 9) return;

        if (e.shiftKey && document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
        }
        else if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
        }
    });
})();
