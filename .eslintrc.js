var OFF = 0, WARN = 1, ERROR = 2;

module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "plugins": [
    "no-class"
  ],
  "extends": "eslint:recommended",
  "parser": "babel-eslint",
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    // Best practices
    "complexity": [ERROR],
    "curly": [ERROR],
    "dot-notation": [ERROR],
    "eqeqeq": [ERROR, "smart"],
    "no-else-return": [ERROR],
    "no-param-reassign": [ERROR],
    "no-useless-call": [ERROR],
    "no-useless-escape": [ERROR],
    "no-void": [ERROR],
    "no-with": [ERROR],

    // Stylistic problems
    "array-bracket-spacing": [ERROR, "never"],
    "brace-style": [ERROR, "stroustrup", {
      "allowSingleLine": true
    }],
    "camelcase": [ERROR, {
      "properties": "always"
    }],
    "eol-last": [ERROR],
    "indent": [ERROR, 2, {
      "SwitchCase": 1
    }],
    "keyword-spacing": [ERROR],
    "linebreak-style": [ERROR, "unix"],
    "max-len": [ERROR, 120],
    "max-lines": [ERROR, {
      "max": 300,
      "skipBlankLines": true,
      "skipComments": true
    }],
    "quotes": [ERROR, "single"],
    "semi": [ERROR, "always"],

    // ES6-specific
    "no-duplicate-imports": [ERROR],
    "no-useless-computed-key": [ERROR],
    "no-useless-rename": [ERROR],
    "no-var": [ERROR],
    "object-shorthand": [ERROR],
    "prefer-const": [ERROR],
    "prefer-numeric-literals": [ERROR],
    "prefer-rest-params": [ERROR],
    "prefer-spread": [ERROR],

    // Plugins
    "no-class/no-class": [ERROR]
  }
};
