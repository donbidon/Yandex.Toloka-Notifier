"use strict";

const
    updatePeriodNode = document.getElementById('updatePeriod'),
    taskSoundNode = document.getElementById('taskSound'),
    messageSoundNode = document.getElementById('messageSound');

let _options;

browser.runtime.onMessage.addListener((message) => {
    if ("options" !== message.target) {
        return;
    }

    switch (message.command) {
        case "refreshRequesters":
            refreshRequesters();
            break; // case "refreshRequesters"

        case "refreshPools":
            _refreshPools();
            _toggleFilter(true);
            break; // case "refreshPools"
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

function _toggleFilter(enable) {
    if (enable) {
        $("#filter").removeClass("blocked");
        $("#filter .centeredOuter").hide();
    } else {
        $("#filter").addClass("blocked");
        $("#filter .centeredOuter").css("display", "table");
    }
}

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

    /*
    browser.tabs.query({"url": _options.urls.tab}).then((tabs) => {
        if (tabs.length < 1) {
            top.window.open("https://google.com/")
        }
    });
    */
    _toggleFilter(false);
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

function _refreshPools() {
    return browser.runtime.sendMessage({
        'target': "core",
        'command': "getLastPools"
    }).then((pools) => {
        if ("undefined" === typeof(pools)) {
            return;
        }
        $("#taskColumn").html("");
        // Filter pools according to rules
        let filter = _options.storage.filter, pool;
        console.log(pools);///
        for (let poolId in pools) {
            pool = pools[poolId];
            if (0 == pool.reward) {
                pools[poolId].reward = "0.00";
            }
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
                delete pools[poolId];
            }
        }
        for (let poolId in pools) {
            pool = pools[poolId];
            pool["id"] = poolId;
            pool["requester"] = Toloka.Requester.getName(pool.requester);
            let tail = [];
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
            if (tail.length > 0) {
                pool["tail"] = `(${tail})`;
            } else {
                pool["tail"] = "";
            }
            pool["link"] = browser.i18n.getMessage('options_href')

            let
                row = TENgine.r("filterPool" + (pool.available ? "" : "NA"), pool);

            $("#taskColumn").append(row);
        }
        if ("{}" == JSON.stringify(pools)) {
            // $("#taskColumn").heml(TENgine.r("filterNoPools", {}));
            $("#taskColumn").html(
                browser.i18n.getMessage("options_filter_no_pools")
            );
        }
    });
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

    _refreshPools();
}

// } Tab "Filter" functions
// Tab "Settings" functions {

function _updatePeriodChanged() {
    let
        v = updatePeriodNode.value,
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

function _handleSoundFilePicked(evt) {
    let
        file = this.files[0],
        reader = new FileReader(),
        type = $(evt.target).attr("data-type");

    reader.onload = (progress) => {
        _options.storage.sound.data[type] =
            progress.target.result;
        $("#modalSoundUploaded").modal();
    };
    reader.readAsDataURL(file);
}

function _playSound(evt) {
    let type = $(evt.target).attr("data-type");

    browser.runtime.sendMessage({
        'target': "core",
        'command': "playSound",
        "type": type,
        'data': _options.storage.sound.data[type]
    }).catch((e) => { console.error(e); });
}

function _soundUsageChanged(evt) {
    _options.storage.sound.usage[$(evt.target).attr("data-type")] =
        $(evt.target).prop("checked");
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
            storage.updatePeriod = updatePeriodNode.value;
            storage.sound = _options.storage.sound;
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
    updatePeriodNode.min = _options.minUpdatePeriod;
    updatePeriodNode.value = _options.storage.updatePeriod;
    _updatePeriodChanged();
    $("#useTaskSound").prop("checked", _options.storage.sound.usage.task);
    $("#useMessageSound").prop("checked", _options.storage.sound.usage.message);

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

    $(updatePeriodNode).change(_updatePeriodChanged);
    $('#buttonUploadTaskSound').click(() => {
        taskSoundNode.click();
    });
    $('#buttonUploadMessageSound').click(() => {
        messageSoundNode.click();
    });
    $(taskSoundNode).change(_handleSoundFilePicked);
    $(messageSoundNode).change(_handleSoundFilePicked);
    $('#buttonPlayTaskSound').click(_playSound);
    $('#buttonPlayMessageSound').click(_playSound);
    $('#useTaskSound').click(_soundUsageChanged);
    $('#useMessageSound').click(_soundUsageChanged);

    $('#buttonApply').click(_applySettings);
    $('#buttonRestoreDefaults').click(_restoreSettings);
    $('#buttonRestorationConfirmed').click(_settingsRestorationConfirmed);

    // Developer environment {

    $('#buttonSendRequest').click(() => {
        browser.runtime.sendMessage({
            'target': "core",
            'command': "requestData"
        });
    });

    // } Developer environment

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
            $("#globalLoader").css("display", "none");
        });
        $(".content").fadeIn();
    }).catch((e) => { console.error(e); });
});
