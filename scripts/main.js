import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { initTable } from "./table.js";
import { Utils } from "./utils.js";
import { State } from "./state.js";
import { Game } from "./game.js";

let targetGCard;
Utils.replaceState('auth');
Master.connect();
initTable();

// #region UI Testing ---

// (async () => {
//     UI.setLoader(false);
//     await UI.loadDashboard();
//     await wait(200);

//     // Simulating server for testing
//     State.activeGCode = 'rmcs';
//     const testMSG = {
//         msg: 'Goto-Game',
//         data: {
//             plrIds: [ 2, 5, 1 ]
//         }
//     };

//     await Game.processMSG(testMSG);
//     $('#rmcs .chit').click(function() {
//         $(this).eq(0).toggleClass('active');
//     });
// })();

// Comment above code when UI testing done.....
// #endregion

$('#signupBtn').click(async (e) => {
    e.preventDefault();
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

$('#loginBtn').click(async (e) => {
    e.preventDefault();
    let pass = $('#lpass').val(),
        email = $('#lemail').val();

    UI.setLoader(true);
    await wait(500);
    
    Master.send('Login', {
        email,
        pass
    });
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

$('#authform input.form-style').keypress(function(e) {
    if (e.which === 13) { // Enter button
        e.preventDefault();
        const nameAttr = $(this).attr('name');
        if (nameAttr == "lpass") $('#loginBtn').click();
        else if (nameAttr == "saccess") $('#signupBtn').click();
    }
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
    else if (idf == 'game-quit' && !fwd) {
        Utils.setModalOpt(); // Reset back the modal props
        const confRes = await Utils.showGetModal("Quit the Game?",
            "Are you sure to Quit the ongoing game? you may lose the game and progress!", "Quit", "Cancel");
        if (confRes.accepted) Game.quit();
        else window.history.forward();
    }
    else if (idf.startsWith('game-') && State.me.status !== 'playing') {
        UI.showToast("Unable to join the previous game!", 'e');
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
