"use strict";

const
    updatePeriodElement = document.getElementById('updatePeriod'),
    sendTestNotificationElement = document.getElementById('sendTestNotification'),
    soundFileElement = document.getElementById('soundFile');

let _options;

browser.runtime.onMessage.addListener((message) => {
    if ("options" !== message.target) {
        return;
    }

    switch (message.command) {
        case "refreshRequesters":
            refreshRequesters();
            break; // case "refreshRequesters"
    }
});

function refreshRequesters() {
    _loadOptions().then(() => {
        _refreshRequesters();
    });
}

function _refreshRequesters() {
    let
        all = _options.storage.filter.requesters.all,
        requesters = _options.storage.filter.requesters.list;
    // console.log("_refreshRequesters()", requesters); ///

    $("#requesterAll").attr("checked", all);
    $("#filterRequesters").html("");
    for (let id in requesters) {
        let
            requester = requesters[id],
            scope = {
                "id": `requester${id}`,
                "checked":
                    all || "undefined" !== typeof(requester.checked)
                        ? " checked"
                        : "",
                "requester": Toloka.Requester.getName(requester)
            },
            row = TENgine.r("filterRequester", scope);
        $("#filterRequesters").append(row);
    }
}

function _updatePeriodChanged() {
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

function _handleSoundFilePicked() {
    let file = this.files[0], reader = new FileReader();
    reader.onload = (progress) => {
        _options.storage.alertSoundData = progress.target.result;
        $("#modalAlertSoundUploaded").modal();
    };
    reader.readAsDataURL(file);
}

function _playAlertSound() {
    browser.runtime.sendMessage({
        'target': "core",
        'command': "_playAlertSound",
        'sound': _options.storage.alertSoundData
    }).catch((e) => { console.error(e); });
}

function _restore() {
    $("#modalRestoreDefaults").modal();

    return false;
}

function _restorationConfirmed() {
    browser.storage.local.clear()
        .then(() => {
            _loadOptions().then(() => {
                $("#buttonRestorationCancelled").click();
                $("#modalDefaultsRestored").modal();
                _loadOptions().then(() => {
                    _options.storage.optionsLastTab = "settings";
                    _saveOptions();
                    _updateSettingsTab();
                    if ("production" !== _options.storage.environment) {
                        $("fieldset.development").show();
                    } else {
                        $("fieldset.development").hide();
                    }
                    _refreshRequesters();
                });
            });
        })
        .catch((e) => {
            console.error(e);
            $("#modalSettingsErrorMessage").html(e);
            $("#modalSettingsError").modal();
        });
}

function _apply() {
    browser.storage.local.get(null)
        .then((storage) => {
            storage.updatePeriod = updatePeriodElement.value;
            storage.alertSoundData = _options.storage.alertSoundData;
            _options.storage = storage;
            _saveOptions().then(() => {
                browser.runtime.sendMessage({
                    "target": "core",
                    "command": "reinit"
                }).then(() => {
                    $("#modalSettingsApplied").modal();
                });
            });
        })
        .catch((e) => {
            console.error(e);
            $("#modalSettingsErrorMessage").html(e);
            $("#modalSettingsError").modal();
        });
}

function _loadOptions() {
    return browser.runtime.sendMessage({
        'target': "core",
        'command': "getOptions"
    }).then((options) => {
        _options = options;
    }).catch((e) => { console.error(e); });
}

function _saveOptions() {
    return browser.storage.local.set(_options.storage);
}

function _updateSettingsTab() {
    updatePeriodElement.min = _options.minUpdatePeriod;
    updatePeriodElement.value = _options.storage.updatePeriod;
    _updatePeriodChanged();
    if ("production" !== _options.storage.environment) {
        $("fieldset.development").show();
    }
}

function _updateFilterTab() {
    let tasks = _options.storage.filter.tasks;

    for (let task in tasks) {
        // str = str.charAt(0).toUpperCase() + str.slice(1);
        $(
            "#tasks" + task.charAt(0).toUpperCase() + task.slice(1)
        ).attr("checked", tasks[task]);
    }

    _refreshRequesters();
}


$(document).ready(() => {

    // Cancels click at temporary disabled tabs
    $("li.disabled a").click((event) => {
        event.stopPropagation();
        event.preventDefault();
    });

    // Fills "title" attribute for tooltips using locales
    $('[data-toggle="tooltip"]').each((i, node) => {
        node.title = browser.i18n.getMessage(
            `options_tab_${node.title}_tooltip`
        );
    });

    // From tooltips docs
    $(() => { $('[data-toggle="tooltip"]').tooltip(); });

    // Tab "Filter" {



    // } Tab "Filter"
    // Tab "Settings" {

    $(updatePeriodElement).change(_updatePeriodChanged);
    $('#buttonUploadAlertSound').click(() => {
        soundFileElement.click();
    });
    $('#buttonSendRequest').click(() => {
        browser.runtime.sendMessage({
            'target': "core",
            'command': "requestTasks"
        });
    });
    $(soundFileElement).change(_handleSoundFilePicked);
    $('#buttonPlayAlertSound').click(_playAlertSound);
    $('#buttonRestoreDefaults').click(_restore);
    $('#buttonRestorationConfirmed').click(_restorationConfirmed);
    $('#buttonApply').click(_apply);
    $('#formSettings').submit((event) => {
        event.stopPropagation();
        event.preventDefault();
        return false;
    });

    // } Tab "Settings"
    // Tab "About" {

    // Fills Yandex.Toloka URL using locales
    $('#hrefYT').attr("href", browser.i18n.getMessage('options_href'));

    // } Tab "About"

    _loadOptions().then(() => {
        $().alert();

        _updateSettingsTab();
        _updateFilterTab();

        // Opens last tab saved to storage
        $(`[aria-controls="${_options.storage.optionsLastTab}"]`).trigger("click");

        $("li.nav-item a:not(.disabled)").click((event) => {
            _options.storage.optionsLastTab =
                $(event.target).attr('aria-controls');
            _saveOptions();
        });

        // Hides spinner, shows content
        $("#loader").fadeOut(() => {
            $(".centeredOuter").css("display", "none");
        });
        $(".content").fadeIn();
    }).catch((e) => { console.error(e); });
});
