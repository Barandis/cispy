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

import { box, isBox, DEFAULT } from './channel';

// These two handlers are used by channels to track execution of instructions (put, take, and alts). They provide two
// pieces of information: the function to call when a put or take unblocks (because a value sent to put has been taken,
// or a take has accepted a value that has been put) and whether or not the handler is still active.
//
// The function is a callback that actually defines the difference between put/take and putAsync/takeAsync:
// while the unblocked calls use the callback passed to the function, put and take simply continue the process where it
// left off. (This is why put and take only work inside go functions, because otherwise there's no process to continue.)
// The alts instruction always continues the process upon completion; there is no unblocked version of alts.
//
// This function is provided as the return value of the commit method. Calling commit has no extra effect with put and
// take instructions, but for alts, it also marks the handler as no longer being active. This means that only one of
// the operations passed to alts can be completed, because after the first one, the handler is no longer active and
// will not be allowed to process a second operation.
//
// If a put or take (or equivalent alts operation) cannot be immediately completed because there isn't a corresponding
// pending take or put, the handler is queued to be run when a new take or put becomes available.
function opHandler(fn) {
  return {
    fn,
    active: true,

    commit() {
      return this.fn;
    }
  };
}

function altsHandler(active, fn) {
  return {
    a: active,
    fn,

    get active() {
      return this.a.value;
    },

    commit() {
      this.a.value = false;
      return this.fn;
    }
  };
}

// Creates an array of values from 0 to n - 1, shuffled randomly. Used to randomly determine the priority of operations
// in an alts call.
function randomArray(n) {
  const a = [];
  for (let k = 0; k < n; ++k) {
    a.push(k);
  }
  for (let j = n - 1; j > 0; --j) {
    const i = Math.floor(Math.random() * (j + 1));
    const temp = a[j];
    a[j] = a[i];
    a[i] = temp;
  }
  return a;
}

// Processes the operations in an alts function call. This works in the same way as `takeAsync` and `putAsync`
// except that each operation (each of which can be either a put or a take on any channel) is queued in a random order
// onto its channel and only the first to complete returns a value (the other ones become invalidated then and are
// discarded).
//
// The callback receives an object instead of a value. This object has two properties: `value` is the value that was
// returned from the channel, and `channel` is the channel onto which the successful operation was queued.
//
// The `options` parameter is the same as the options parameter in `alts`.
export function altsAsync(ops, callback, options) {
  const count = ops.length;
  if (count === 0) {
    throw Error('Alts called with no operations');
  }

  const priority = !!options.priority;
  const indices = priority ? [] : randomArray(count);

  const active = box(true);

  function createAltsHandler(channel) {
    return altsHandler(active, (value) => {
      callback({ value, channel });
    });
  }

  let result;

  for (let i = 0; i < count; ++i) {
    // Choose an operation randomly (or not randomly if priority is specified)
    const op = ops[priority ? i : indices[i]];
    let channel, value;

    // Put every operation onto its channel, one at a time
    if (Array.isArray(op)) {
      [channel, value] = op;
      result = channel.put(value, createAltsHandler(channel));
    } else {
      channel = op;
      result = channel.take(createAltsHandler(channel));
    }

    // We check for Box here because a box from a channel indicates that the value is immediately available (i.e., that
    // there was no need to block to get the value). If this happens, we can call our callback immediately with that
    // value and channel and stop queueing other operations.
    if (isBox(result)) {
      callback({
        value: result.value,
        channel
      });
      break;
    }
  }

  // If none of the operations immediately returned values (i.e., they all blocked), and we have set a default option,
  // then return the value of the default option rather than waiting for the queued operations to complete.
  if (!isBox(result) && options.hasOwnProperty('default')) {
    if (active.value) {
      active.value = false;
      callback({
        value: options.default,
        channel: DEFAULT
      });
    }
  }
}

// Puts a value onto a channel. When the value is successfully taken off the channel by another process or when
// the channel closes, the callback fires if it exists.
export function putAsync(channel, value, callback) {
  const result = channel.put(value, opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

// Takes a value off a channel. When the value becomes available, it is passed to the callback.
export function takeAsync(channel, callback) {
  const result = channel.take(opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}
