import { Master } from "./master.js";
import { Animator } from "./anim.js"

$(document).ready(() => {
    $('body').toggleClass('loading');
    Master.connect();
});

// Animator class Testings
window.show = (data) => {
    switch (data) {
        case 0:
            Animator.loadAuth();
            break;
        case 1:
            Animator.loadDashboard();
            break;
    }
}
