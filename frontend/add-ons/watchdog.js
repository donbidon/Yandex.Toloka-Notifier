"use strict";

let _options, _timer, _state = {};

function updateTimer(updatePeriod) {
    if ("undefined" !== typeof(_timer)) {
        clearInterval(_timer);
    }
    _timer = setInterval(doRequest, updatePeriod * 1000);
    console.log(`Update period set to ${updatePeriod} seconds`);
}

function doRequest() {
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
                /// {
                if (
                    "undefined" === typeof(pool.lightweightTec.requesterInfo.name.RU) ||
                    "undefined" === pool.lightweightTec.requesterInfo.name.RU
                ) {
                    console.error("Invalid requester found:", pool);
                }
                /// }
                pools[pool.lightweightTec.poolId] = {
                    'requester': pool.lightweightTec.requesterInfo.name.RU,
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
        }).catch((e) => { console.error(e); }).finally(() => {
            if ("{}" !== JSON.stringify(notifications)) {
                // console.log("Sending notifications:", notifications);
                browser.runtime.sendMessage({
                    'target': "core",
                    'command': "notify",
                    'notifications': notifications,
                    'sound':
                        "undefined" === typeof(_options.storage.alertSoundData)
                            ? ""
                            : _options.storage.alertSoundData
                });
            }
        });
    }).catch((e) => { console.error(e); });
}

browser.runtime.onMessage.addListener((message) => {
    if ("watchdog" !== message.target) {
        return;
    }

    switch (message.command) {
        case "updateOptions":
            _options.storage = message.storage;
            console.log("Options updated:", message.storage);
            updateTimer(message.storage.updatePeriod);
            break;
    }
});

browser.runtime.sendMessage({
    'target': "core",
    'command': "getOptions"
}).then((options) => {
    _options = options;
    updateTimer(options.storage.updatePeriod);
}).catch((e) => {
    if (e.message !== browser.i18n.getMessage('ignoreErrorMessage')) {
        console.error(e);
    } else {
        document.location.reload();
    }
});
