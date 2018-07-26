"use strict";

browser.runtime.onMessage.addListener((message) => {
    if ("core" !== message.target) {

        return;
    }
    switch (message.command) {
        case "getOptions":
            return FakeFS.getJSON("/data/options.json").then((options) => {
                let result = options;
                return browser.storage.local.get(null).then((storage) => {
                    if ("{}" == JSON.stringify(storage)) {
                        result['storage'] = options.defaults;
                        result['storage']['version'] =
                            (browser.runtime.getManifest()).version;
                        browser.storage.local.set(options.defaults);
                    } else {
                        result['storage'] = storage;
                    }
                    delete result['defaults'];

                    return Promise.resolve(result);
                });
            });
            break; // case "getOptions"

        case "notify":
            let
                date = new Date, time = date.toLocaleTimeString("en-GB", {
                    'hour': "2-digit",
                    'minute': "2-digit",
                    'second': "2-digit"
                }),
                title = browser.i18n.getMessage('notificationTitle', time),
                content = [], notifications = message.notifications;

            if ("undefined" !== typeof(notifications.test)) {
                content.push(browser.i18n.getMessage('testNotification'));
            }
            if ("undefined" !== typeof(notifications.unreadMessages)) {
                content.push(browser.i18n.getMessage(
                    'unreadMessages', notifications.unreadMessages
                ));
            }
            if ("undefined" !== typeof(notifications.newPools)) {
                let newPools = [];

                for (let poolId in notifications.newPools) {
                    let pool = notifications.newPools[poolId];
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
                content.push(browser.i18n.getMessage(
                    'newPools', newPools.join("\n")
                ));
            }
            browser.notifications.create({
                "type": "basic",
                "iconUrl": browser.extension.getURL("frontend/icons/toloka.png"),
                "title": title,
                "message": content.join("\n~~~\n")
            });
            playAlertSound(message.sound);
            break; // case "notify"

        case "playAlertSound":
            playAlertSound(message.sound);
            break; // case "playAlertSound"
    }
});
