import { State } from "./state.js";
import { UI } from "./ui.js";

export class Utils {
    static async loadModule(modName) { // Conditional importing modules to save load time and users bandwidth
        let mod = null;

        try {
            mod = await import(modName);
        }
        catch {
            UI.setLoader(false);
        }

        return mod;
    }
}