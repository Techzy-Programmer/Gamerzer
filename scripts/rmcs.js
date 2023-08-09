import { Game } from "./game.js";
import { State } from "./state.js";
import { Player } from "./player.js";
import { UI, wait } from "./ui.js";
import { Utils } from "./utils.js";

let prevStatusTxt = '';
const rootEl = $('#sandwich > #rmcs');

export class RMCS extends Game {
    name = "Raja Mantri Chor Sipahi";
    players = [new Player()];
    chitChosen = false;
    isMsgAnim = false;
    exitIVal = false;
    myPersona = '-';
    sipahiId = '';
    rounds = 1;
    tIRE = 0;

    constructor(playerLst, srf = null) {
        super();
        this.uiTimers = { };
        this.players = playerLst;

        this.uiElems = {
            statusB: $('#rmcs > .status b.label'),
            chitTopB: $('#rmcs > .chit-box div.front b'),
        }

        this.setCard = (el, plrName, plrId) => {
            const profileCard = $(el);
            profileCard.attr('id', `rmcs-${plrId}`);
            profileCard.find('b.pts').text('0 pts');
            profileCard.attr('data-assigned', 'yes');
            profileCard.find('b.name').text(plrName);
            profileCard.find('.score').removeClass('ld');
            let progBarDiv = profileCard.find('.prog-bar')[0];
            let tmrTxtDiv = profileCard.find('.tool b.timer')[0];
            const timer = initProgressBar(progBarDiv, tmrTxtDiv);
            this.uiTimers[plrId] = {
                startTmr: timer[0],
                pauseTmr: timer[1],
                correctTmr: timer[2],
                resetTmr: timer[3],
            };
        };

        this.initialize(srf);
    }

    async handleClicks(jqEl, type) {
        switch (type) {
            case 'chit':
                if (jqEl.attr('data-clickable') === 'true') {
                    if (this.chitChosen) {
                        if (jqEl.hasClass('me'))
                            jqEl.toggleClass('active')
                        return;
                    }
                    
                    Game.send('Chit-Id', {
                        chitId: parseInt(jqEl.attr('data-id'))
                    });
                }
                break;

            case 'selection':
                if (jqEl.hasClass('active') && this.myPersona == 's') {
                    const plrId = jqEl.parent().parent().attr('id');
                    $('#rmcs .plrs .plr .tool > a').removeClass('active');
                    Game.send('Selection', { selPlrId: plrId.replace('rmcs-', '') });
                }
                break;

            case 'emoji':
                {
                    const plrId = jqEl.parent().parent().attr('id');
                    Game.send('Emoji', {
                        targetEmj: Number.parseInt(jqEl.attr('data-eid')),
                        targetPlr: plrId.replace('rmcs-', '')
                    });
                }
                break;

            case 'quit':
                Utils.setModalOpt(); // Reset modal to query mode
                const confRes = await Utils.showGetModal("Quit the Game?",
                    "Are you sure to Quit the ongoing game? you may lose the game and progress!", "Quit", "Cancel");
                if (confRes.accepted) Game.quit();
                break;

            default:
                break;
        }
    }

    async initialize(srf) {
        let elId = 0;
        if (srf) Game.halted = true;
        this.changeStatus('rounds');
        registerHandlers(this.handleClicks.bind(this));
        const notMe = $('#rmcs > .plrs .plr:not(.me)');
        setTimeout(() => Game.send('Ready', { srf }, true), 250);
        this.setCard($('#rmcs > .plrs .plr.me')[0], 'You', State.me.id);
        this.players.forEach(p => this.setCard(notMe[elId++], p.name, p.id));
        await wait(1500); UI.setLoader(false);
    }

    changeStatus(type, defStatus = 'N/A') {
        switch (type) {
            case 'network': this.uiElems.statusB.text('No Internet, Reconnecting...'); break;
            case 'disconnection': this.uiElems.statusB.text('Waiting for players to re-join...'); break;
            case 'rounds': this.uiElems.statusB.text(`Starting round ${this.rounds}...`); break;
            case 'chits': this.uiElems.statusB.text(`Waiting for chits to be picked...`); break;
            case 'suspense': this.uiElems.statusB.text(`Suspense Time, Kon hai Chor?`); break;
            case 'shuffle': this.uiElems.statusB.text('Shuffling & randomizing chits...'); break;
            default: this.uiElems.statusB.text(defStatus); break;
        }

        if (this.uiElems.statusB.text().endsWith("..."))
            this.uiElems.statusB.addClass('anim');
        else this.uiElems.statusB.removeClass('anim');
    }

