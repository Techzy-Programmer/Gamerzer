import { Player } from "./player.js";
import { Utils } from "./utils.js";
import { UI, wait } from "./ui.js";
import { State } from "./state.js";
import { Game } from "./game.js";

export async function setUpTesting(param) {
    switch (param) {
        case 'auth': break;
        case 'dash': await UI.loadDashboard(); break;

        case 'modal':
            Utils.setModalOpt('i');
            await Utils.showGetModal("Information", "This is a piece of custom information", "Cool");
            await Utils.showGetModal("Sample query asked?", `This is a sample description text for the Query or Statement`, 'Okay', 'Good');
            break;

        case 'rmcs':
            await wait(200);
            State.activeGCode = 'rmcs';

            for (let i = 0; i < 3; i++) State.players[`p-${i}`] =
                new Player(`p-${i}`, `Player ${i}`, "playing");
            
            const testMSG = {
                data: { plrIds: [ 'p-0', 'p-1', 'p-2' ] },
                msg: 'Goto-Game'
            };

            await Game.processMSG(testMSG);
            $('#rmcs .chit').click(function() {
                $(this).eq(0).toggleClass('active');
            });
            break;
    }

    UI.setLoader(false);
}
