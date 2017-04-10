const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  'env': {
    'es6': true,
    'node': true,
    'mocha': true,
    'browser': true
  },
  'extends': 'eslint:recommended',
  'parser': 'babel-eslint',
  'parserOptions': {
    'sourceType': 'module'
  },
  'plugins': [
    'no-class'
  ],
  'rules': {
    // Possible Errors
    'no-extra-parens': [ERROR, 'all', {
      'conditionalAssign': false,
      'returnAssign': false,
      'nestedBinaryExpressions': false
    }],
    'no-template-curly-in-string': [ERROR],

    // Best Practices
    'accessor-pairs': [ERROR],
    'complexity': [ERROR, 20],
    'curly': [ERROR],
    'dot-location': [ERROR, 'property'],
    'dot-notation': [ERROR],
    'eqeqeq': [ERROR, 'smart'],
    'no-caller': [ERROR],
    'no-else-return': [ERROR],
    'no-extend-native': [ERROR],
    'no-extra-bind': [ERROR],
    'no-floating-decimal': [ERROR],
    'no-implied-eval': [ERROR],
    'no-iterator': [ERROR],
    'no-labels': [ERROR],
    'no-lone-blocks': [ERROR],
    'no-multi-str': [ERROR],
    'no-new': [ERROR],
    'no-new-func': [ERROR],
    'no-new-wrappers': [ERROR],
    'no-octal-escape': [ERROR],
    'no-param-reassign': [ERROR],
    'no-proto': [ERROR],
    'no-return-assign': [ERROR],
    'no-self-compare': [ERROR],
    'no-sequences': [ERROR],
    'no-throw-literal': [ERROR],
    'no-unmodified-loop-condition': [ERROR],
    'no-useless-call': [ERROR],
    'no-useless-escape': [ERROR],
    'no-void': [ERROR],
    'no-with': [ERROR],
    'wrap-iife': [ERROR, 'any'],
    'yoda': [ERROR],

    // Strict Mode
    'strict': [ERROR],

    // Variables
    'no-label-var': [ERROR],
    'no-shadow-restricted-names': [ERROR],
    'no-undef-init': [ERROR],

    // Stylistic Issues
    'array-bracket-spacing': [ERROR, 'never'],
    'block-spacing': [ERROR],
    'brace-style': [ERROR, '1tbs', {
      'allowSingleLine': true
    }],
    'camelcase': [ERROR, {
      'properties': 'never'
    }],
    'comma-spacing': [ERROR, {
      'before': false,
      'after': true
    }],
    'comma-style': [ERROR],
    'computed-property-spacing': [ERROR, 'never'],
    'consistent-this': [ERROR, 'self'],
    'eol-last': [ERROR],
    'func-call-spacing': [ERROR, 'never'],
    'func-name-matching': [ERROR],
    'indent': [ERROR, 2, {
      'SwitchCase': 1
    }],
    'key-spacing': [ERROR, {
      'beforeColon': false,
      'afterColon': true,
      'mode': 'minimum'
    }],
    'keyword-spacing': [ERROR],
    'max-len': [ERROR, 120],
    'max-lines': [ERROR, {
      'max': 300,
      'skipBlankLines': true,
      'skipComments': true
    }],
    'no-lonely-if': [ERROR],
    'no-multiple-empty-lines': [ERROR, {
      max: 1
    }],
    'no-new-object': [ERROR],
    'no-tabs': [ERROR],
    'no-trailing-spaces': [ERROR],
    'no-unneeded-ternary': [ERROR],
    'no-whitespace-before-property': [ERROR],
    'object-property-newline': [ERROR, {
      'allowMultiplePropertiesPerLine': true
    }],
    'one-var': [ERROR, {
      'initialized': 'never'
    }],
    'operator-linebreak': [ERROR],
    'padded-blocks': [ERROR, 'never'],
    'quotes': [ERROR, 'single'],
    'semi': [ERROR],
    'semi-spacing': [ERROR],
    'space-before-blocks': [ERROR],
    'space-before-function-paren': [ERROR, {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'ignore'
    }],
    'space-in-parens': [ERROR, 'never'],
    'space-infix-ops': [ERROR],
    'space-unary-ops': [ERROR , {
      'words': true,
      'nonwords': false
    }],
    'spaced-comment': [ERROR, 'always', {
      'line': {
        'markers': ['/'],
        'exceptions': ['-', '+']
      },
      'block': {
        'markers': ['!'],
        'exceptions': ['*'],
        'balanced': true
      }
    }],

    // ECMAScript 6
    'arrow-parens': [ERROR, 'always'],
    'arrow-spacing': [ERROR],
    'generator-star-spacing': [ERROR, {
      'before': false,
      'after': true
    }],
    'no-duplicate-imports': [ERROR],
    'no-useless-computed-key': [ERROR],
    'no-useless-rename': [ERROR],
    'no-var': [ERROR],
    'object-shorthand': [ERROR],
    'prefer-arrow-callback': [ERROR],
    'prefer-const': [ERROR],
    'prefer-numeric-literals': [ERROR],
    'prefer-rest-params': [ERROR],
    'prefer-spread': [ERROR],
    'rest-spread-spacing': [ERROR],
    'template-curly-spacing': [ERROR],
    'yield-star-spacing': [ERROR],

    // Plugin rules
    'no-class/no-class': [ERROR]
  }
};