    setupRounds() {
        const chits = rootEl.find('.chit-box > .chit');
        chits.find('.back .label').addClass('hide');
        chits.find('.front > b').text('Shuffling');
        chits.removeClass('active me');
        this.chitChosen = false;
        this.myPersona = '-';
        this.sipahiId = '';
    }

    runRoundTmr(roundTmr = 14) {
        this.tIRE = setInterval(() => {
            if (roundTmr <= 0 || this.exitIVal) {
                clearInterval(this.tIRE);
                return;
            }

            this.changeStatus('-', `Round ${this.rounds} starting in ${--roundTmr} s...`);
        }, 1000);
    }

    handleNetStatus(netAvailable) {
        this.exitIVal = !netAvailable;

        if (!netAvailable) {
            prevStatusTxt = this.uiElems.statusB.text();
            this.changeStatus('network');
            rootEl.addClass('fadeOut');
            return;
        }

        this.changeStatus('-', prevStatusTxt);
        rootEl.removeClass("fadeOut");
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
                if (this.myPersona === 's') data.victims.forEach((pId) =>
                    rootEl.find(`.plr#rmcs-${pId} .tool > a`).addClass('active')); // Enable player selection
                if (this.sipahiId) this.uiTimers[this.sipahiId].startTmr(); // Start timer of sipahi
                this.changeStatus('suspense');
                break;

            case 'Round-Ends':
                this.exitIVal = false;
                this.rounds = data.round;
                this.runRoundTmr(data.roundDelaySec - 1);
                rootEl.find(`.plrs .plr .score`).removeClass('ld');
                rootEl.find('.plrs .plr .tool > a').removeClass('active');
                if (this.sipahiId) this.uiTimers[this.sipahiId].resetTmr();
                rootEl.find(`.plrs .plr#rmcs-${data.leadPlr} .score`).addClass('ld');
                data.plrScores.forEach(scrObj => rootEl.find(`.plrs .plr#rmcs-${scrObj.uId} .score .pts`).text(`${scrObj.uPts} Pts`));
                
                data.maskedPlrs.forEach(
                    mskdObj => (mskdObj.uPsna !== this.myPersona) &&
                    populateChit(rootEl.find(`.chit-box .chit#rmcs-chit-${mskdObj.uId}`), mskdObj.uPsna)
                );

                if (this.myPersona === 's') { // Show choice popup only if current player is sipahi
                    let resTxt = "Well Done! You guessed it right";
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

                    const animEndF = () => {
                        animable.removeAttr('data-eid');
                        animable.removeClass('anim');
                        animable.addClass('hide');
                        this.isMsgAnim = false;
                    };

                    animable.one('animationend', animEndF);
                }
                break;

            case "Disconnected":
                if (!Game.halted)
                    Game.halted = true;
                rootEl.addClass("fadeOut");
                this.changeStatus('disconnection');
                let sel = `.plrs .plr[data-assigned="no"]`;
                if (this.tIRE > -1) clearInterval(this.tIRE);
                if (this.sipahiId) this.uiTimers[this.sipahiId].pauseTmr();
                let pCard = rootEl.find(`.plrs .plr#rmcs-${data.whoId}`);
                if (pCard.length === 0) pCard = rootEl.find(sel);
                pCard.addClass('disconnected');
                this.tIRE = -1;
                await wait(1500);
                UI.setLoader(false);
                break;

            case "Re-Joined": rootEl.find(`.plrs .plr#rmcs-${data.who}`).removeClass('disconnected'); break;

            case 'Render-Game':
                let asgCnt = 0;
                this.setupRounds();
                rootEl.addClass("fadeOut");
                this.rounds = data.roundsPlayed;
                const unAsgndCards = rootEl.find('.plrs .plr[data-assigned="no"]:not(.me)');

                data.scoresData.forEach(sd => {
                    const rjPlr = State.players[sd.uId];
                    const isSelf = State.me.id === sd.uId;

                    if (rjPlr && asgCnt < unAsgndCards.length && !this.players.includes(rjPlr) && !isSelf) {
                        this.setCard(unAsgndCards[asgCnt++], rjPlr.name, rjPlr.id);
                        this.players.push(rjPlr); // This is of no use still ;)
                    }

                    const scrDiv = rootEl.find(`.plrs .plr#rmcs-${sd.uId} .score`);
                    scrDiv.find('b.pts').text(`${sd.uPts} Pts`);
                    if (sd.leading) scrDiv.addClass('ld');
                });

                const chitLen = data.chitsData.length;
                if (chitLen > 0) data.chitsData.forEach(cd =>
                    setupChit(cd.cId, cd.uId, cd.uPsna, this));
                
                if (chitLen < 4 && !this.chitChosen) {
                    this.uiElems.chitTopB.text('Tap to Reveal');
                    this.changeStatus('suspense');
                }

                Game.send('Game-Rendered', {}, true);
                break;

            case 'Correct-Timer':
                if (this.sipahiId)
                    this.uiTimers[this.sipahiId]
                        .correctTmr(data.sipahiTime - 1);
                break;

            case 'Re-Start':
                if (data.roundGoing) {
                    if (data.allChosen) this.changeStatus('suspense');
                    else this.changeStatus('chits');
                }
                else {
                    this.runRoundTmr(data.roundDelaySec - 1);
                    this.chitChosen = true;
                }

                rootEl.find('.plrs .plr').removeClass('disconnected');
                UI.showToast("All players joined!");
                rootEl.removeClass("fadeOut");
                Game.halted = false;
                break;

            case 'Game-Ends':
                // ToDo: Render game result in popup box
                // ToDo: after getting conf return back to dashboard
                break;

            case "Quit":
                UI.showToast(`'${State.players[data.who].name}' ${ data.pQuit ? "refused to join" : "quits the game"}!`);
                rootEl.find(`.plrs > .plr#rmcs-${data.who}`).addClass('fadeOut');
                UI.showToast('Declaring game result now...');
                break;

            default: break;
        }
    }

    dispose() {
        // Remove event listeners
        $('#rmcs .chit').off();
        rootEl.find('.settings > .end').off();
        rootEl.find('.emojis > .emoji').off();
        $('#rmcs .plrs .plr .tool > a').off();

        // Reset UI and Designs
        rootEl.find('.plrs > .plr').removeClass('fadeOut');

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
    if (psna === 's') gInst.sipahiId = uId;
    chit.attr('id', `rmcs-chit-${uId}`);

    if (isMe) {
        $('#rmcs .chit:not(.me) .front > b').text('To Be Selected');
        chit.find('.back .label').removeClass('hide');
        chit.find('.front b').text("Tap to Reveal");
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
    rootEl.find('.settings > .end').click(function() { cb($(this), 'quit') });
    rootEl.find('.emojis > .emoji').click(function() { cb($(this), 'emoji') });
    $('#rmcs .plrs .plr .tool > a').click(function() { cb($(this), 'selection') });
}

function initProgressBar(pbDiv, tmrTxt, sec = 60) {
    // console.log(pbDiv);
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

    let s = sec;
    let animIVal = 0;
    let running = false;
    let toReset = false;
    const fixedSec = sec;
    const resetTimer = () => toReset = true;
    
    const pauseTimer = () => {
        clearInterval(animIVal);
        running = false;
        progBar.stop();
    }

    const correctTimer = curSec => {
        if (!running) {
            const delChange = curSec / sec;
            progBar.set(delChange);
            sec = curSec;
        }

        s = curSec;
    }

    function startTimer() {
        if (running) return;
        toReset = false;
        running = true;

        progBar.animate(0, {
            duration: (sec * 1000)
        });

        animIVal = setInterval(() => {
            if (toReset || s <= 0) {
                s = fixedSec;
                sec = fixedSec;
                progBar.stop();
                running = false;
                clearInterval(animIVal);
                $(tmrTxt).text(`${sec} s`);
                progBar.animate(1, { duration: 500 });
                return;
            }

            $(tmrTxt).text(`${--s} s`);
        }, 1000);
    }

    progBar.animate(1, { duration: 500 });
    return [startTimer, pauseTimer, correctTimer, resetTimer];
}
