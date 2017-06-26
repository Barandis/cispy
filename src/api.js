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
// api.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The entry point for the CSP library. This provides all of the core CSP functions, along with the `util` object that
// has non-core operations that work on channels. (Note that this `util` object is the only place in this library where
// actual ES6 generators are created).
//
// This library provides these functions in a CommonJS format, but if it is run in a non-CommonJS environment, a global
// `cispy` variable is provided.
import * as flow from './generator/operations/flow';
import * as conversion from './generator/operations/conversion';
import * as timing from './generator/operations/timing';

export {
  spawn,
  go,
  goSafe,
  chan,
  close,
  timeout,

  put,
  take,
  takeOrThrow,
  alts,
  sleep,
  putRaw,
  takeRaw,

  promise,
  buffers,
  config,

  EMPTY,
  CLOSED,
  DEFAULT
} from './cispy';

export const ops = Object.assign({}, flow, conversion, timing);
