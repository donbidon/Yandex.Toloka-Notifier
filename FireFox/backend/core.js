/**
 * Main background process.
 */
"use strict";

let _options, _timer, _state = {};

browser.runtime.onMessage.addListener((request) => {
    if ("core" !== request.target) {
        return;
    }
    // console.log(request.command);///

    switch (request.command) {
        case "getOptions":
            return getOptions();

        case "getLocale":
            return getLocale();

        case "playSound":
            _playSound(request.type, request.data);
            break; // case "playSound"

        case "reinit":
            getOptions().then((options) => {
                _options = options;

                requestData(request);
            });
            break; // case "reinit"

        case "requestData":
/*
            _state = {
                "unreadMessagesCount": -1,
                "pools": {}
            };
*/
            requestData(request);
            break; // case "requestData"

        case "getLastPools":
            return Promise.resolve(_state.pools);

        default:
            console.warn(`Unsupported command "${request.command}"`);
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

function _setTimer() {
    if ("undefined" !== typeof(_timer)) {
        clearInterval(_timer);
    }
    _timer = setInterval(requestData, _options.storage.updatePeriod * 1000);
}

function requestData(request) {
    if ("undefined" !== typeof(request) && "undefined" !== typeof(request.data)) {
        _processData(request.data);

        return;
    }
    browser.tabs.query({"url": _options.urls.tab}).then((tabs) => {
        if (tabs.length > 0) {
            browser.tabs.sendMessage(
                (tabs.shift()).id, {
                    "target": "watchdog",
                    "command": "getData"
                }
            ).then((response) => {
                _processData(response);
            });

            return;
        }
        let url = [browser.extension.getURL("frontend/options/options.html")];
        browser.tabs.query({"url": url}).then((tabs) => {
            if (tabs.length > 0) {
                _requestDataFromOprionsPage();

                return;
            }
            // Options page will request data itself
            browser.runtime.openOptionsPage();
        });
    }).catch((e) => {
        console.error(e);
    });
}

function _requestDataFromOprionsPage() {
    browser.runtime.sendMessage({
        'target': "options",
        'command': "getData"
    }).catch((e) => {
        console.error(e);
    });
}

function _processData(response) {
    let
        date = new Date, time = date.toLocaleTimeString("en-GB", {
            'hour': "2-digit",
            'minute': "2-digit",
            'second': "2-digit"
        }),
        title = browser.i18n.getMessage('notificationTitle', time),
        notification = [];

    _setTimer();

    if (
        "undefined" === typeof(response.unreadMessagesCount) ||
        "undefined" === typeof(response.pools)
    ) {
        console.error("Invalid response", response);

        return;
    }
    if (
        "undefined" !== typeof(_state.unreadMessagesCount) &&
        response.unreadMessagesCount > _state.unreadMessagesCount
    ) {
        notification.push(browser.i18n.getMessage(
            'unreadMessages', response.unreadMessagesCount
        ));
        if (_options.storage.sound.usage.message) {
            _playSound("message", _options.storage.sound.data.message);
        }
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
    browser.storage.local.set(_options.storage).then(() => {
        browser.runtime.sendMessage({
            'target': "options",
            'command': "refreshRequesters"
        });
    }).catch((e) => {
        console.error(e);
    });
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
                (!filter.tasks.includesTraining && pool.training) ||
                (!filter.tasks.pendingAcceptance && pool.postAccept) ||
                (!filter.tasks.adultContent && pool.mayContainAdultContent) ||
                (!filter.tasks.notAvailable && !pool.available) ||
                (
                    !filter.requesters.all &&
                    "undefined" === typeof(
                        filter.requesters.list[pool.requester.id].checked
                    )
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
            let message = browser.i18n.getMessage(
                "newPools", [newPools.length, newPools.join("\n")]
            );
            notification.push(browser.i18n.getMessage(
                "newPools", [newPools.length, newPools.join("\n")]
            ));
            if (_options.storage.sound.usage.task) {
                _playSound("task", _options.storage.sound.data.task);
            }
        }
    }
    _state.pools = response.pools;
    browser.runtime.sendMessage({
        'target': "options",
        'command': "refreshPools"
    }).catch((e) => {
        console.error(e);
    });

    if (notification.length > 0) {
        browser.notifications.create({
            "type": "basic",
            "iconUrl": browser.extension.getURL(
                (browser.runtime.getManifest()).icons[40]
            ),
            "title": title,
            "message": notification.join("\n- - - -\n")
        });
    }
}

function _playSound(type, data) {
    if ("" === data) {
        (new Audio(`/data/${type}.mp3`)).play();
    } else {
        (new Audio(data)).play();
    }
}

console.info("Core loaded, initializing...");

getOptions().then((options) => {
    _options = options;

    browser.webRequest.onHeadersReceived.addListener(
        (request) => {
            const filter = ["x-frame-options", "content-security-policy"];
            let headers = request.responseHeaders;

            for (let i in headers) {
                let header = headers[i];
                if (filter.indexOf(header.name.toLowerCase()) > -1) {
                    headers.splice(i, 1);
                    --i;
                }
            }

            return {"responseHeaders": headers};
        },
        {"urls": _options.urls.tab},
        ["blocking", "responseHeaders"]
    );

    requestData();
});

