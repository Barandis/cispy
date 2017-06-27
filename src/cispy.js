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
// cispy.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All of the CSP functions are pulled together into this file and exported. The process-related functions (put, take,
// alts, putAsync, takeAsync, raise, sleep) and some others are just passed along, but a number of other
// functions are defined here (go, spawn, chan). All three types of buffers are also supplied, along with the special
// values CLOSED, EMPTY, and DEFAULT.

const { fixed, sliding, dropping, EMPTY } = require('./core/buffers');
const { chan, timeout, close, CLOSED, DEFAULT } = require('./core/channel');
const { putAsync, takeAsync, altsAsync } = require('./core/operations');
const { config, SET_IMMEDIATE, MESSAGE_CHANNEL, SET_TIMEOUT } = require('./core/dispatcher');

const { go, goSafe, spawn, put, take, takeOrThrow, alts, sleep } = require('./generator/operations');

const util = require('./generator/util');

module.exports = {
  go,
  goSafe,
  spawn,
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
  util,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT
};
