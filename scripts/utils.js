import { State } from "./state.js";

const navHistory = ['null'];
let mdlAccept = 'text';
let modalResetTok = 0;
let navPos = 0;
let navDir = 1;

export class Utils {
    static setModalOpt(type = 'q', accept = 'text', rtok = 0) {
        if (rtok !== modalResetTok) return;
        const mdlBtnF = $('.modal-bx button.f');
        const mdlImg = $('.modal-bx img');
        mdlBtnF.css('display', 'none');
        let rt = '/media/alert/';
        mdlAccept = accept;
        modalResetTok = 0;

        switch (type) {
            case 'q':
                mdlImg.attr('src', `${rt}query.png`);
                mdlBtnF.css('display', 'unset');
                break;
            
            case 'i': mdlImg.attr('src', `${rt}info.png`); break;
            case 'v': mdlImg.attr('src', `${rt}victory.png`); break;
            case 'd': mdlImg.attr('src', `${rt}defeat.png`); break;
        }
    }

    static showGetModal(ttl, msg, okBtn = 'Accept', nokBtn = 'Deny') {
        const box = $('#sandwich > .modal-bx');

        function handleModalClicks(resolve, reject) {
            let prevented = false;
            const resObj = {
                accepted: false,
                data: {}
            };
            
            const ival = setInterval(() => {
                if (!box.hasClass('show')) {
                    clearInterval(ival);
                    prevented = true;
                    resetModal();
                    reject();
                }
            }, 2000);

            const resolver = (accepted) => {
                if (prevented) { return; }
                resObj.accepted = accepted;
                box.removeClass('show');
                clearInterval(ival);
                resolve(resObj);
                resetModal();
            }

            box.find('button.t').one('click', () => resolver(true));
            box.find('button.f').one('click', () => resolver(false));
        }

        const prModal = new Promise(handleModalClicks);
        box.find('button.f').text(nokBtn);
        box.find('button.t').text(okBtn);
        if (mdlAccept === 'text') 
            box.find('p').text(msg);
        else box.find('p').html(msg);
        box.find('h1').text(ttl);
        box.addClass('show');
        return prModal;
    }

    static getNth(num) {
        return ["st", "nd", "rd"]
            [(((num < 0 ? -num : num) + 90)
                % 100 - 10) % 10 - 1] || "th"
    }

    // #region Custom History API implementation

    static pushState(state, data = null) {
        if (state == State.navState) return;
        navHistory.splice(navPos++, 0, state);
        let newDir = ++navDir;

        history.pushState({
            identifier: state,
            dir: newDir,
            extras: data
        }, null, `${state}${State.urlSearch}`);

        State.navState = state;
    }

    static replaceState(state, data = null) {
        if (state == State.navState) return;
        let newDir = navDir;

        history.replaceState({
            identifier: state,
            extras: data,
            dir: newDir
        }, null, `${state}${State.urlSearch}`);

        navHistory[navPos] = state;
        State.navState = state;
    }

    static nullifyNav(replaceState) {
        for (let i = 0; i < navHistory.length; i++) {
            navHistory[i] = replaceState;
        }
    }

    // #region Non-Operational
    // ! functions depreciated as we're now using Path instead of Hash for navigation)

    static go(nvId, nvState) { // (Non-Operational)
        if (!nvId) return;
        State.navState = nvState;
    }
    
    static getNextNavIndex(curState, curDir) { // (Non-Operational) Finds next navigable item im custom history stack
        let fwd = navDir <= curDir;
        navDir = curDir;
        let idx = 0;

        if (fwd) {
            for (let i = curDir; i < navHistory.length; i++) {
                const navState = navHistory[i];
                if (navState === curState) {
                    idx++;
                }
            }

            idx *= 1;
        }
        else {
            for (let i = curDir; i > -1; i--) {
                const navState = navHistory[i];
                if (navState === curState) {
                    idx++;
                }
            }

            idx *= -1;
        }

        return { fwd, idx };
    }

    // #endregion
    // #endregion
}

function resetModal() {
    modalResetTok = parseInt(Math.random() * 10000);
    setTimeout((tok) => Utils.setModalOpt('q', 'text', tok), 320, (modalResetTok));
}
