"use strict";

const
    updatePeriodElement = document.getElementById('updatePeriod'),
    sendTestNotificationElement = document.getElementById('sendTestNotification'),
    soundFileElement = document.getElementById('soundFile');

let _options;

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
        _options.storage.alertSoundData = progress.target.result;
        $("#modalAlertSoundUploaded").modal();
    };
    reader.readAsDataURL(file);
}

function playAlertSound() {
    browser.runtime.sendMessage({
        'target': "core",
        'command': "playAlertSound",
        'sound': _options.storage.alertSoundData
    }).catch((e) => { console.error(e); });
}

function restore() {
    $("#modalRestoreDefaults").modal();

    return false;
}

function restorationConfirmed() {
    browser.storage.local.clear()
        .then(() => {
            loadOptions().then(() => {
                $("#buttonRestorationCancelled").click();
                $("#modalDefaultsRestored").modal();
                loadOptions().then(() => {
                    updateDOMOptions();
                    if ("production" !== _options.storage.environment) {
                        $("fieldset.form-group").show();
                    } else {
                        $("fieldset.form-group").hide();
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

function apply() {
    browser.storage.local.get(null)
        .then((storage) => {
            storage.updatePeriod = updatePeriodElement.value;
            storage.sendTestNotification = sendTestNotificationElement.checked;
            storage.alertSoundData = _options.storage.alertSoundData;
            _options.storage = storage;
            saveOptions().then(() => {
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

function updateDOMOptions() {
    updatePeriodElement.min = _options.minUpdatePeriod;
    updatePeriodElement.value = _options.storage.updatePeriod;
    updatePeriodChanged();
    sendTestNotificationElement.checked = _options.storage.sendTestNotification;
}

function loadOptions() {
    return browser.runtime.sendMessage({
        'target': "core",
        'command': "getOptions"
    }).then((options) => {
        _options = options;
    }).catch((e) => { console.error(e); });
}

function saveOptions()  {
    return browser.storage.local.set(_options.storage);
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

    $(() => { $('[data-toggle="tooltip"]').tooltip(); });

    // Fills Yandex.Toloka URL using locales
    $('#hrefYT').attr("href", browser.i18n.getMessage('options_href'));

    $(updatePeriodElement).change(updatePeriodChanged);
    $('#buttonUploadAlertSound').click(() => {
        soundFileElement.click();
    });
    $('#buttonSendRequest').click(() => {
        browser.runtime.sendMessage({
            'target': "core",
            'command': "requestTasks"
        });
    });
    $(soundFileElement).change(handleSoundFilePicked);
    $('#buttonPlayAlertSound').click(playAlertSound);
    $('#buttonRestoreDefaults').click(restore);
    $('#buttonRestorationConfirmed').click(restorationConfirmed);
    $('#buttonApply').click(apply);
    $('#formSettings').submit((event) => {
        event.stopPropagation();
        event.preventDefault();
        return false;
    });

    loadOptions().then(() => {
        $().alert();
        updateDOMOptions();

        if ("production" !== _options.storage.environment) {
            $("fieldset.form-group").show();
        }

        // Opens last tab saved to storage
        $(`[aria-controls="${_options.storage.optionsLastTab}"]`
            ).trigger("click");

        $("li.nav-item a:not(.disabled)").click((event) => {
            _options.storage.optionsLastTab =
                $(event.target).attr('aria-controls');
            saveOptions();
        });

        $("#loader").fadeOut(() => {
            $(".centeredOuter").css("display", "none");
        });
        $(".content").fadeIn();
    }).catch((e) => { console.error(e); });
});
