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

/*
function getData() {
    return new Promise((resolve, reject) => {
        console.log("Requesting information...");
        let notifications = {};

        if (_options.storage.sendTestNotification) {
            notifications.test = true;
        }

        FakeFS.getJSON(_options.xhr.messages).then((response) => {
            if (
                "undefined" !== typeof(_state.unreadMessagesCount) &&
                response.unread > _state.unreadMessagesCount
            ) {
                console.warn(`${response.unread} unread messages`);
                notifications.unreadMessages = response.unread;
            }
            _state.unreadMessagesCount = response.unread;

            FakeFS.getJSON(_options.xhr.pools).then((response) => {
                let pools = {};

                for (let pool of response) {
                    let
                        requesterName = pool.lightweightTec.requesterInfo.name,
                        uiLocale = browser.i18n.getUILanguage().toUpperCase(),
                        defaultLocale = (browser.runtime.getManifest()).default_locale.toUpperCase(),
                        requester = "undefined" !== typeof(requesterName[uiLocale])
                            ? requesterName[uiLocale]
                            : requesterName[defaultLocale];

                    pools[pool.lightweightTec.poolId] = {
                        'requester': requester,
                        'title': pool.lightweightTec.title,
                        'reward': pool.lightweightTec.assignmentConfig.reward,
                        'available': pool.availability.available,
                        'postAccept': pool.acceptanceDetails.postAccept,
                        'training': pool.lightweightTec.trainingConfig.training,
                        'mayContainAdultContent': pool.lightweightTec.mayContainAdultContent
                    };
                }
                // console.log("POOLS:", pools);///
                if (
                    // 1 || ( ///
                    "undefined" !== typeof(_state.pools) &&
                    JSON.stringify(pools) !== JSON.stringify(_state.pools)
                // )
                ) {
                    // console.log("PREVIOUS POOLS:", _state.pools);///
                    let difference = JSON.parse(JSON.stringify(pools));
                    // _state.pools = pools; let skip = true;///
                    for (let poolId in _state.pools) {
                        // if (skip) { skip = false; continue; }///
                        delete difference[poolId];
                    }
                    if ("{}" !== JSON.stringify(difference)) {
                        console.warn("New polls:", difference);
                        notifications.newPools = difference;
                    }
                }
                _state.pools = pools;
            }).catch((e) => {
                console.error(e);
            }).finally(() => {
                let resp = {
                    "data": notifications
                };
                console.log("Sending data response...", resp);///
                if ("{}" !== JSON.stringify(notifications)) {
                    // console.log("Sending notifications:", notifications);
                    resolve(resp);
                }
                resolve(resp);///
            });
        }).catch((e) => {
            console.error(e);
        });
    });
}

 */
