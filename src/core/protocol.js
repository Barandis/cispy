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

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// protocol.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Protocols for iteration and reduction. The source for these protocols depends on which protocol it is.
//
// Iteration: a part of the ES6 standard.
// Transduction: agreed to by several parties who maintain transducer libraries in the comment thread for an issue on
//     one of them (https://github.com/cognitect-labs/transducers-js/issues/20).

const USE_SYMBOLS = false;
const symbol = typeof Symbol !== 'undefined';

// Generation of the key used on an object to store a protocol function. This is a symbol if symbols are available and
// USE_SYMBOLS (above) is set to true; if not, it's a regular string. If a symbol of the supplied name already exists,
// it'll be used instead of having a new one generated.
function generateKey(name) {
  return USE_SYMBOLS && symbol ? Symbol.for(name) : `@@${name}`;
}

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
