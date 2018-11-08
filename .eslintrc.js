const OFF = 0;
const WARN = 1;
const ERROR = 2;

module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true,
    browser: true
  },
  extends: 'eslint:recommended',
  parser: 'babel-eslint',
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    // All rules set to OFF are handled by prettier

    // Possible Errors
    'no-extra-parens': [OFF],
    'no-extra-semi': [OFF],
    'no-template-curly-in-string': [ERROR],

    // Best Practices
    'accessor-pairs': [ERROR],
    complexity: [ERROR, 20],
    curly: [ERROR],
    'dot-location': [OFF],
    'dot-notation': [ERROR],
    eqeqeq: [ERROR, 'smart'],
    'no-caller': [ERROR],
    'no-else-return': [ERROR],
    'no-extend-native': [ERROR],
    'no-extra-bind': [ERROR],
    'no-floating-decimal': [ERROR],
    'no-implied-eval': [ERROR],
    'no-iterator': [ERROR],
    'no-labels': [ERROR],
    'no-lone-blocks': [ERROR],
    'no-multi-spaces': [OFF],
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
    'wrap-iife': [OFF],
    yoda: [ERROR],

    // Strict Mode
    strict: [ERROR],

    // Variables
    'no-label-var': [ERROR],
    'no-shadow-restricted-names': [ERROR],
    'no-undef-init': [ERROR],

    // Stylistic Issues
    'array-bracket-newline': [OFF],
    'array-bracket-spacing': [OFF],
    'array-element-newline': [OFF],
    'block-spacing': [OFF],
    'brace-style': [OFF],
    camelcase: [
      ERROR,
      {
        properties: 'never'
      }
    ],
    'comma-dangle': [OFF],
    'comma-spacing': [OFF],
    'comma-style': [OFF],
    'computed-property-spacing': [OFF],
    'consistent-this': [ERROR, 'self'],
    'eol-last': [OFF],
    'func-call-spacing': [OFF],
    'func-name-matching': [ERROR],
    indent: [OFF],
    'jsx-quotes': [OFF],
    'key-spacing': [OFF],
    'keyword-spacing': [OFF],
    'max-len': [ERROR, 120],
    'max-lines': [
      ERROR,
      {
        max: 300,
        skipBlankLines: true,
        skipComments: true
      }
    ],
    'multiline-ternary': [OFF],
    'newline-per-chained-call': [OFF],
    'new-parens': [OFF],
    'no-lonely-if': [ERROR],
    'no-mixed-spaces-and-tabs': [OFF],
    'no-multiple-empty-lines': [
      ERROR,
      {
        max: 1
      }
    ],
    'no-new-object': [ERROR],
    'no-tabs': [ERROR],
    'no-trailing-spaces': [OFF],
    'no-unneeded-ternary': [ERROR],
    'no-whitespace-before-property': [OFF],
    'nonblock-statement-body-position': [OFF],
    'object-curly-newline': [OFF],
    'object-curly-spacing': [OFF],
    'object-property-newline': [OFF],
    'one-var': [
      ERROR,
      {
        initialized: 'never'
      }
    ],
    'one-var-declaration-per-line': [OFF],
    'operator-linebreak': [OFF],
    'padded-blocks': [OFF],
    'quote-props': [OFF],
    quotes: [
      ERROR,
      'single',
      {
        avoidEscape: true
      }
    ],
    semi: [OFF],
    'semi-spacing': [OFF],
    'semi-style': [OFF],
    'space-before-blocks': [OFF],
    'space-before-function-paren': [OFF],
    'space-in-parens': [OFF],
    'space-infix-ops': [OFF],
    'space-unary-ops': [OFF],
    'spaced-comment': [
      ERROR,
      'always',
      {
        line: {
          markers: ['/'],
          exceptions: ['-', '+', '/', '=']
        },
        block: {
          markers: ['!'],
          exceptions: ['*', '='],
          balanced: true
        }
      }
    ],
    'switch-colon-spacing': [OFF],
    'unicode-bom': [OFF],
    'wrap-regex': [OFF],

    // ECMAScript 6
    'arrow-parens': [OFF],
    'arrow-spacing': [OFF],
    'generator-star-spacing': [OFF],
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
    'rest-spread-spacing': [OFF],
    'template-curly-spacing': [OFF],
    'template-tag-spacing': [OFF],
    'yield-star-spacing': [OFF]
  }
};
