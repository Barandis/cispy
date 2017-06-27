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
// core.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All of the CSP functions are pulled together into this file and exported. The process-related functions (put, take,
// alts, putAsync, takeAsync, raise, sleep) and some others are just passed along, but a number of other
// functions are defined here (go, spawn, chan). All three types of buffers are also supplied, along with the special
// values CLOSED, EMPTY, and DEFAULT.

import * as buffers from './core/buffers';
import * as channel from './core/channel';
import * as process from './generator/process';
import * as operations from './async/operations';
import { putAsync } from './core/operations';

// Creates a process from a generator (not a generator function) and runs it. The process is then left to its own
// devices until it returns. This function creates and returns a channel, though that channel can only ever have one
// value: the return value of the generator (the channel closes after this value is taken).
//
// If a second argument is passed and it's a function, then that function will be called when an exception is thrown
// within the process code itself. The handler receives the error object as an argument.
//
// Since this requires a generator and not a generator function, it isn't used nearly as much as `go`.
export function spawn(gen, exh) {
  const ch = channel.chan(buffers.fixed(1));
  process.process(gen, exh, (value) => {
    if (value === channel.CLOSED) {
      ch.close();
    } else {
      putAsync(ch, value, () => ch.close());
    }
  }).run();
  return ch;
}

// Creates a process from a generator function (not a generator) and runs it. What this really does is create a
// generator from the generator function and its optional arguments, and then pass that off to `spawn`. But since
// generator functions have a literal form (`function* ()`) while generators themselves do not, this is going to be the
// much more commonly used function of the two.
export function go(fn, ...args) {
  return spawn(fn(...args));
}

// Creates a process from a generator function just like `go`, except this one also accepts an exception handling
// function. This function is called any time an error is caught within the process itself. It receives the error object
// as an argument. The process is then considered finished, and the value placed into its return channel is the value
// returned from the exception handler.
export function goSafe(fn, exh, ...args) {
  return spawn(fn(...args), exh);
}

const b = {
  fixed: buffers.fixed,
  dropping: buffers.dropping,
  sliding: buffers.sliding
};
export { b as buffers };

export {
  chan,
  timeout,
  close,
  CLOSED,
  DEFAULT
} from './core/channel';

export {
  putAsync,
  takeAsync,
  altsAsync
} from './core/operations';

export {
  put,
  take,
  takeOrThrow,
  alts,
  sleep
} from './generator/process';

export const promise = {
  put: operations.put,
  take: operations.take,
  takeOrThrow: operations.takeOrThrow,
  alts: operations.alts,
  sleep: operations.sleep
};

export { EMPTY } from './core/buffers';
export { config } from './core/options';
