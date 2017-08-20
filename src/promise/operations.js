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
 * Core operations for channels working with async functions.
 *
 * @module cispy/promise/operations
 * @private
 */

const { chan } = require('../core/channel');
const { putAsync, takeAsync, altsAsync } = require('../core/operations');

/**
 * **Puts a value onto a channel, blocking the process until that value is taken from the channel by a different
 * process (or until the channel closes).**
 *
 * A value is always put onto the channel, but if that value isn't specified by the second parameter, it is
 * `undefined`. Any value may be put on a channel, with the sole exception of the special value
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
 *
 * This function *must* be called from within an `async` function and as part of an `await` expression.
 *
 * When `put` is completed and its process unblocks, its `await` expression evaluates to a status boolean that
 * indicates what caused the process to unblock. That value is `true` if the put value was successfully taken by
 * another process, or `false` if the unblocking happened because the target channel closed.
 *
 * @memberOf module:cispy/promise~CispyPromise
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is putting a value onto.
 * @param {*} [value] The value being put onto the channel.
 * @return {Promise} A promise that will resolve to `true` or `false` depending on whether the put value is actually
 *     taken.
 */
function put(channel, value) {
  return new Promise(resolve => {
    putAsync(channel, value, resolve);
  });
}

/**
 * **Takes a value from a channel, blocking the process until a value becomes available to be taken (or until the
 * channel closes with no more values on it to be taken).**
 *
 * This function *must* be called from within an `async` function and as part of an `await` expression.
 *
 * When `take` is completed and its process unblocks, its `await` expression evaluates to the actual value that was
 * taken. If the target channel closed, then all of the values already placed onto it are resolved by `take` as
 * normal, and once no more values are available, the special value `{@link module:cispy~Cispy.CLOSED|CLOSED}` is
 * returned.
 *
 * @memberOf module:cispy/promise~CispyPromise
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is taking a value from.
 * @return {Promise} A promise that will resolve to the value taken from the channel once that take is completed. If the
 *     channel closes without a value being made available, this will resolve to
 *     `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
 */
function take(channel) {
  return new Promise(resolve => {
    takeAsync(channel, resolve);
  });
}

/**
 * **Takes a value from a channel, blocking the process until a value becomes available to be taken (or until the
 * channel closes with no more values on it to be taken). If the taken value is an error object, that error is thrown
 * at that point.**
 *
 * This function *must* be called from within an `async` function and as part of an `await` expression.
 *
 * It functions in every way like `{@link module:cispy/promise~CispyPromise.take|take}` *except* in the case that the
 * value on the channel is an object that has `Error.prototype` in its prototype chain (any built-in error, any
 * properly-constructed custom error). If that happens, the error is thrown, which will cause the returned promise to be
 * rejected with the error. It can then be handled up the promise chain like any other rejected promise.
 *
 * `takeOrThrow` is roughly equivalent to:
 *
 * ```
 * const value = await take(ch);
 * if (Error.prototype.isPrototypeOf(value)) {
 *   throw value;
 * }
 * ```
 *
 * @memberOf module:cispy/promise~CispyPromise
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is taking a value from.
 * @return {Promise} A promise that will resolve to the value taken from the channel once that take is completed. If the
 *     channel closes without a value being made available, this will resolve to
 *     `{@link module:cispy~Cispy.CLOSED|CLOSED}`. If the taken value is an error, the promise will instead be rejected
 *     with the error object as the reason.
 */
