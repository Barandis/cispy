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
 * Core operations for channels working with processes, and functions for the creation of those processes themselves.
 *
 * @module cispy/core/operations
 * @private
 */

const { process, instruction, TAKE, PUT, ALTS, SLEEP } = require('./process');
const { fixed } = require('../core/buffers');
const { chan, close, CLOSED } = require('../core/channel');
const { putAsync } = require('../core/operations');

/**
 * **Takes a value from a channel, blocking the process until a value becomes available to be taken (or until the
 * channel closes with no more values on it to be taken).**
 *
 * This function *must* be called from within a process and as part of a `yield` expression.
 *
 * When `take` is completed and its process unblocks, its `yield` expression evaluates to the actual value that was
 * taken. If the target channel closed, then all of the values already placed onto it are resolved by `take` as
 * normal, and once no more values are available, the special value `{@link module:cispy~Cispy.CLOSED|CLOSED}` is
 * returned.
 *
 * @function take
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is taking a value from.
 * @return {Object} The function itself returns an instruction object that guides the process in running the take.
 *     This is why `take` must be run in a process; the instruction object is meaningless otherwise. After the process
 *     unblocks, the `yield take` expression returns the value taken from the channel, or
 *     `{@link module:cispy~Cispy.CLOSED|CLOSED} `if the target channel has closed and no more values are available to
 *     be taken.
 */
function take(channel) {
  return instruction(TAKE, { channel, except: false });
}

/**
 * **Takes a value from a channel, blocking the process until a value becomes available to be taken (or until the
 * channel closes with no more values on it to be taken). If the taken value is an error object, that error is thrown
 * at that point within the process.**
 *
 * This function *must* be called from within a process and as part of a `yield` expression.
 *
 * It functions in every way like `{@link module:cispy~Cispy.take|take}` *except* in the case that the value on the
 * channel is an object that has `Error.prototype` in its prototype chain (any built-in error, any properly-constructed
 * custom error). If that happens, the error is thrown at that point in the process. This throw is like any other throw;
 * i.e., it can be caught, the custom handler from {@link module:cispy~Cispy.goSafe|goSafe} can deal with it, etc.
 *
 * If the taken value is an error object, the `yield takeOrThrow` expression will have no value (after all, it threw
 * an error instead).
 *
 * `takeOrThrow` is roughly equivalent to:
 *
 * ```
 * const value = yield take(ch);
 * if (Error.prototype.isPrototypeOf(value)) {
 *   throw value;
 * }
 * ```
 *
 * The equivalence isn't exact because the `throw` happens *inside* the process rather than outside as here, but in
 * most cases that won't make a difference.
 *
 * @function takeOrThrow
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is taking a value from.
 * @return {Object} The function itself returns an instruction object that guides the process in running the take.
 *     This is why `takeOrThrow` must be run in a process; the instruction object is meaningless otherwise. After the
 *     process unblocks, the `yield takeOrThrow` expression returns the value taken from the channel,
 *     `{@link module:cispy~Cispy.CLOSED|CLOSED}` if the target channel has closed and no more values are available to
 *     be taken, or no value at all if the taken value was an error object.
 */
function takeOrThrow(channel) {
  return instruction(TAKE, { channel, except: true });
}

/**
 * **Puts a value onto a channel, blocking the process until that value is taken from the channel by a different
 * process (or until the channel closes).**
 *
 * A value is always put onto the channel, but if that value isn't specified by the second parameter, it is
 * `undefined`. Any value may be put on a channel, with the sole exception of the special value
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
 *
 * This function *must* be called from within a process and as part of a `yield` expression.
 *
 * When `put` is completed and its process unblocks, its `yield` expression evaluates to a status boolean that
 * indicates what caused the process to unblock. That value is `true` if the put value was successfully taken by
 * another process, or `false` if the unblocking happened because the target channel closed.
 *
 * @memberOf module:cispy~Cispy
 * @param {module:cispy/core/channel~Channel} channel The channel that the process is putting a value onto.
 * @param {*} [value] The value being put onto the channel.
 * @return {Object} The function itself returns an instruction object that guides the process in running the put. This
 *     is why `put` must be run in a process; the instruction object is meaningless otherwise. After the process
 *     unblocks, the `yield put` expression returns `true` if the put value was taken or `false` if the target channel
 *     closed.
 */
