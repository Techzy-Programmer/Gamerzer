import { UI, wait } from "./ui.js";
import { Master } from "./master.js";
import { initTable } from "./table.js";

Master.connect();
initTable();

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
