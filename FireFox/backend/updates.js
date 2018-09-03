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
            options.storage.environment = options.defaults.environment;

            options.storage.optionsLastTab = options.defaults.optionsLastTab;
            options.storage.alertSoundData = options.defaults.alertSoundData;

            options.storage.filter = options.defaults.filter;

            delete options.storage.sendTestNotification;
            break; // case "0.1.1"

        case "0.1.2":
            options.storage.sound = options.defaults.sound;
            if ("" !== options.storage.alertSoundData) {
                options.storage.sound.data.task = options.storage.alertSoundData;
            }
            delete options.storage.alertSoundData;

            break; // case "0.1.2"
    }
    options.storage.version = actual;
    browser.storage.local.set(options.storage).then(() => {
        init();
    });
    console.warn(`Storage updated from ${stored} to ${actual} version`);
}).catch((e) => { console.error(e); });
