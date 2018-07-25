"use strict";

// console.log("stuff code");///

function sendMessageToCurrentTab(message) {
    return browser.tabs.query({'active': true}).then((tabs) => {
        return browser.tabs.sendMessage(tabs[0].id, message);
    });
}

function sendMessageToTabs(tabUrls, message) {
    return browser.tabs.query({
        'url': tabUrls
    }).then((tabs) => {
        for (let tab of tabs) {
            browser.tabs.sendMessage(tab.id, message);
        }
    }).catch((e) => { console.error(e); });
}

function storage(key) {
    if ("undefined" === typeof(key)) {
        key = null;
    }
    browser.storage.local.get(key).then((st) => {
        console.log(`'${key}' storage:`);
        console.log(st);
    }).catch((e) => { console.error(e); });
}
