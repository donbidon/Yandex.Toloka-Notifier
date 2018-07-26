"use strict";

/*
let tabUrls, alertSoundData;

const
    updatePeriodElement = document.getElementById('updatePeriod'),
    sendTestNotificationElement = document.getElementById('sendTestNotification'),
    soundFileElement = document.getElementById('soundFile');

updatePeriodElement.addEventListener("change", updatePeriodChanged, false);
document.getElementById('buttonUploadAlertSound').addEventListener("click", () => {
    soundFileElement.click();
}, false);
soundFileElement.addEventListener("change", handleSoundFilePicked, false);
document.getElementById('buttonPlayAlertSound').addEventListener("click", playAlertSound, false);
document.getElementById('buttonRestoreDefaults').addEventListener("click", restore, false);
document.getElementById('buttonApply').addEventListener("click", apply, false);

function sendMessageToTabs(tabUrl, message) {
    return browser.tabs.query({
        'url': tabUrl
    }).then((tabs) => {
        for (let tab of tabs) {
            browser.tabs.sendMessage(tab.id, message);
        }
    }).catch((e) => {
        console.error(e);
    });
}


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

function handleSoundFilePicked() {
    let file = this.files[0], reader = new FileReader();
    reader.onload = (progress) => {
        alertSoundData = progress.target.result;
        alert(browser.i18n.getMessage('options_message_alert_sound_uploaded'));
    };
    reader.readAsDataURL(file);
}

function playAlertSound() {
    browser.runtime.sendMessage({
        'target': "core",
        'command': "playAlertSound",
        'sound': alertSoundData
    }).catch((e) => { console.error(e); });
}

function restore() {
    if (!confirm(browser.i18n.getMessage('options_message_confirm_restore'))) {
        return;
    }

    browser.storage.local.clear().then(() => {
        loadOptions();
        alert(browser.i18n.getMessage('options_message_defaults_restored'));
    });
}

function apply() {
    browser.storage.local.get(null).then((storage) => {
        storage.updatePeriod = updatePeriodElement.value;
        storage.sendTestNotification = sendTestNotificationElement.checked;
        if ("" !== alertSoundData) {
            storage.alertSoundData = alertSoundData;
        }
        browser.storage.local.set(storage).then(() => {
            sendMessageToTabs(tabUrls, {
                'target': "watchdog",
                'command': "updateOptions",
                'storage': storage
            }).catch((e) => {
                console.error(e);
            }).finally(() => {
                alert(browser.i18n.getMessage('options_message_applied'));
            });
        }).catch((e) => { console.error(e); });
    }).catch((e) => { console.error(e); });
}

function loadOptions() {
    browser.runtime.sendMessage({
        'target': "core",
        'command': "getOptions"
    }).then((options) => {
        tabUrls = options.tabUrls;
        alertSoundData =
            "undefined" === typeof(options.storage.alertSoundData)
            ? ""
            : options.storage.alertSoundData;
        updatePeriodElement.min = options.minUpdatePeriod;
        updatePeriodElement.value = options.storage.updatePeriod;
        sendTestNotificationElement.checked = options.storage.sendTestNotification;

        updatePeriodChanged();
    }).catch((e) => { console.error(e); });
}
*/

$(document).ready(() => {
    $("li.disabled a").click((event) => {
        event.stopPropagation();
        event.preventDefault();
    });

    $('[data-toggle="tooltip"]').each((i, node) => {
        node.title = browser.i18n.getMessage(
            `options_tab_${node.title}_tooltip`
        );
    });

    $(() => { $('[data-toggle="tooltip"]').tooltip(); });

    $("a.i18n_options_tab_history").first().trigger("click");

    document.getElementById('hrefYT').href =
        browser.i18n.getMessage('options_href');

    /// loadOptions();
});
