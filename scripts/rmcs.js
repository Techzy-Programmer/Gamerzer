import { Game } from "./game.js";
import { State } from "./state.js";
import { Player } from "./player.js";
import { UI, wait } from "./ui.js";

const rootEl = $('#rmcs');

export class RMCS extends Game {
    name = "Raja Mantri Chor Sipahi";
    players = [new Player()];
    chitChosen = false;
    myPersona = '-';
    rounds = 0;

    constructor(playerLst) {
        super();
        this.rounds++;
        this.uiTimers = { };
        this.players = playerLst;

        this.uiElems = {
            statusB: $('#rmcs > .status b.label'),
            chitTopB: $('#rmcs > .chit-box div.front b'),
        }

        this.setCard = (el, plrName, plrId) => {
            $(el).attr('id', `rmcs-${plrId}`);
            $(el).find('b.pts').text('0 pts');
            $(el).find('b.name').text(plrName);
            $(el).find('.score').removeClass('ld');
            let progBarDiv = $(el).find('.prog-bar')[0];
            let tmrTxtDiv = $(el).find('.tool b.timer')[0];
            const timer = initProgressBar(progBarDiv, tmrTxtDiv);
            this.uiTimers[plrId] = { startTmr: timer[0], toggleTmr: timer[1], correctTmr: timer[2] };
        };

        this.initialize();
    }

    handleClicks(jqEl, type) {
        switch (type) {
            case 'chit':
                if (jqEl.attr('data-clickable') == 'true') {
                    if (this.chitChosen) jqEl.toggleClass('active');
                    else {
                        $('#rmcs > .chit-box .chit').attr('data-clickable', 'false');
                        Game.send('Chit-Id', { chitId: Number.parseInt(jqEl.attr('data-id')) });
                    }
                }
                break;
        
            default:
                break;
        }
    }

    async initialize() {
        let elId = 0;
        UI.setLoader(false);
        await wait(500);
        this.changeStatus('rounds');
        registerHandlers(this.handleClicks.bind(this));
        const notMe = $('#rmcs > .plrs .plr:not(.me)');
        this.setCard($('#rmcs > .plrs .plr.me')[0], 'You', State.me.id);
        this.players.forEach(p => this.setCard(notMe[elId++], p.name, p.id));
        Game.send('Ready');
    }

    changeStatus(type) {
        switch (type) {
            case 'rounds': this.uiElems.statusB.text(`Starting round ${this.rounds}...`); break;
            case 'chits': this.uiElems.statusB.text(`Waiting for chits to be picked...`); break;
            case 'suspense': if (this.myPersona !== 'c') this.uiElems.statusB.text(`Suspense Time, Kon hai Chor?`); break;
            default: break;
        }
    }

    async handleServerResp(msg, data) {
        switch (msg) {
            case 'Pick-Chit':
                this.changeStatus('chits');
                this.uiElems.chitTopB.text('Tap to Reveal');
                $('#rmcs .chit-box > .chit').attr('data-clickable', 'true');
                break;
        
            case 'Persona':
                const myChit = $(`#rmcs > .chit-box .chit[data-id="${data.cId}"]`);
                myChit.find('.back .label').removeClass('hide');
                myChit.find('.back .player').text("You");
                const pDiv = myChit.find('.back > div');
                myChit.attr('data-clickable', 'true');
                this.myPersona = data.myPersona;
                populateChit(pDiv, this.myPersona);
                myChit.addClass('me active');
                this.chitChosen = true;
                break;

            case 'Others-Persona':
                const otChit = $(`#rmcs > .chit-box .chit[data-id="${data.cId}"]`);
                otChit.find('.back .player').text(State.players[data.uId].name);
                populateChit(otChit.find('.back > div'), data.othersPersona);
                otChit.find('.back .label').addClass('hide');
                otChit.attr('data-clickable', 'false');
                otChit.addClass('active');
                break;

            case 'New-Round':
                break

            case 'Start-Round':
                if (this.myPersona == 's') data.victims.forEach((pId) => // Enable player selection
                    rootEl.find(`.plr#rmcs-${pId} .tool > a`).addClass('active'));
                this.uiTimers[data.sId].startTmr(); // Start timer of sipahi
                this.changeStatus('suspense');
                break;

            default: break;
        }
    }

    quit(loadDash = true) {
        // 
    }
}

function populateChit(jqChitDiv, p) {
    let charTxt = 'Hidden', imgUrl = `no-one.png`;

    switch (p) {
        case 'r':
            imgUrl = `raja.png`;
            charTxt = 'Raja';
            break;

        case 'm':
            imgUrl = `mantri.png`;
            charTxt = 'Mantri';
            break;

        case 'c':
            imgUrl = `chor.png`;
            charTxt = 'Chor';
            break;

        case 's':
            imgUrl = `sipahi.png`;
            charTxt = 'Sipahi';
            break;
    }

    jqChitDiv.find('img').attr('src', '/media/rmcs/' + imgUrl);
    jqChitDiv.find('b.rmcs').text(charTxt);
}

function registerHandlers(cb) {
    $('#rmcs .chit').click(function() { cb($(this), 'chit') });
}

function initProgressBar(pbDiv, tmrTxt, sec = 60) {
    let progBar = new ProgressBar.Line(pbDiv, {
        from: { color: '#ff6fca' },
        to: { color: '#7cfc00' },
        duration: (sec * 1000),
        trailColor: '#c8cbcb',
        color: '#7cfc00',
        strokeWidth: 4,
        trailWidth: 1,
        
        svgStyle: {
            width: '100%',
            height: '100%'
        },

        step: (st, curBar) => {
            const svPath = curBar.path;
            $(tmrTxt).css('color', st.color);
            svPath.setAttribute('stroke', st.color);
        }
    });

    let paused = false;
    let s;

    function toggleTimer() { 
        paused = !paused;
    }

    function correctTimer(curSec) {
        s = curSec;
    }

    function startTimer() {
        progBar.animate(0);
        s = sec;

        const animIVal = setInterval(() => {
            if (paused) return;

            if (s <= 0) {
                clearInterval(animIVal);
                progBar.animate(1, { duration: 500 });
                $(tmrTxt).text(`${sec} s`);
                return;
            }

            $(tmrTxt).text(`${--s} s`);
        }, 1000);
    }

    progBar.animate(1, { duration: 500 });
    return [startTimer, toggleTimer, correctTimer];
}
