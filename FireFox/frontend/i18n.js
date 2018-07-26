"use strict";

function i18nSetNodeMessage(node, messageId, args) {
    function processString(message, currentElement) {
        const match = /^(.*?)<(a|strong)>(.*?)<\/\2>(.*)$/.exec(message);
        if (match) {
            processString(match[1], currentElement);
            const element = document.createElement(match[2]);
            processString(match[3], element);
            currentElement.appendChild(element);
            processString(match[4], currentElement);
        } else {
            currentElement.appendChild(document.createTextNode(message));
        }
    }

    while (node.lastChild) {
        node.removeChild(node.lastChild);
    }
    processString(browser.i18n.getMessage(messageId, args), node);
}

function i18nOnDOMContentLoaded() {
    function fillLocales(container) {
        const nodes = container.querySelectorAll("[class^='i18n_']");

        for (const node of nodes) {
            let args = JSON.parse("[" + node.textContent + "]");
            if (0 == args.length) {
                args = null;
            }
            let {className} = node;
            if (className instanceof SVGAnimatedString) {
                className = className.animVal;
            }
            const messageId = className.split(/\s/)[0].substring(5);

            i18nSetNodeMessage(node, messageId, args);
        }
    }

    fillLocales(document);
    for (const template of document.querySelectorAll("template")) {
        fillLocales(template.content);
    }
}

browser.runtime.sendMessage({
    'target': "core",
    'command': "getLocale"
}).then((locale) => {
    document.documentElement.lang = locale.language;
    document.documentElement.dir = locale.direction;
});

window.addEventListener("DOMContentLoaded", i18nOnDOMContentLoaded, true);
