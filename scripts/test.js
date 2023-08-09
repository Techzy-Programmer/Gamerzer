import { Player } from "./player.js";
import { Utils } from "./utils.js";
import { UI, wait } from "./ui.js";
import { State } from "./state.js";
import { Game } from "./game.js";

export async function setUpTesting() {
    // Simulating server for testing
    State.activeGCode = 'rmcs';
    await UI.loadDashboard();
    UI.setLoader(false);
    await wait(200);

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

    Utils.showGetModal("Sample query asked?", // Simple query dialog box
        `This is a sample description text for the Query or Statement`, 'Okay', 'Good');
}
