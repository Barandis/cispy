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

import { fixed, sliding, dropping } from './core/buffers';

import * as gen from './generator/operations';
import * as pro from './promise/operations';

import genUtil from './generator/util';
import proUtil from './promise/util';

export const buffers = { fixed, sliding, dropping };
export const generator = {
  go: gen.go,
  goSafe: gen.goSafe,
  spawn: gen.spawn,
  put: gen.put,
  take: gen.take,
  takeOrThrow: gen.takeOrThrow,
  alts: gen.alts,
  sleep: gen.sleep,
  util: genUtil
};
export const promise = {
  put: pro.put,
  take: pro.take,
  takeOrThrow: pro.takeOrThrow,
  alts: pro.alts,
  sleep: pro.sleep,
  util: proUtil
};

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

export { EMPTY } from './core/buffers';
export { config } from './core/options';
