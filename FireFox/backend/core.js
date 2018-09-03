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
                browser.storage.local.set(response['storage']);
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
            console.warn("There is no tabs to send message");
            return;
        }
        let tab = tabs.shift();

        browser.tabs.sendMessage(
            tab.id,
            {
                "target": "watchdog",
                "command": "getData"
            }
        ).then((response) => {
            // console.log("Data response", response);///
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
                // console.warn(`${response.unreadMessagesCount} unread messages`);
                notification.push(browser.i18n.getMessage(
                    'unreadMessages', response.unreadMessagesCount
                ));
            }
            _state.unreadMessagesCount = response.unreadMessagesCount;

            // Update requester list for filter {
            let
                saveOptions = false,
                list = _options.storage.filter.requesters.list;
            for (let poolId in response.pools) {
                let
                    requester = response.pools[poolId].requester,
                    id = requester.id;
                if ("undefined" === typeof(list[id])) {
                    list[id] = requester;
                    saveOptions = true;
                }
            }
            if (saveOptions) {
                browser.storage.local.set(_options.storage).then(() => {
                    browser.runtime.sendMessage({
                        'target': "options",
                        'command': "refreshRequesters"
                    }).catch((e) => {
                        console.error(e);
                    });
                }).catch((e) => {
                    console.error(e);
                });
            }
            // } Update requester list for filter
            if (
                "undefined" !== typeof(_state.pools) &&
                JSON.stringify(response.pools) !== JSON.stringify(_state.pools)
            ) {
                let difference = JSON.parse(JSON.stringify(response.pools));

                // Filter pools from previous request
                for (let poolId in _state.pools) {
                    delete difference[poolId];
                }

                // Filter pools according to rules
                let filter = _options.storage.filter;
                for (let poolId in response.pools) {
                    let pool = response.pools[poolId];
                    if (
                        !filter.tasks.includesTraining && pool.training ||
                        !filter.tasks.pendingAcceptance && pool.postAccept ||
                        !filter.tasks.adultContent && pool.mayContainAdultContent ||
                        !filter.tasks.notAvailable && !pool.available ||
                        !filter.requesters.all &&
                            "undefined" == typeof(
                                filter.requesters.list[pool.requester.id].checked
                        )
                    ) {
                        delete difference[poolId];
                    }
                }

                if ("{}" !== JSON.stringify(difference)) {
                    // console.warn("New pools", difference);
                    let newPools = [];

                    for (let poolId in difference) {
                        let
                            pool = difference[poolId],
                            requester = Toloka.Requester.getName(pool.requester),
                            tail = [`${pool.reward}$`];
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
                        newPools.push(`${requester}: ${pool.title} (${tail})`);
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
        // console.log(`Update period set to ${options.storage.updatePeriod} seconds.`);
        if ("undefined" !== typeof(request)) {
            requestTasks();

            return Promise.resolve({});
        }
    });
}

init();

console.warn("Core loaded."); ///
