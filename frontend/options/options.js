"use strict";

let tabUrls;

const
    updatePeriodElement = document.getElementById('updatePeriod'),
    sendTestNotificationElement = document.getElementById('sendTestNotification');
    // soundFileElement = document.getElementById('soundFile');

// soundFileElement.addEventListener("change", handlePicked, false);


updatePeriodElement.addEventListener("change", updatePeriodChanged, false);
document.getElementById('buttonPlayAlertSound').addEventListener("click", playSound, false);
document.getElementById('buttonApply').addEventListener("click", apply, false);

function updatePeriodChanged() {
    let
        v = updatePeriodElement.value,
        h = Math.floor(v / 3600),
        m = Math.floor(v / 60) - h * 60,
        s = v % 60,
        p = [h, m, s],
        options = {'updatePeriod': v};

    for (let i in p) {
        if (p[i] < 10) {
            p[i] = "0" + ("" + p[i]);
        }
    }
    document.getElementById('updatePeriodCalculated').innerText = p.join(":");
}

function playSound() {
    browser.runtime.sendMessage({
        'target': "core",
        'command': "playAlertSound"
    }).catch((e) => { console.error(e); });
}

function apply() {
    browser.storage.local.get(null).then((storage) => {
        storage.updatePeriod = updatePeriodElement.value;
        storage.sendTestNotification = sendTestNotificationElement.checked;
        browser.storage.local.set(storage).then(() => {
            /// sendMessageToCurrentTab({
            sendMessageToTabs(tabUrls, {
                'target': "watchdog",
                'command': "updateOptions",
                'storage': storage
            }).catch((e) => {
                console.error(e);
            }).finally(() => {
                alert(browser.i18n.getMessage('messageApplied'));
            });
        }).catch((e) => { console.error(e); });
    }).catch((e) => { console.error(e); });
}

/*
function handlePicked() {
    const url = window.URL.createObjectURL(this.files[0]);

    FakeFS.get(url).then((file) => {
        _options.storage.alertSound = file;
        browser.storage.local.set(_options.storage).then(() => {
            alert(browser.i18n.getMessage('alertSoundUpdated'));
        }).catch((e) => {
            console.error(e);
        });
    }).catch((e) => {
        console.error(e);
    });
}
*/

browser.runtime.sendMessage({
    'target': "core",
    'command': "getOptions"
}).then((options) => {
    tabUrls = options.tabUrls
    updatePeriodElement.min = options.minUpdatePeriod;
    updatePeriodElement.value = options.storage.updatePeriod;
    sendTestNotificationElement.checked = options.storage.sendTestNotification;

    updatePeriodChanged();
}).catch((e) => { console.error(e); });

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById('hrefYT').href =
        browser.i18n.getMessage('options_href');
}, true);
