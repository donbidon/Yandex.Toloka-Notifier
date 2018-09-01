/**
 * Main background process.
 */
"use strict";

let _options, _timer, _state = {};

browser.runtime.onMessage.addListener((request) => {
    if ("core" !== request.target) {
        return;
    }

    switch (request.command) {
        case "getOptions":
            return getOptions();

        case "getLocale":
            return getLocale();

        case "playAlertSound":
            playAlertSound(request.sound);
            break; // case "playAlertSound"

        case "reinit":
            return init(request);

        case "requestTasks":
            _state = {
                "unreadMessagesCount": -1,
                "pools": {}
            }
            requestTasks();
            break; // case "requestTasks"
    }
});

function getOptions() {
    return FakeFS.getJSON("/data/options.json").then((options) => {
        let response = options;
        return browser.storage.local.get(null).then((storage) => {
            if ("{}" == JSON.stringify(storage)) {
                response['storage'] = options.defaults;
                response['storage']['version'] =
                    (browser.runtime.getManifest()).version;
                browser.storage.local.set(options.defaults);
            } else {
                response['storage'] = storage;
            }

            return Promise.resolve(response);
        });
    });
}

function getLocale() {
    let response = {
        'language': browser.i18n.getUILanguage(),
        'direction': browser.i18n.getMessage('@@bidi_dir')
    };

    return Promise.resolve(response);
}

function requestTasks() {
    browser.tabs.query({"url": _options.tabUrls}).then((tabs) => {
        if (tabs.length < 1) {
            return;
        }
        let tab = tabs.shift();

        console.log(`Sending message to tab having url ${tab.url}...`);///
        browser.tabs.sendMessage(
            tab.id,
            {
                "target": "watchdog",
                "command": "getData"
            }
        ).then((response) => {
            console.log("Data response", response);///
            let
                date = new Date, time = date.toLocaleTimeString("en-GB", {
                    'hour': "2-digit",
                    'minute': "2-digit",
                    'second': "2-digit"
                }),
                title = browser.i18n.getMessage('notificationTitle', time),
                notification = [];

            if (
                "undefined" !== typeof(_state.unreadMessagesCount) &&
                response.unreadMessagesCount > _state.unreadMessagesCount
            ) {
                console.warn(`${response.unreadMessagesCount} unread messages`);
                notification.push(browser.i18n.getMessage(
                    'unreadMessages', response.unreadMessagesCount
                ));
            }
            _state.unreadMessagesCount = response.unreadMessagesCount;

            if (
                "undefined" !== typeof(_state.pools) &&
                JSON.stringify(response.pools) !== JSON.stringify(_state.pools)
            ) {
                let difference = JSON.parse(JSON.stringify(response.pools));

                for (let poolId in _state.pools) {
                    delete difference[poolId];
                }
                if ("{}" !== JSON.stringify(difference)) {
                    console.warn("New polls:", difference);

                    let newPools = [];

                    for (let poolId in difference) {
                        let pool = difference[poolId];
                        let tail = [`${pool.reward}$`];
                        if (!pool.available) {
                            tail.push(browser.i18n.getMessage('notAvailable'));
                        }
                        if (pool.postAccept) {
                            tail.push(browser.i18n.getMessage('postAccept'));
                        }
                        if (pool.training) {
                            tail.push(browser.i18n.getMessage('training'));
                        }
                        if (pool.mayContainAdultContent) {
                            tail.push(browser.i18n.getMessage('mayContainAdultContent'));
                        }
                        tail = tail.join(", ");
                        newPools.push(`${pool.requester}: ${pool.title} (${tail})`);
                    }
                    notification.push(browser.i18n.getMessage(
                        "newPools", [newPools.length, newPools.join("\n")]
                    ));
                }
            }
            _state.pools = response.pools;

            if (notification.length > 0) {
                browser.notifications.create({
                    "type": "basic",
                    "iconUrl": browser.extension.getURL(
                        (browser.runtime.getManifest()).icons[32]
                    ),
                    "title": title,
                    "message": notification.join("\n~~~\n")
                });
                playAlertSound(_options.storage.alertSoundData);
            }
        }).catch((e) => { console.error(e); });
    });
}

/**
 * Loads/reloads options, initializes timers.
 */
function init(request) {
    getOptions().then((options) => {
        _options = options;

        if ("undefined" !== typeof(_timer)) {
            clearInterval(_timer);
        }
        _timer = setInterval(requestTasks, options.storage.updatePeriod * 1000);
        console.log(`Update period set to ${options.storage.updatePeriod} seconds`);
        if ("undefined" !== typeof(request)) {
            requestTasks();
            return Promise.resolve({});
        }
    });
}

init();
