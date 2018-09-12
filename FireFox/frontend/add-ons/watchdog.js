// " use strict";

let  _options;

browser.runtime.onMessage.addListener((request) => {
    if ("watchdog" !== request.target) {
        return;
    }

    switch (request.command) {
        case "getData":
            // console.log("getData from runtime");console.trace();///
            return getData();

        default:
            console.warn(`Unsupported command "${request.command}"`);
    }
});

function getData() {
    return new Promise((resolve, reject) => {
        // console.log("Requesting data...");
        let data = {
            "unreadMessagesCount": null,
            "pools": {}
        };

        FakeFS.getJSON(_options.urls.xhr.messages).then((response) => {
            data.unreadMessagesCount = response.unread;
            FakeFS.getJSON(_options.urls.xhr.pools).then((response) => {
                let pools = {};

                for (let pool of response) {
                    data.pools[pool.lightweightTec.poolId] = {
                        // "requester": requester,
                        "refUuid": pool.refUuid,
                        "title": pool.lightweightTec.title,
                        "requester": pool.lightweightTec.requesterInfo,
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
                // console.log("Sending data response...");
                resolve(data);
            });
        }).catch((e) => {
            reject(e);
        });
    });
}

// Listen to the message from options page (patent)
window.addEventListener("message", (evt) => {
    if (
        browser.extension.getURL("") !==
        (evt.origin + "/")
    ) {
        return;
    }

    switch (evt.data.command) {
        case "getData":
            // console.log("getData from iframe");console.trace();///
            getData().then((data) => {
                data["target"] = "options";
                evt.source.postMessage(data, evt.origin);
            });
            break; // case "getData"
    }
}, false);

browser.runtime.sendMessage({
    'target': "core",
    'command': "getOptions"
}).then((options) => {
    _options = options;
    if (0 === window.parent.document.location.href.indexOf("moz-extension://")) {
        getData().then((data) => {
            window.parent.postMessage(data, "*");
        });
    }
}).catch((e) => {
    if (e.message !== browser.i18n.getMessage('ignoreErrorMessage')) {
        console.error(e);
    } else {
        document.location.reload();
    }
});