function takeOrThrow(channel) {
  return new Promise((resolve, reject) => {
    takeAsync(channel, result => {
      if (Error.prototype.isPrototypeOf(result)) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * **Completes the first operation among the provided operations that comes available, blocking the process until
 * then.**
 *
 * `operations` is an array whose elements must be channels or two-element sub-arrays of channels and values, in any
 * combination. An operation that is a channel is a take operation on that channel. An operation that is a two-element
 * array is a put operation on that channel using that value. Exactly one of these operations will complete, and it
 * will be the first operation that unblocks.
 *
 * This function *must* be called from within an `async` function and as part of an `await` expression.
 *
 * When `alts` is completed and its process unblocks, its `await` expression evaluates to an object of two properties.
 * The `value` property becomes exactly what would have been returned by the equivalent `await put` or `await take`
 * operation: a boolean in the case of a put, or the taken value in the case of a take. The `channel` property is set
 * to the channel where the operation actually took place. This will be equivalent to the channel in the `operations`
 * array which completed first, allowing the process to unblock.
 *
 * If there is more than one operation already available to complete when the call to `alts` is made, the operation
 * with the highest priority will be the one to complete. Regularly, priority is non-deterministic (i.e., it's set
 * randomly). However, if the options object has a `priority` value set to `true`, priority will be assigned in the
 * order of the operations in the supplied array.
 *
 * If all of the operations must block (i.e., there are no pending puts for take operations, or takes for put
 * operations), a default value may be returned. This is only done if there is a `default` property in the options
 * object, and the value of that property becomes the value returned by `yield alts`. The channel is set to the
 * special value `{@link module:cispy~Cispy.DEFAULT|DEFAULT}`.
 *
 * @memberOf module:cispy~Cispy
 * @param {Array} operations A collection of elements that correspond to take and put operations. A take operation
 *     is signified by an element that is a channel (which is the channel to be taken from). A put operation is
 *     specified by an element that is itself a two-element array, which has a channel followed by a value (which is
 *     the channel and value to be put).
 * @param {Object} [options={}] An optional object which can change the behavior of `alts` through two properties.
 * @param {boolean} [options.priority=false] If `true`, then the priority of operations to complete when more than one
 *     is immediately available is a priority according to position within the operations array (earlier positions
 *     have the higher priority). If `false` or not present, the priorty of operation completion is random.
 * @param {*} [options.default] If set and all of the operations initially block, the `alts` call completes
 *     immediately with the value of this option (the channel will be `{@link module:cispy~Cispy.DEFAULT|DEFAULT})`. If
 *     not set, the `alts` call will block until one of the operations completes and that value and channel will be the
 *     ones returned.
 * @return {Promise} A promise that will resolve to an object of two properties: `value` will contain the value that
 *     would have been returned by the corresponding `{@link module:cispy/promise~CispyPromise.put|put}` or
 *     `{@link module:cispy/promise~CispyPromise.take|take}` operation; and `channel` will be a reference to the channel
 *     that completed the operation to allow `alts` to unblock.
 */
function alts(ops, options = {}) {
  return new Promise(resolve => {
    altsAsync(ops, resolve, options);
  });
}

/**
 * **Blocks the process for the specified time (in milliseconds) and then unblocks it.**
 *
 * This implements a delay, but one that's superior to other kinds of delays (`setTimeout`, etc.) because it blocks
 * the process and allows the dispatcher to allow other processes to run while this one waits. If the delay is set to
 * `0` or is missing altogether, the process will relinquish control to the next process in the queue and immediately
 * reschedule itself to be continued, rather than blocking.
 *
 * This function *must* be called from within an `async` function and as part of an `await` expression.
 *
 * When this function completes and its process unblocks, the `await` expression doesn't take on any meaningful value.
 * The purpose of this function is simply to delay, not to communicate any data.
 *
 * @memberOf module:cispy/promise~CispyPromise
 * @param {number} [delay=0] the number of milliseconds that the process will block for. At the end of that time, the
 *     process is again eligible to be run by the dispatcher again. If this is missing or set to `0`, the process
 *     will cede execution to the next one but immediately requeue itself to be run again.
 * @return {Promise} A promise that resolves with no meaningful result when the time has elapsed.
 */
function sleep(delay = 0) {
  return new Promise(resolve => {
    if (delay === 0) {
      setTimeout(resolve, 0);
    } else {
      const ch = chan();
      setTimeout(() => ch.close(), delay);
      takeAsync(ch, resolve);
    }
  });
}

/**
 * **Invokes an async function acting as a process.**
 *
 * This is purely a convenience function, driven by the fact that it's necessary to use an IIFE to invoke an inline
 * async function, and that's not very aesthetically pleasing. It does no more than invoke the passed function, but that
 * at least releases us from the need to put the empty parentheses after the function definition.
 *
 * @memberOf module:cispy/promise~CispyPromise
 * @param {function} fn The async function being used as a process.
 * @param {...*} args Arguments that are sent to the async function when it's invoked.
 * @return {Promise} The promise returned by the async function.
 */
function go(fn, ...args) {
  return fn(...args);
}

module.exports = {
  put,
  take,
  takeOrThrow,
  alts,
  sleep,
  go
};
