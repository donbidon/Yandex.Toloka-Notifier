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

// Common functions {

function _loadOptions() {
    return browser.runtime.sendMessage({
        'target': "core",
        'command': "getOptions"
    }).then((options) => {
        _options = options;
    }).catch((e) => {
        console.error(e);
    });
}

function _saveOptions() {
    return browser.storage.local.set(_options.storage).then(() => {
        return browser.runtime.sendMessage({
            "target": "core",
            "command": "reinit"
        });
    });
}

// } Common functions
// Tab "Filter" functions {

function _onTaskFilterChanged(evt) {
    _applyFilterSettings();
}

function _onRequesterFilterChanged(evt) {
    let id = evt.target.id, checked = $(`#${id}`).prop("checked");

    if ("requesterAll" === id) {
        $('#filterRequestersList input').prop("checked", checked);
    } else {
        let all = true;

        $('#filterRequestersList input').each((i, elem) => {
            if (!$(elem).prop("checked")) {
                all = false;

                return false;
            }
        });
        $('#requesterAll').prop("checked", all);
    }
    _applyFilterSettings();
}

function _applyFilterSettings() {
    let options = _options.storage.filter;

    $('#filterTasks input').each((i, elem) => {
        let
            id = elem.id.substr(5),
            arg = id.charAt(0).toLocaleLowerCase() + id.slice(1);

        options.tasks[arg] = $(elem).prop("checked");
    });

    options.requesters.all = $('#requesterAll').prop("checked");
    if (!options.requesters.all) {
        $('#filterRequestersList input').each((i, elem) => {
            let
                id = elem.id.substr(9),
                checked = $(elem).prop("checked");

            if (checked) {
                options.requesters.list[id].checked = true;
            } else {
                delete options.requesters.list[id].checked;
            }
        });
    }

    _saveOptions();
}

function _refreshRequesters() {
    let
        all = _options.storage.filter.requesters.all,
        requesters = _options.storage.filter.requesters.list,
        orderedRequesters = [];

    for (let id in requesters) {
        orderedRequesters.push(requesters[id]);
    }
    orderedRequesters.sort((a, b) => {
        let offset =
            Toloka.Requester.getName(a) > Toloka.Requester.getName(b)
                ? 1
                : -1;
        return offset;
    });

    $("#requesterAll").attr("checked", all);
    $("#filterRequestersList").html("");
    for (let requester of orderedRequesters) {
        let
            scope = {
                "id": `requester${requester.id}`,
                "checked":
                    all || "undefined" !== typeof(requester.checked)
                        ? " checked"
                        : "",
                "requester": Toloka.Requester.getName(requester)
            },
            row = TENgine.r("filterRequester", scope);
        $("#filterRequestersList").append(row);
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

    $('#filterTasks input').each((i, elem) => {
        $(elem).click(_onTaskFilterChanged);
    });
    $('#filterRequesters input').each((i, elem) => {
        $(elem).click(_onRequesterFilterChanged);
    });
}

// } Tab "Filter" functions
// Tab "Settings" functions {

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
        'command': "playAlertSound",
        'sound': _options.storage.alertSoundData
    }).catch((e) => { console.error(e); });
}

function _restoreSettings() {
    $("#modalRestoreDefaults").modal();

    return false;
}

function _settingsRestorationConfirmed() {
    browser.storage.local.clear()
        .then(() => {
            _loadOptions().then(() => {
                $("#buttonRestorationCancelled").click();
                $("#modalDefaultsRestored").modal();
                _loadOptions().then(() => {
                    _options.storage.optionsLastTab = "settings";
                    _saveOptions();
                    _updateFilterTab();
                    _updateSettingsTab();
                    if ("production" !== _options.storage.environment) {
                        $("fieldset.development").show();
                    } else {
                        $("fieldset.development").hide();
                    }
                });
            });
        })
        .catch((e) => {
            console.error(e);
            $("#modalSettingsErrorMessage").html(e);
            $("#modalSettingsError").modal();
        });
}

function _applySettings() {
    browser.storage.local.get(null)
        .then((storage) => {
            storage.updatePeriod = updatePeriodElement.value;
            storage.alertSoundData = _options.storage.alertSoundData;
            _options.storage = storage;
            _saveOptions().then(() => {
                $("#modalSettingsApplied").modal();
            });
        })
        .catch((e) => {
            console.error(e);
            $("#modalSettingsErrorMessage").html(e);
            $("#modalSettingsError").modal();
        });
}

function _updateSettingsTab() {
    updatePeriodElement.min = _options.minUpdatePeriod;
    updatePeriodElement.value = _options.storage.updatePeriod;
    _updatePeriodChanged();
    if ("production" !== _options.storage.environment) {
        $("fieldset.development").show();
    }
}

// } Tab "Settings" functions


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
    $('#buttonRestoreDefaults').click(_restoreSettings);
    $('#buttonRestorationConfirmed').click(_settingsRestorationConfirmed);
    $('#buttonApply').click(_applySettings);
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
