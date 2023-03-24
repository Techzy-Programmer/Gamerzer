import { UI } from "./ui.js";

export class Utils {
    static async loadModule(modName) { // Conditional importing modules to save load time and users bandwidth
        let mod = null;

        try {
            mod = await import(modName);
        }
        catch {
            console.warn("Loader closed due to error at 'Utils.loadModule' function")
            UI.setLoader(false);
        }

        return mod;
    }

    static getNth(num) {
        return ["st","nd","rd"]
            [(((num < 0 ? -num : num) + 90)
                % 100 - 10) % 10 - 1] || "th"
    }
}
