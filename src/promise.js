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
 * All of the external, promise-based CSP functions are gathered here and exported as a whole. This includes core CSP
 * functions for channels, but it also includes buffers, special values, and utility functions.
 *
 * Most of the promise-based implementation is shared with the generator-based implementation. The only things that
 * are different are:
 *
 * - There is no `go`, `goSafe`, or `spawn` since there is no need to create processes (async functions are used
 *   instead)
 * - Channel operations return promises rather than internal control objects, meaning they can be used in `await`
 *   expressions instead of `yield` expressions (the `xAsync` versions of each operation remain the same)
 * - The utility functions use the promise-based implementation.
 *
 * @module cispy/promise
 */

const { fixed, sliding, dropping, EMPTY } = require('./core/buffers');
const { chan, timeout, close, CLOSED, DEFAULT } = require('./core/channel');
const { putAsync, takeAsync, altsAsync } = require('./core/operations');
const { config, SET_IMMEDIATE, MESSAGE_CHANNEL, SET_TIMEOUT } = require('./core/dispatcher');

const { put, take, takeOrThrow, alts, sleep } = require('./promise/operations');

const util = require('./promise/util');

/**
 * The core namespace under which all of the main promise-based functions reside in the API. This includes **only** the
 * blocking channel functions and utility functions. All other functions included in this library are the same as the
 * ones in the generator-based library. They are listed here for convenience.
 *
 * - `{@link module:cispy~Cispy.chan|chan}`
 * - `{@link module:cispy~Cispy.timeout|timeout}`
 * - `{@link module:cispy~Cispy.close|close}`
 * - `{@link module:cispy~Cispy.putAsync|putAsync}`
 * - `{@link module:cispy~Cispy.takeAsync|takeAsync}`
 * - `{@link module:cispy~Cispy.altsAsync|altsAsync}`
 * - `{@link module:cispy~Cispy.config|config}`
 * - `{@link module:cispy~Cispy.fixedBuffer|fixedBuffer}`
 * - `{@link module:cispy~Cispy.slidingBuffer|slidingBuffer}`
 * - `{@link module:cispy~Cispy.droppingBuffer|droppingBuffer}`
 * - `{@link module:cispy~Cispy.CLOSED|CLOSED}`
 * - `{@link module:cispy~Cispy.DEFAULT|DEFAULT}`
 * - `{@link module:cispy~Cispy.EMPTY|EMPTY}`
 * - `{@link module:cispy~Cispy.SET_IMMEDIATE|SET_IMMEDIATE}`
 * - `{@link module:cispy~Cispy.MESSAGE_CHANNEL|MESSAGE_CHANNEL}`
 * - `{@link module:cispy~Cispy.SET_TIMEOUT|SET_TIMEOUT}`
 *
 * @namespace CispyPromise
 */

module.exports = {
  put,
  take,
  takeOrThrow,
  alts,
  sleep,
  chan,
  timeout,
  close,
  putAsync,
  takeAsync,
  altsAsync,
  config,
  fixedBuffer: fixed,
  slidingBuffer: sliding,
  droppingBuffer: dropping,
  CLOSED,
  DEFAULT,
  EMPTY,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT,

  /**
   * **A set of utility functions for working with channels.**
   *
   * This is a small 'standard library' of promise-based operations that are useful when working with channels.
   *
   * @type {module:cispy/promise/util~CispyPromiseUtil}
   * @memberOf module:cispy/promise~CispyPromise
   */
  util
};
