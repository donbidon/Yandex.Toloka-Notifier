// " use strict";

let  _options;

browser.runtime.onMessage.addListener((message) => {
    if ("watchdog" !== message.target) {
        return;
    }

    switch (message.command) {
        case "getData":
            return getData();
    }
});

function getData() {
    return new Promise((resolve, reject) => {
        console.log("Requesting data...");
        let data = {
            "unreadMessagesCount": null,
            "pools": {}
        };

        FakeFS.getJSON(_options.xhr.messages).then((response) => {
            data.unreadMessagesCount = response.unread;
            FakeFS.getJSON(_options.xhr.pools).then((response) => {
                let
                    uiLocale = browser.i18n.getUILanguage().toUpperCase(),
                    defaultLocale = (browser.runtime.getManifest())
                        .default_locale.toUpperCase(),
                    pools = {};

                for (let pool of response) {
                    let
                        requesterName = pool.lightweightTec.requesterInfo.name,
                        requester = "undefined" !== typeof(requesterName[uiLocale])
                            ? requesterName[uiLocale]
                            : requesterName[defaultLocale];

                    data.pools[pool.lightweightTec.poolId] = {
                        "requester": requester,
                        "title": pool.lightweightTec.title,
                        "reward": pool.lightweightTec.assignmentConfig.reward,
                        "available": pool.availability.available,
                        "postAccept": pool.acceptanceDetails.postAccept,
                        "training": pool.lightweightTec.trainingConfig.training,
                        "mayContainAdultContent": pool.lightweightTec.mayContainAdultContent
                    };
                }
            }).catch((e) => {
                reject(e);
            }).finally(() => {
                console.log("Sending data response...");
                resolve(data);
            });
        }).catch((e) => {
            reject(e);
        });
    });
}

browser.runtime.sendMessage({
    'target': "core",
    'command': "getOptions"
}).then((options) => {
    _options = options;
}).catch((e) => {
    if (e.message !== browser.i18n.getMessage('ignoreErrorMessage')) {
        console.error(e);
    } else {
        document.location.reload();
    }
});
