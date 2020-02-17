/*
 * Copyright (c) 2017-2020 Thomas Otterson
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Provides basic channel operations for puts, takes, and alts. These operations
 * are not dependent upon the way channels are accessed; i.e., they are
 * independent of processes, generators, and promises. They require the use of
 * only the channel itself.
 *
 * @module cispy/ops
 * @private
 */

import { box, isBox, chan, DEFAULT } from "./channel";

/**
 * These two handlers are used by channels to track execution of instructions
 * (put, take, and alts). They provide two pieces of information: the function
 * to call when a put or take unblocks (because a value sent to put has been
 * taken, or a take has accepted a value that has been put) and whether or not
 * the handler is still active.
 *
 * The function is a callback that actually defines the difference between
 * put/take and putAsync/takeAsync: while the unblocked calls use the callback
 * passed to the function, put and take simply continue the process where it
 * left off. (This is why put and take only work inside go functions, because
 * otherwise there's no process to continue.) The alts instruction always
 * continues the process upon completion; there is no unblocked version of alts.
 *
 * This function is provided as the return value of the commit method. Calling
 * commit has no extra effect with put and take instructions, but for alts, it
 * also marks the handler as no longer being active. This means that only one of
 * the operations passed to alts can be completed, because after the first one,
 * the handler is no longer active and will not be allowed to process a second
 * operation.
 *
 * If a put or take (or equivalent alts operation) cannot be immediately
 * completed because there isn't a corresponding pending take or put, the
 * handler is queued to be run when a new take or put becomes available.
 *
 * @typedef Handler
 * @property {boolean} active Whether or not the operation is still active. An
 *     inactive operation is not serviced and will be cleared from the queue on
 *     the next dirty operation purge.
 * @property {function} commit Marks the handler as inactive (so it doesn't run
 *     twice) and returns the callback to be run when the operation completes.
 * @private
 */

/**
 * A callback function run when a put or take operation completes.
 *
 * @callback HandlerCallback
 * @param {*} value The value provided by the channel. In a take, this is the
 *     value taken from the channel. In a put, this is `true` for a successful
 *     put and `false` if the channel is closed before the put can complete.
 * @private
 */

/**
 * Creates a new handler used for alts operations.
 *
 * @param {module:cispy/channel~Box} active A boxed value indicating whether the
 *     handler is valid. This is a boxed value because the alts-handling code
 *     needs to manipulate it directly; this could probably be improved.
 * @param {module:cispy/ops~HandlerCallback} fn The callback to be run when (and
 *     if) the operation completes.
 * @return {module:cispy/ops~Handler} The new handler.
 */
function altsHandler(active, fn) {
  return {
    get active() {
      return active.value;
    },

    commit() {
      active.value = false;
      return fn;
    },
  };
}

/**
 * Creates an array of values from 0 to n - 1, shuffled randomly. Used to
 * randomly determine the priority of operations in an alts operation.
 *
 * @param  {number} n The upper (exclusive) bound for the random numbers. This
 *     ends up also being the length of the resulting array.
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
 * **Completes the first operation among the provided operations that comes
 * available, without blocking.**
 *
 * This means that a call to `altsAsync` does not go into an `await` expression,
 * and it is not necessary to use it inside a process. Rather than blocking
 * until an operation completes, this one returns immediately and then invokes
 * the callback (if provided) as soon as one of the supplied operations
 * completes. It can be regarded as a non-blocking version of
 * `{@link module:cispy~Cispy.alts|alts}`.
 *
 * This function uses an operations list that's identical to the one used by
 * `{@link module:cispy~Cispy.alts|alts}`. It's an array of values; if a value
 * is a channel, then that operation is a take on that channel, while if it's a
 * two-element array of channel and value, then that operation is a put of that
 * value onto that channel. All options that are available to
 * `{@link module:cispy~Cispy.alts|alts}` are also available here.
 *
 * The callback is a function of one parameter, which in this case is an object
 * with `value` and `channel` properties.
 *
 * @memberOf module:cispy~Cispy
 * @param {Object[]} operations A collection of elements that correspond to take
 *     and put operations. A take operation is signified by an element that is a
 *     channel (which is the channel to be taken from). A put operation is
 *     specified by an element that is itself a two-element array, which has a
 *     channel followed by a value (which is the channel and value to be put).
 * @param {module:cispy~altsCallback} callback A function that gets invoked when
 * one of the operations completes.
 * @param {Object} [options={}] An optional object which can change the behavior
 * of `alts` through two properties.
 * @param {boolean} [options.priority=false] If `true`, then the priority of
 *     operations to complete when more than one is immediately available is a
 *     priority according to position within the operations array (earlier
 *     positions have the higher priority). If `false` or not present, the
 *     priorty of operation completion is random.
 * @param {*} [options.default] If set and all of the operations initially
 *     block, the `alts` call completes immediately with the value of this
 *     option (the channel will be
 *     `{@link module:cispy~Cispy.DEFAULT|DEFAULT})`. If not set, the `alts`
 *     call will block until one of the operations completes and that value and
 *     channel will be the ones returned.
 */
