import { State } from "./state.js";
import { UI } from "./ui.js";

const navHistory = ['null'];
let navPos = 0;
let navDir = 1;

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

    // #region Custom History API implementation

    static pushState(state, data = null) {
        if (state == State.navState) return;
        navHistory.splice(navPos++, 0, state);
        let newDir = ++navDir;

        history.pushState({
            identifier: state,
            dir: newDir,
            extras: data
        }, null, `${state}`);

        State.navState = state;
    }

    static replaceState(state, data = null) {
        if (state == State.navState) return;
        let newDir = navDir;

        history.replaceState({
            identifier: state,
            extras: data,
            dir: newDir
        }, null, `${state}`);

        navHistory[navPos] = state;
        State.navState = state;
    }

    static go(nvId, nvState) { // (Non-Operational)
        if (!nvId) return;
        State.navState = nvState;
    }

    static nullifyNav(replaceState) {
        for (let i = 0; i < navHistory.length; i++) {
            navHistory[i] = replaceState;
        }
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
}
