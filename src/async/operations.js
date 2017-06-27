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
// operations.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Operators that can be used on channels. These include out-of-process puts and takes as well as promise-returning
// operations. It does NOT include the operations that must happen within a process, as those are tied tightly to the
// process itself (they return special values that the process can read but are meaningless elsewhere). Those operations
// are in process.js.

import { chan } from '../core/channel';
import { putUnblocked, takeUnblocked, processAlts } from '../core/operations';

// Puts the value onto the specified channel. A promise is returned which will resolve to `true` once a taker is
// available to take the put value or `false` if the channel closes before such a taker becomes available. If there are
// multiple puts (or put operations from `alts`) queued on the channel and waiting, they will be processed in order as
// take requests happen.
export function put(channel, value) {
  return new Promise((resolve) => {
    putUnblocked(channel, value, resolve);
  });
}

// Takes a value from a channel. This returns a promise that resolves as soon as another process puts a value onto the
// channel to be taken, or when the channel closes. The promise resolves to the value that was put, or to `CLOSED` if
// the channel is/was closed.
export function take(channel) {
  return new Promise((resolve) => {
    takeUnblocked(channel, resolve);
  });
}

// Takes a value from a channel. This works exactly like `take`, except that if the value that is taken from the channel
// is an error object, the returned promise is rejected with that error.
export function takeOrThrow(channel) {
  return new Promise((resolve, reject) => {
    takeUnblocked(channel, (result) => {
      if (Error.prototype.isPrototypeOf(result)) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

// Processes an arbitrary number of puts and takes (represented by the operations array). When the first operation
// successfully completes, the rest are discarded.
//
// Each element of the operations array is one operation. If that element is a channel, then the operation is a take on
// that channel. If the element is a two-element array, the operation is a put operation. These operations are queued
// on their respective channels in a random order. In this case, the first element of the sub-array should be the
// channel to put on, and the second value the value to put on that channel.
//
// This function returns a promise that resolves when the first operation is completed.
//
// Operations are processed in a random order. The first one to come back without blocking, or if they all block, the
// first one to come unblocked, will be the operation that is run. Other operations will be discarded. The successful
// operation will resolve the returned promise into an object. This object has two properties: `value` is the return
// value of the operation (the same as the return value for either a put or a take), and `channel` is the channel on
// which the operation was executed. This way the process has the ability to know which channel was used to provide the
// value.
//
// This function takes an optional object that provides options to the execution. There are two legal options:
// `priority` causes the operations to be queued in the order of the operations array, rather than randomly; `default`
// causes its value to become the return value (with a channel of DEFAULT) if all operations block before completing.
// In this case all of the operations are discarded.
export function alts(ops, options = {}) {
  return new Promise((resolve) => {
    processAlts(ops, resolve, options);
  });
}

// Returns a promise that resolves after a certain amount of time has passed. This is done by creating a local channel
// that isn't exposed to the outside and setting it to close after the required delay. The process then resolves because
// the channel closes. Since the channel is private, there's no way to prematurely resolve the promise.
//
// If no delay is passed, or if that delay is 0, then a new channel won't be created. Instead, the promise will simply
// resolve. This allows an async function to relinquish its control and cause itself to be immediately queued back up to
// be run after all of the other waiting functions (and the event loop) have a chance to run.
export function sleep(delay = 0) {
  return new Promise((resolve) => {
    if (delay === 0) {
      setTimeout(resolve, 0);
    } else {
      const ch = chan();
      setTimeout(() => ch.close(), delay);
      takeUnblocked(ch, resolve);
    }
  });
}
