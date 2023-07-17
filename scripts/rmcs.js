import { Game } from "./game.js";
import { State } from "./state.js";
import { Player } from "./player.js";
import { UI, wait } from "./ui.js";

const rootEl = $('#rmcs');

export class RMCS extends Game {
    name = "Raja Mantri Chor Sipahi";
    players = [new Player()];
    chitChosen = false;
    isMsgAnim = false;
    exitIVal = false;
    myPersona = '-';
    rounds = 1;

    constructor(playerLst) {
        super();
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
            this.uiTimers[plrId] = { startTmr: timer[0], resetTmr: timer[1], correctTmr: timer[2] };
        };

        this.initialize();
    }

    handleClicks(jqEl, type) {
        switch (type) {
            case 'chit':
                if (jqEl.attr('data-clickable') == 'true') {
                    if (this.chitChosen) jqEl.toggleClass('active');
                    else Game.send('Chit-Id', { chitId: Number.parseInt(jqEl.attr('data-id')) });
                }
                break;

            case 'selection':
                if (jqEl.hasClass('active') && this.myPersona == 's') {
                    const plrId = jqEl.parent().parent().attr('id');
                    $('#rmcs .plrs .plr .tool > a').removeClass('active');
                    Game.send('Selection', { selPlrId: Number.parseInt(plrId.replace('rmcs-', '')) });
                }
                break;

            case 'emoji':
                {
                    const plrId = jqEl.parent().parent().attr('id');
                    Game.send('Emoji', {
                        targetEmj: Number.parseInt(jqEl.attr('data-eid')),
                        targetPlr: Number.parseInt(plrId.replace('rmcs-', ''))
                    });
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

    changeStatus(type, defStatus = 'N/A') {
        switch (type) {
            case 'rounds': this.uiElems.statusB.text(`Starting round ${this.rounds}...`); break;
            case 'chits': this.uiElems.statusB.text(`Waiting for chits to be picked...`); break;
            case 'suspense': this.uiElems.statusB.text(`Suspense Time, Kon hai Chor?`); break;
            case 'shuffle': this.uiElems.statusB.text('Shuffling & randomizing chits...'); break;
            default: this.uiElems.statusB.text(defStatus); break;
        }
    }

    async setupRounds() {
        const chits = rootEl.find('.chit-box > .chit');
        chits.find('.back .label').addClass('hide');
        chits.find('.front > b').text('Shuffling');
        chits.attr('data-clickable', 'false');
        chits.removeClass('active me');
        this.chitChosen = false;
        this.myPersona = '-';
    }

    async handleServerResp(msg, data) {
        switch (msg) {
            case 'Pick-Chit':
                this.changeStatus('chits');
                this.uiElems.chitTopB.text('Tap to Reveal');
                $('#rmcs .chit-box > .chit').attr('data-clickable', 'true');
                break;
        
            case 'Persona': setupChit(data.cId, data.uId, data.psna, this); break;
            
            case 'New-Round':
                setTimeout(() => Game.send("Ready"), 1200);
                this.changeStatus('shuffle');
                this.exitIVal = true;
                this.setupRounds();
                break;

            case 'Start-Round':
                if (this.myPersona == 's') data.victims.forEach((pId) => // Enable player selection
                    rootEl.find(`.plr#rmcs-${pId} .tool > a`).addClass('active'));
                this.uiTimers[data.sId].startTmr(); // Start timer of sipahi
                this.changeStatus('suspense');
                break;

            case 'Round-Ends':
                this.exitIVal = false;
                this.rounds = data.round;
                this.uiTimers[data.sId].resetTmr();
                let roundTmr = data.roundDelaySec - 1;
                rootEl.find(`.plrs .plr .score`).removeClass('ld');
                rootEl.find('.plrs .plr .tool > a').removeClass('active');
                rootEl.find(`.plrs .plr#rmcs-${data.leadPlr} .score`).addClass('ld');
                data.plrScores.forEach(scrObj => rootEl.find(`.plrs .plr#rmcs-${scrObj.uId} .score .pts`).text(`${scrObj.uPts} Pts`));
                
                data.maskedPlrs.forEach(
                    mskdObj => (mskdObj.uPsna !== this.myPersona) &&
                    populateChit(rootEl.find(`.chit-box .chit#rmcs-chit-${mskdObj.uId}`), mskdObj.uPsna)
                );

                if (this.myPersona === 's') { // Show choice popup only if current player is sipahi
                    let resTxt = "Well Done! You guess it right";
                    let resDiv = $('#sandwich > .alert-bx');
                    resDiv.removeClass('w');
                    resDiv.find('img').attr('src',
                        '/media/alert/correct.png');

                    if (!data.sipahiWon) {
                        resDiv.addClass('w');
                        resTxt = "Oh! That's a wrong guess";
                        resDiv.find('img').attr('src', '/media/alert/wrong.png');
                    }

                    if (data.tmrLoss) resTxt = "Oops! You ran out of time";
                    setTimeout(() => resDiv.removeClass('active'), 4000);
                    resDiv.find('b').text(resTxt);
                    resDiv.addClass('active');
                }

                const tIRE = setInterval(() => {
                    if (roundTmr <= 0 || this.exitIVal) {
                        clearInterval(tIRE);
                        return;
                    }

                    this.changeStatus('-', `Round ${this.rounds} starting in ${--roundTmr} s...`);
                }, 1000);
                break;

            case 'Emoji':
                if (!this.isMsgAnim) {
                    this.isMsgAnim = true;
                    const plrId = data.targetPlr;
                    const emjId = data.targetEmj;
                    const animable = rootEl.find(`.plr#rmcs-${plrId} > .emoji.msg`);
                    animable.attr('data-eid', `${emjId}`);
                    animable.removeClass('hide');
                    animable.addClass('anim');
                    console.log(animable);

                    const animEndF = () => {
                        animable.removeAttr('data-eid');
                        animable.removeClass('anim');
                        animable.addClass('hide');
                        this.isMsgAnim = false;
                    };

                    animable.one('animationend', animEndF);
                }
                break;

            default: break;
        }
    }

    dispose() {
        // Remove event listeners
        $('#rmcs .chit').off('click');
        rootEl.find('.emojis > .emoji').off('click');
        $('#rmcs .plrs .plr .tool > a').off('click');

        // Reset UI timers
        Object.values(this.uiTimers)
            .forEach(t => t.resetTmr());
    
        // Nullify references to DOM elements
        this.chitChosen = false;
        this.isMsgAnim = false;
        this.exitIVal = false;
        this.myPersona = '-';
        this.uiTimers = {};
        this.uiElems = {};
        this.rounds = 1;
    }
}

function setupChit(cId, uId, psna, gInst) {
    const isMe = uId === State.me.id;
    const chit = $(`#rmcs > .chit-box .chit[data-id="${cId}"]`);
    chit.find('.back .player').text(isMe ? "You" : State.players[uId].name);
    chit.attr('data-clickable', isMe ? 'true' : 'false');
    populateChit(chit.find('.back > div'), psna);
    chit.addClass(`active ${isMe ? 'me' : ''}`);
    chit.attr('id', `rmcs-chit-${uId}`);

    if (isMe) {
        $('#rmcs .chit:not(.me) .front > b').text('To Be Selected');
        chit.find('.back .label').removeClass('hide');
        gInst.chitChosen = true;
        gInst.myPersona = psna;
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
    rootEl.find('.emojis > .emoji').click(function() { cb($(this), 'emoji') });
    $('#rmcs .plrs .plr .tool > a').click(function() { cb($(this), 'selection') });
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

    let s;
    let toReset = false;
    const resetTimer = () => toReset = true;
    const correctTimer = curSec => s = curSec;

    function startTimer() {
        progBar.animate(0);
        toReset = false;
        s = sec;

        const animIVal = setInterval(() => {
            if (toReset || s <= 0) {
                progBar.stop();
                clearInterval(animIVal);
                progBar.animate(1, { duration: 500 });
                $(tmrTxt).text(`${sec} s`);
                return;
            }

            $(tmrTxt).text(`${--s} s`);
        }, 1000);
    }

    progBar.animate(1, { duration: 500 });
    return [startTimer, resetTimer, correctTimer];
}
