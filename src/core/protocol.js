/*
 * Copyright (c) 2017 Thomas Otterson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * Protocols for iteration and reduction. The source for these protocols depends on which protocol it is.
 *
 * * **Iteration:** a part of the ES6 standard.
 * * **Transduction:** agreed to by several parties who maintain transducer libraries in the
 *   [comment thread](https://github.com/cognitect-labs/transducers-js/issues/20) for an issue on one of them.
 *
 * @mocule cispy/core/protocol
 * @private
 */

/**
 * Determines whether Symbols should be used as the names of properties related to the protocol, assuming Symbols are
 * available in the environment.
 *
 * **This is FALSE temporarily.** My own transducer library is using non-Symbols. I intend to change that...we're into
 * ES7 now, so it seems like using ES6 features should be reasonable. When it changes in that library, it'll also
 * change here.
 *
 * @type {boolean}
 * @private
 */
const USE_SYMBOLS = false;

/**
 * Whether or not to use Symbols. This is based on the value of
 * {@link module:cispy/core/protocol~USE_SYMBOLS|USE_SYMBOLS} *and* on whether Symbols are available in the environment.
 * If Symbols are unavailable, it doesn't matter what `USE_SYMBOLS` is set to, Symbols will not be used.
 *
 * @type {boolean}
 * @private
 */
const symbol = typeof Symbol !== 'undefined';

/**
 * Generation of the key used on an object to store a protocol function. This is a Symbol if Symbols are available and
 * {@link module:cispy/core/protocol~USE_SYMBOLS|USE_SYMBOLS} is set to true; if not, it's a regular string. If a Symbol
 * of the supplied name already exists, it'll be used instead of having a new one generated.
 *
 * @param {string} name The name of the protocol function to generate a key for.
 * @return {(string|Symbol)} The key to be used to store protocol values on objects. This is a Symbol if Symbols are
 *     specified and exist in the environment; otherwise it is a string.
 * @private
 */
function generateKey(name) {
  return USE_SYMBOLS && symbol ? Symbol.for(name) : `@@${name}`;
}

/**
 * A mapping of easy-to-use names for protocol properties and the actual name of the property as it's stored on objects.
 * This is merely for convenience, particularly since it's possible to use this library with Symbols or without,
 * depending on environment.
 *
 * @type {Object}
 * @private
 */
const protocols = {
  // Since this one is built in, it already has a custom Symbol property, so we don't need to generate a symbol for a
  // key when symbols are supported.
  iterator: symbol ? Symbol.iterator : '@@iterator',

  // Reduction protocols
  init: generateKey('transducer/init'),
  step: generateKey('transducer/step'),
  result: generateKey('transducer/result'),
  reduced: generateKey('transducer/reduced'),
  value: generateKey('transducer/value')
};

module.exports = { protocols };
