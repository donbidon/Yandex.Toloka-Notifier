"use strict";

let Toloka = {
    Requester: {
        locale: {
            "default": (browser.runtime.getManifest())
                .default_locale.toUpperCase(),
            "ui": browser.i18n.getUILanguage().toUpperCase()
        },

        getName: (info) => {
            let
                locale = Toloka.Requester.locale,
                name = info.name;

            return "undefined" !== typeof(name[locale.ui])
                ? name[locale.ui]
                : name[locale.default];
        }
    }
};

