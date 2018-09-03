"use strict";

// console.log("class FakeFS");///

/**
 * Fake File System library over web-requests.
 *
 * WebExtensions context only.
 *
 * @author don.bidon
 */
class FakeFS {
    static get(path) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", path);
            xhr.onload = () => {
                resolve(xhr.responseText);
            };
            xhr.onerror = (e) => {
                reject(e);
            }
            xhr.send();
        });
    }

    static getJSON(path, reviver) {
        return new Promise((resolve, reject) => {
            this.get(path).then((raw) => {
                let parsed = "undefined" == typeof(reviver)
                    ? JSON.parse(raw)
                    : JSON.parse(raw, reviver);
                resolve(parsed);
            }).catch((e) => { reject(e); });
        });
    }
}
