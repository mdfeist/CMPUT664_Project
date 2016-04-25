module.exports = {
    "env": {
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            2,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        /* Prefer single quotes, but forgive double quotes. */
        "quotes": [
            0,
            //"warn",
            //"single",
            //{
            //    "avoidEscape": true,
            //    "allowTemplateLiterals": true
            //}
        ],
        /* ALWAYS use semicolons! */
        "semi": [
            "error",
            "always"
        ],
        /* Only permit comma-dangle on multiline things. */
        "comma-dangle": [
            "warn",
            "only-multiline"
        ],
        /* Warn on unused variables, but permit _danglingUnderscore. */
        "no-unused-vars": [
            "warn",
            {
                "args": "after-used",
                "argsIgnorePattern": "^_"
            }
        ]

    }
};
