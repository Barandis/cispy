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
 * Provides basic channel operations for puts, takes, and alts. These operations are not dependent upon the way channels
 * are accessed; i.e., they are independent of processes, generators, and promises. They require the use of only the
 * channel itself.
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
 * **Completes the first operation among the provided operations that comes available, without blocking.**
 *
 * This means that a call to `altsAsync` does not go into a `yield` expression, and it is not necessary to use it
 * inside a process. Rather than blocking until an operation completes, this one returns immediately and then invokes
 * the callback (if provided) as soon as one of the supplied operations completes. It can be regarded as a
 * non-blocking version of generator-based `{@link module:cispy~Cispy.alts|alts}` or promise-based
 * `{@link module:cispy/promise~CispyPromise.alts|alts}`.
 *
 * This function uses an operations list that's identical to the one used by `{@link module:cispy~alts|alts}`. It's
 * an array of values; if a value is a channel, then that operation is a take on that channel, while if it's a
 * two-element array of channel and value, then that operation is a put of that value onto that channel. All options
 * that are available to `{@link module:cispy~Cispy.alts|alts}` are also available here.
 *
 * The callback is a function of one parameter, which in this case is an object with `value` and `channel` properties.
 *
 * @memberOf module:cispy~Cispy
 * @param {Object[]} operations A collection of elements that correspond to take and put operations. A take operation
 *     is signified by an element that is a channel (which is the channel to be taken from). A put operation is
 *     specified by an element that is itself a two-element array, which has a channel followed by a value (which is
 *     the channel and value to be put).
 * @param {module:cispy~altsCallback} callback A function that gets invoked when one of the operations completes.
 * @param {Object} [options={}] An optional object which can change the behavior of `alts` through two properties.
 * @param {boolean} [options.priority=false] If `true`, then the priority of operations to complete when more than one
 *     is immediately available is a priority according to position within the operations array (earlier positions
 *     have the higher priority). If `false` or not present, the priorty of operation completion is random.
 * @param {*} [options.default] If set and all of the operations initially block, the `alts` call completes
 *     immediately with the value of this option (the channel will be `{@link module:cispy~Cispy.DEFAULT|DEFAULT})`. If
 *     not set, the `alts` call will block until one of the operations completes and that value and channel will be the
 *     ones returned.
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
 * **Puts a value onto a channel without blocking.**
 *
 * This means that a call to `putAsync` does not go into a `yield` expression, and it is not necessary to use it
 * inside a process. Rather than blocking until the put value is taken by another process, this one returns
 * immediately and then invokes the callback (if provided) when the put value is taken. It can be seen as a
 * non-blocking version of generator-based `{@link module:cispy~Cispy.put|put}` or promise-based
 * `{@link module:cispy/promise~CispyPromise.put|put}`.
 *
 * While the primary use of this function is to put values onto channels in contexts where being inside a process is
 * impossible (for example, in a DOM element's event handler), it can still be used inside processes at times when
 * it's important to make sure that the process doesn't block from the put.
 *
 * The callback is a function of one parameter. The parameter that's supplied to the callback is the same as what is
 * supplied to `yield put`: `true` if the value was taken, or `false` if the channel was closed. If the callback isn't
 * present, nothing will happen after the value is taken.
 *
 * @memberOf module:cispy~Cispy
 * @param {module:cispy/core/channel~Channel} channel The channel that the value is being put onto.
 * @param {*} [value] The value being put onto the channel.
 * @param {module:cispy~nbCallback} [callback] A function that gets invoked either when the value is taken by another
 *     process or when the channel is closed. This function can take one parameter, which is `true` in the former case
 *     and `false` in the latter.
 */
function putAsync(channel, value, callback) {
  const result = channel.put(value, opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

/**
 * **Takes a value from a channel without blocking.**
 *
 * This means that a call to `takeAsync` does not go into a `yield` expression, and it is not necessary to use it
 * inside a process. Rather than blocking until a value becomes available on the channel to be taken, this one returns
 * immediately and then invokes the callback (if provided) when a value becomes available. It can be regarded as a
 * non-blocking version of generator-based `{@link module:cispy~Cispy.take|take}` or promise-based
 * `{@link module:cispy/promise~CispyPromise.take|take}`.
 *
 * While the primary use of this function is to take values from channels in contexts where being inside a process is
 * impossible, it can still be used inside processes at times when it's important that the take doesn't block the
 * process.
 *
 * The callback is a function of one parameter, and the value supplied for that parameter is the value taken from the
 * channel (either a value that was put or `{@link module:cispy~Cispy.CLOSED|CLOSED}`). If the callback isn't present,
 * nothing will happen after the value is taken.
 *
 * @function takeAsync
 * @param {module:cispy/core/channel~Channel} channel The channel that a value is being taken from.
 * @param {module:cispy~nbCallback} [callback] A function that gets invoked when a value is made available to be taken
 *     (this value may be `{@link module:cispy~Cispy.CLOSED|CLOSED}` if the channel closes with no available value). The
 *     function can take one parameter, which is the value that is taken from the channel.
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
