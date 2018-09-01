/**
 * Updates storage according to previous add-on version.
 *
 * @since 0.1.2
 */
"use strict";

getOptions().then((options) => {
    let
        actual = (browser.runtime.getManifest()).version,
        stored =
            "undefined" !== typeof(options.storage.version)
                ? options.storage.version
                : "0.1.0";

    if (actual < stored) {
        throw new Error("Code version downgrading detected!");
    } else if (actual === stored) {
        return;
    }
    switch (stored) {
        case "0.1.1":
            options.storage.alertSoundData = options.defaults.alertSoundData;
            options.storage.optionsLastTab = options.defaults.optionsLastTab;
            options.storage.environment = options.defaults.environment;
            options.storage.sendTestNotification = false;
    }
    options.storage.version = actual;
    browser.storage.local.set(options.storage);
    console.warn(`Storage updated from ${stored} to ${actual} version`);
}).catch((e) => { console.error(e); });