function put(channel, value) {
  return instruction(PUT, { channel, value });
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
 * This function *must* be called from within a process and as part of a `yield` expression.
 *
 * When `alts` is completed and its process unblocks, its `yield` expression evaluates to an object of two properties.
 * The `value` property becomes exactly what would have been returned by the equivalent `yield put` or `yield take`
 * operation: a Boolean in the case of a put, or the taken value in the case of a take. The `channel` property is set
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
 * @function alts
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
 * @return {Object} The function itself returns an instruction object that guides the process in running the puts and
 *     takes. This is why `alts` must be run in a process; the instruction object is meaningless otherwise. After the
 *     process unblocks, the `yield alts` expression returns an object with two properties: `value` will have the
 *     value of the completed operation (the same value that would be returned if either a
 *     `{@link module:cispy~Cispy.put|put}` or `{@link module:cispy~Cispy.take|take}` function was called instead), and
 *     `channel` will have the channel object that completed the operation that allowed the `alts` process to unblock.
 */
function alts(ops, options = {}) {
  return instruction(ALTS, { ops, options });
}

/**
 * **Blocks the process for the specified time (in milliseconds) and then unblocks it.**
 *
 * This implements a delay, but one that's superior to other kinds of delays (`setTimeout`, etc.) because it blocks
 * the process and allows the dispatcher to allow other processes to run while this one waits. If the delay is set to
 * `0` or is missing altogether, the process will relinquish control to the next process in the queue and immediately
 * reschedule itself to be continued, rather than blocking.
 *
 * This function *must* be called from within a process and as part of a `yield` expression.
 *
 * When this function completes and its process unblocks, the `yield` expression doesn't take on any meaningful value.
 * The purpose of this function is simply to delay, not to communicate any data.
 *
 * @function sleep
 * @param {number} [delay=0] the number of milliseconds that the process will block for. At the end of that time, the
 *     process is again eligible to be run by the dispatcher again. If this is missing or set to `0`, the process
 *     will cede execution to the next one but immediately requeue itself to be run again.
 * @return {Object} The function itself returns an instruction object that guides the process in blocking for the
 *     right amount of time. This is why `timeout` must be run in a process; the instruction object is meaningless
 *     otherwise. After the process unblocks, the `yield timeout` expression doesn't take on any value (it's in fact
 *     set to `undefined`).
 */
function sleep(delay = 0) {
  return instruction(SLEEP, { delay });
}

/**
 * **Creates a new process from a generator.**
 *
 * This does exactly the same thing as `{@link module:cispy~Cispy.go|go}`, but it takes a generator instead of a
 * generator function and its parameters. Because a generator does not have a literal notation,
 * `{@link module:cispy~Cispy.go|go}` is going to be used the vast majority of the time. However, if a generator has
 * already been created by invoking its generator function, `spawn` is available to run it in a separate process.
 *
 * @memberOf module:cispy~Cispy
 * @param {function} gen A generator to be run in a separate process.
 * @return {module:cispy/core/channel~Channel} A channel that is given a single value when the process completes, and
 *     that is the return value of the generator. This channel automatically closes when that value is taken from it.
 */
function spawn(gen, exh) {
  const ch = chan(fixed(1));
  process(gen, exh, value => {
    if (value === CLOSED) {
      ch.close();
    } else {
      putAsync(ch, value, () => close(ch));
    }
  }).run();
  return ch;
}

/**
 * **Creates a new process from a generator function.**
 *
 * The generator function (expressed literally as `function*() { ... }`) is run in a separate process under the
 * control of the CSP engine, and any `yield` expressions within the generator function followed by the five process
 * instructions (`{@link module:cispy~Cispy.put|put}`, `{@link module:cispy~Cispy.take|take}`,
 * `{@link module:cispy~Cispy.takeOrThrow|takeOrThrow}`, `{@link module:cispy~Cispy.alts|alts}`,
 * `{@link module:cispy~Cispy.sleep|sleep})` are given their special meanings.
 *
 * Really, this is a convenience function, but one that's convenient enough that it's used almost universally over its
 * alternative. `{@link module:cispy~Cispy.spawn|spawn}` does the actual work, but it takes a generator instead of a
 * generator function, and since there is no generator literal, `go` is easier to use. The generator function is
 * invoked to create a generator for `{@link module:cispy~Cispy.spawn|spawn}`, and when that happens, the remaining `go`
 * parameters are applied to that generator function.
 *
 * @memberOf module:cispy~Cispy
 * @param {function} fn A generator function to be run as a separate process.
 * @param {...*} args Arguments that are sent to the generator function when it's invoked to create the process.
 * @return {module:cispy/core/channel~Channel} A channel that is given a single value when the process completes, and
 *     that is the return value of the generator function. This channel automatically closes when that value is taken
 *     from it.
 */
function go(fn, ...args) {
  return spawn(fn(...args));
}

/**
 * **Creates a new process that can handle internal errors.**
 *
 * This works just like `{@link module:cispy~Cispy.go|go}` except that it allows the specification of an error handler.
 * If the handler exists and is a function, then it is called any time that an uncaught error is thrown from inside a
 * process. The function receives the thrown error object as its single parameter.
 *
 * After the handler is run, the process will end. The return value of the process (i.e., the single value that will
 * be in the channel that `goSafe` returns) will be whatever value is returned from the handler.
 *
 * @memberOf module:cispy~Cispy
 * @param {function} fn A generator function to be run as a separate process.
 * @param {module:cispy~exceptionHandler} handler A function that will be called if an error is thrown inside the
 *     process. The return value of this function will then be put into the process's output channel, and the process
 *     will be terminated.
 * @param {...*} args Arguments that are sent to the generator function when it's invoked to create the process.
 * @return {module:cispy/core/channel~Channel} A channel that is given a single value when the process completes, and
 *     that is the return value of the generator function (if no uncaught error is thrown) or the return value of the
 *     handler function (if an uncaught error is thrown and passed to the handler). This channel automatically closes
 *     when that value is taken from it.
 */
function goSafe(fn, handler, ...args) {
  return spawn(fn(...args), handler);
}

module.exports = {
  put,
  take,
  takeOrThrow,
  alts,
  sleep,
  go,
  goSafe,
  spawn
};