export function altsAsync(ops, callback, options = {}) {
  const count = ops.length;
  if (count === 0) {
    throw Error("Alts called with no operations");
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
      result = channel.handlePut(value, createAltsHandler(channel));
    } else {
      channel = op;
      result = channel.handleTake(createAltsHandler(channel));
    }

    // We check for Box here because a box from a channel indicates that the
    // value is immediately available (i.e., that there was no need to block to
    // get the value). If this happens, we can call our callback immediately
    // with that value and channel and stop queueing other operations.
    if (isBox(result)) {
      callback({
        value: result.value,
        channel,
      });
      break;
    }
  }

  // If none of the operations immediately returned values (i.e., they all
  // blocked), and we have set a default option, then return the value of the
  // default option rather than waiting for the queued operations to complete.
  if (
    !isBox(result) &&
    Object.prototype.hasOwnProperty.call(options, "default")
  ) {
    if (active.value) {
      active.value = false;
      callback({
        value: options.default,
        channel: DEFAULT,
      });
    }
  }
}

/**
 * **Completes the first operation among the provided operations that comes
 * available, blocking the process until then.**
 *
 * `operations` is an array whose elements must be channels or two-element
 * sub-arrays of channels and values, in any combination. An operation that is a
 * channel is a take operation on that channel. An operation that is a
 * two-element array is a put operation on that channel using that value.
 * Exactly one of these operations will complete, and it will be the first
 * operation that unblocks.
 *
 * This function *must* be called from within an `async` function and as part of
 * an `await` expression.
 *
 * When `alts` is completed and its process unblocks, its `await` expression
 * evaluates to an object of two properties. The `value` property becomes
 * exactly what would have been returned by the equivalent `await put` or `await
 * take` operation: a boolean in the case of a put, or the taken value in the
 * case of a take. The `channel` property is set to the channel where the
 * operation actually took place. This will be equivalent to the channel in the
 * `operations` array which completed first, allowing the process to unblock.
 *
 * If there is more than one operation already available to complete when the
 * call to `alts` is made, the operation with the highest priority will be the
 * one to complete. Regularly, priority is non-deterministic (i.e., it's set
 * randomly). However, if the options object has a `priority` value set to
 * `true`, priority will be assigned in the order of the operations in the
 * supplied array.
 *
 * If all of the operations must block (i.e., there are no pending puts for take
 * operations, or takes for put operations), a default value may be returned.
 * This is only done if there is a `default` property in the options object, and
 * the value of that property becomes the value returned by `await alts`. The
 * channel is set to the special value
 * `{@link module:cispy~Cispy.DEFAULT|DEFAULT}`.
 *
 * @memberOf module:cispy~Cispy
 * @param {Array} operations A collection of elements that correspond to take
 *     and put operations. A take operation is signified by an element that is a
 *     channel (which is the channel to be taken from). A put operation is
 *     specified by an element that is itself a two-element array, which has a
 *     channel followed by a value (which is the channel and value to be put).
 * @param {Object} [options={}] An optional object which can change the behavior
 * of `alts` through two properties.
 * @param {boolean} [options.priority=false] If `true`, then the priority of
 *     operations to complete when more than one is immediately available is a
 *     priority according to position within the operations array (earlier
 *     positions have the higher priority). If `false` or not present, the
 *     priorty of operation completion is random.
 * @param {*} [options.default] If set and all of the operations initially
 *     block, the `alts` call completes immediately with the value of this
 *     option (the channel will be
 *     `{@link module:cispy~Cispy.DEFAULT|DEFAULT})`. If not set, the `alts`
 *     call will block until one of the operations completes and that value and
 *     channel will be the ones returned.
 * @return {Promise} A promise that will resolve to an object of two properties:
 *     `value` will contain the value that would have been returned by the
 *     corresponding `{@link module:cispy~Cispy.put|put}` or
 *     `{@link module:cispy~Cispy.take|take}` operation; and `channel` will be a
 *     reference to the channel that completed the operation to allow `alts` to
 *     unblock.
 */
export function alts(ops, options = {}) {
  return new Promise(resolve => {
    altsAsync(ops, resolve, options);
  });
}

/**
 * **Blocks the process for the specified time (in milliseconds) and then
 * unblocks it.**
 *
 * This implements a delay, but one that's superior to other kinds of delays
 * (`setTimeout`, etc.) because it blocks the process and allows the dispatcher
 * to allow other processes to run while this one waits. The default delay is 0,
 * which will release the process to allow others to run and then immediately
 * re-queue it.
 *
 * This function *must* be called from within an `async` function and as part of
 * an `await` expression.
 *
 * When this function completes and its process unblocks, the `await` expression
 * doesn't take on any meaningful value. The purpose of this function is simply
 * to delay, not to communicate any data.
 *
 * @memberOf module:cispy~Cispy
 * @param {number} [delay=0] the number of milliseconds that the process will
 *     block for. At the end of that time, the process is again eligible to be
 *     run by the dispatcher again. If this is missing or set to `0`, the
 *     process will cede execution to the next one but immediately requeue
 *     itself to be run again.
 * @return {Promise} A promise that resolves with no meaningful result when the
 * time has elapsed.
 */
export function sleep(delay = 0) {
  return new Promise(resolve => {
    const ch = chan();
    setTimeout(() => ch.close(), delay);
    ch.takeAsync(resolve);
  });
}

/**
 * **Invokes an async function acting as a process.**
 *
 * This is purely a convenience function, driven by the fact that it's necessary
 * to use an IIFE to invoke an inline async function, and that's not very
 * aesthetically pleasing. It does no more than invoke the passed function, but
 * that at least releases us from the need to put the empty parentheses after
 * the function definition.
 *
 * @memberOf module:cispy~Cispy
 * @param {function} fn The async function being used as a process.
 * @param {...*} args Arguments that are sent to the async function when it's
 * invoked.
 * @return {Promise} The promise returned by the async function.
 */
export function go(fn, ...args) {
  return fn(...args);
}
