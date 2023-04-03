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

// UI Testing ---

// UI.loadDashboard();
// UI.setLoader(false);

// Remove above code when testing done.....

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

    pmap = { // [To-Do] Take players count as input from user for each game
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

    const { fwd, idx } = Utils.getNextNavIndex(idf, curState.dir); // (Can be removed)
    Utils.go(idx); // Conditional & custom navigation implementation (Can be removed)
    
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
        
        if (State.me.status == "playing") {
            Game.quit(false); // [To-Do] Here false can also be used to notify server that user quits the game abnormally
        }

        await wait(1000);
        loadMatching();
    }
    else if (idf == 'game-quit' && !fwd) {
        /*
            [To-Do]
            Ask the player if they really wants to quit the game
            If so notify game instance about quiting and take back player to dashboard
            else history.forward() ->
        */
    }
    else if (idf.startsWith('game-')) {
        UI.showToast("Unable to join the previous game!", 'e');
        // Utils.replaceState(State.navState);
    }

    /*
        [To-Do] (Game logic)
        When game starts 'game-quit' should be pushed
        followed by immediate push of 'game-play' to the history stack
        So here we can easily track back button and ask for user if they want to quit the game
    */

    State.navState = idf;
});
