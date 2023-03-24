import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { initTable } from "./table.js";
// import { State } from "./state.js";
import { Utils } from "./utils.js";
import { State } from "./state.js";

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
    UI.showToast("Logged out successfully");
    localStorage.removeItem('User-Session');
    await UI.loadAuth();
    UI.setLoader(false);
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
    const target = $(e.currentTarget),
        gcode = target.attr('data-gcode'),
        gname = target.attr('data-gname'),

        pmap = { // [To-Do] Take players count as input from user for each game
            'rmcs': 4,
            'bgo': 2,
            'ttt': 2,
            'uno': 6
        };
    
    UI.setLoader(true);
    await wait(500);
    UI.initLobby(gname);
    State.activeGCode = gcode;
    
    Master.send("Search", {
        plrCount: pmap[gcode],
        gameId: gcode
    });
});

$('#lobby button').click(async e => {
    e.preventDefault();
    UI.setLoader(true);
    await wait(500);
    Master.send("Cancel-Search");
});
