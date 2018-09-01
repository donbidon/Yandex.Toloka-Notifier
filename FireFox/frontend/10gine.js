"use strict";

/**
 * Simple template engine.
 *
 * Replaces "${name}" by value passed in scope.
 *
 * @author don.bidon
 */
let TENgine = {
    /**
     * Renders template passed by id using scope.
     *
     * @param string id
     * @param object scope
     *
     * @return string
     */
    render: (id, scope) => {
        let template = document.getElementById(id).innerHTML;
        for (let name in scope) {
            let
                value = scope[name],
                re = new RegExp(`\\$\\{${name}\\}`, "g");

            template = template.replace(re, value);
        }

        return template;
    },

    /**
     * Short alias for render method.
     *
     * @see self::render()
     */
    r: (id, scope) => {
        return TENgine.render(id, scope);
    }
};
