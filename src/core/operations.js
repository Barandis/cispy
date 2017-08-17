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
 * Provides basic channel operations for puts, takes, and alts.
 *
 * @module cispy/core/operations
 * @private
 */

const { box, isBox, DEFAULT } = require('./channel');

/**
 * These two handlers are used by channels to track execution of instructions (put, take, and alts). They provide two
 * pieces of information: the function to call when a put or take unblocks (because a value sent to put has been taken,
 * or a take has accepted a value that has been put) and whether or not the handler is still active.
 *
 * The function is a callback that actually defines the difference between put/take and putAsync/takeAsync:
 * while the unblocked calls use the callback passed to the function, put and take simply continue the process where it
 * left off. (This is why put and take only work inside go functions, because otherwise there's no process to continue.)
 * The alts instruction always continues the process upon completion; there is no unblocked version of alts.
 *
 * This function is provided as the return value of the commit method. Calling commit has no extra effect with put and
 * take instructions, but for alts, it also marks the handler as no longer being active. This means that only one of
 * the operations passed to alts can be completed, because after the first one, the handler is no longer active and
 * will not be allowed to process a second operation.
 *
 * If a put or take (or equivalent alts operation) cannot be immediately completed because there isn't a corresponding
 * pending take or put, the handler is queued to be run when a new take or put becomes available.
 *
 * @typedef Handler
 * @property {boolean} active Whether or not the operation is still active. An inactive operation is not serviced and
 *     will be cleared from the queue on the next dirty operation purge.
 * @property {function} commit Marks the handler as inactive (so it doesn't run twice) and returns the callback to be
 *     run when the operation completes.
 * @private
 */

/**
 * A callback function run when a put or take operation completes.
 *
 * @callback HandlerCallback
 * @param {*} value The value provided by the channel. In a take, this is the value taken from the channel. In a put,
 *     this is `true` for a successful put and `false` if the channel is closed before the put can complete.
 * @private
 */

/**
 * Creates a new handler used for put and take operations. This handler is always active, as there will never be a time
 * when it's in the queue but already handled.
 *
 * @param {module:cispy/core/operations~HandlerCallback} fn The callback to be run when the put or take operation
 *     completes.
 * @return {module:cispy/core/operations~Handler} The new handler.
 */
function opHandler(fn) {
  return {
    get active() {
      return true;
    },

    commit() {
      return fn;
    }
  };
}

/**
 * Creates a new handler used for alts operations.
 *
 * @param {module:cispy/core/channel~Box} active A boxed value indicating whether the handler is valid. This is a boxed
 *     value because the alts-handling code needs to manipulate it directly; this could probably be improved.
 * @param {module:cispy/core/operations~HandlerCallback} fn The callback to be run when (and if) the operation
 *     completes.
 * @return {module:cispy/core/operations~Handler} The new handler.
 */
function altsHandler(active, fn) {
  return {
    get active() {
      return active.value;
    },

    commit() {
      active.value = false;
      return fn;
    }
  };
}

/**
 * Creates an array of values from 0 to n - 1, shuffled randomly. Used to randomly determine the priority of operations
 * in an alts operation.
 *
 * @param  {number} n The upper (exclusive) bound for the random numbers. This ends up also being the length of the
 *     resulting array.
 * @return {number[]} An array of numbers from 0 to n - 1, arranged randomly.
 * @private
 */
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

/**
 * A callback invoked by {@link module:cispy/core/operastions~altsAsync} when an operation completes.
 *
 * @callback altsCallback
 * @param {*} obj.value The value returned from the channel. For a take, this is the value taken from the channel. For a
 *     put, it's `true` if the put was successful or `false` if the channel was closed before the put completed.
 * @param {module:cispy/core/channel~Channel} obj.channel The channel upon which the completed operation acted.
 * @private
 */

/**
 * Processes the operations in an alts function call. This works in the same way as `takeAsync` and `putAsync`
 * except that each operation (each of which can be either a put or a take on any channel) is queued in a random order
 * onto its channel and only the first to complete returns a value (the other ones become invalidated then and are
 * discarded).
 *
 * The callback receives an object instead of a value. This object has two properties: `value` is the value that was
 * returned from the channel, and `channel` is the channel onto which the successful operation was queued.
 *
 * The `options` parameter is the same as the options parameter in `alts`.
 *
 * @param {(module:cispy/core/channel~Channel|[])[]} ops The operations governed by the alts operation. The first of
 *     these to complete is successful; the rest are discarded. Each element of the array represents an operation. If
 *     the element is a channel, then it's a take operation on that channel. If the element is a two-element array of
 *     channel and value, then it's a put operation putting that value on that channel.
 * @param {module:cispy/core/operations~altsCallback} callback A function called when one of the operations completes.
 * @param {boolean} [options.priority=false] Indicates the priority given to listed operations. If this is `true`, then
 *     operations listed first in the array have priority over those listed later, if multiple operations will complete
 *     immediately without blocking. If this is `false`, then the priority is random.
 * @param {*} [options.default] The value to return from this call if all operations block. This behavior *only* happens
 *     if this option is present; otherwise, the call blocks until an operation completes. If this *is* present, the
 *     channel provided to the callback is {@link module:cispy~DEFAULT|DEFAULT}.
 * @private
 */
function altsAsync(ops, callback, options) {
  const count = ops.length;
  if (count === 0) {
    throw Error('Alts called with no operations');
  }

  const priority = !!options.priority;
  const indices = priority ? [] : randomArray(count);

  const active = box(true);

  function createAltsHandler(channel) {
    return altsHandler(active, value => {
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

/**
 * A function called when a put or a take completes.
 *
 * @callback opCallback
 * @param {*} value The value that comes from the operation call. If it's a take, this is the value taken from the
 *     channel. If it's a put, this is `true` if the put succeeded or `false` if the channel closed.
 * @private
 */

/**
 * Puts a value onto a channel. When the value is successfully taken off the channel by another process or when
 * the channel closes, the callback fires if it exists.
 *
 * @param {module:cispy/core/channel~Channel} channel The channel onto which a value is being put.
 * @param {*} value The value being put onto the channel.
 * @param {module:cispy/core/operations~opCallback} [callback] The function called when the put completes.
 * @private
 */
function putAsync(channel, value, callback) {
  const result = channel.put(value, opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

/**
 * Takes a value off a channel. When the value becomes available, it is passed to the callback.
 *
 * @param  {module:cispy/core/channel~Channel} channel The channel from which a value is being taken.
 * @param  {module:cispy/core/operations~opCallback} [callback] The function called when the take completes.
 */
function takeAsync(channel, callback) {
  const result = channel.take(opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

module.exports = {
  altsAsync,
  putAsync,
  takeAsync
};
