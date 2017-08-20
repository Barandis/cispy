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
 * All of the external, process-based CSP functions are gathered here and exported as a whole. This includes core CSP
 * functions for channels and processes, but it also includes buffers, special values, and utility functions.
 *
 * @module cispy
 */

const { fixed, sliding, dropping, EMPTY } = require('./core/buffers');
const { chan, timeout, close, CLOSED, DEFAULT } = require('./core/channel');
const { putAsync, takeAsync, altsAsync } = require('./core/operations');
const { config, SET_IMMEDIATE, MESSAGE_CHANNEL, SET_TIMEOUT } = require('./core/dispatcher');

const { go, goSafe, spawn, put, take, takeOrThrow, alts, sleep } = require('./generator/operations');

const util = require('./generator/util');

/**
 * The core namespace under which all of the main functions reside in the API. Everything in this namespace is
 * accessible as a member of the main `cispy` object that is required, imported, or accessed as a global object.
 *
 * @namespace Cispy
 */

/**
 * An error handling function. This is used to handle exceptions thrown in processes and transducers. The return value
 * of an exception handler is typically put onto a channel; if the exception happened within a process, it will be put
 * to that process's output channel, and if the exception happened in a transducer, it will be put to the channel to
 * which the transducer is attached.
 *
 * @callback exceptionHandler
 * @param {Object} err The error object that was thrown to cause the error being handled.
 * @return {*} A value that will be put onto a channel..
 */

/**
 * A callback run when a non-blocking channel operation completes. The value that this function receives is identical
 * to what is returned by a blocking call: the value being taken from the channel for a `take`, or `true` or `false`
 * depending on the channel status for a `put`. It need not return anything; any return value is ignored.
 *
 * @callback nbCallback
 * @param {*} value Either the value taken from the channel, or whether or not a value was successfully put.
 */

/**
 * A callback run when a non-blocking alts operation completes. Th evalue that this function recieves is an object
 * with two properties: the value that the alts operation completed with (either the value taken from the channel in
 * a take operation, or `true` or `false` in a puts operation), along with the channel where the operation actually
 * took place. This function need not return anything; any return value is ignored.
 *
 * @callback altsCallback
 * @param {Object} data The value returned from the alts operation.
 * @param {*} data.value The value of the completed operation. If the operation was a take, this is the value that was
 *     taken from the channel (or `{@link module:cispy~CLOSED|CLOSED}` if the channel was closed without a value being
 *     taken). If the operation was a put, this is `true` if the put value was taken and `false` if the channel was
 *     closed before that value could be taken.
 * @param {module:cispy/core/channel~Channel} data.channel The channel on which the operation that was completed acted.
 */

/**
 * A function that transforms data and can be chained to other transducers. This is handled by separate libraries; the
 * only involvement of this library is as a consumer of transducers. A transducer is stepped through each time a value
 * is taken from a channel.
 *
 * Transducers work by having step functions that are known via protocol, and it is these step functions that take the
 * data to be transformed as arguments. The arguments to the transducers themselves are other transducers that are then
 * composed into a single transducer, which is then returned. These values should not be a concern of a user of this
 * library; just pass a transducer to {@link module:cispy~chan|chan} and everything else will be handled.
 *
 * @callback transducer
 * @param {module:cispy~transducer} xform A transducer to chain this transducer to.
 * @return {module:cispy~transducer} A new transducer chaining this one to `xform`.
 */

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

  /**
   * **Sets one of the dispatcher configuration options.**
   *
   * This is advanced setting for the dispatcher that is responsible for queueing up channel operations and processes.
   * It is likely that this function will never need to be called in normal operation.
   *
   * If any recognized options are specified in the options object passed to `config`, then the option is set to the
   * value sent in. Properties that aren't any of these four options are ignored, and any of these options that do not
   * appear in the passed object are left with their current values.
   *
   * @function config
   * @param {Object} opts A mapping of options to their new values. Extra values (properties that are not options) are
   *     ignored.
   * @param {number} [opts.taskBatchSize] The maximum number of tasks that the dispatcher will run in a single batch
   *     (by default, this is 1024). If the number of pending tasks exceeds this, the remaining are not discarded.
   *     They're simply run as part of another batch after the current batch completes.
   * @param {Symbol} [opts.dispatchMethod] The method used to dispatch a process into a separate line of execution.
   *     Possible values are `{@link module:cispy~SET_IMMEDIATE|SET_IMMEDIATE}`,
   *     `{@link module:cispy~MESSAGE_CHANNEL|MESSAGE_CHANNEL}`, or `{@link module:cispy:SET_TIMEOUT|SET_TIMEOUT}`, with
   *     the default being `{@link module:cispy~SET_IMMEDIATE|SET_IMMEDIATE}`. If a method is set but is not available
   *     in that environment, then it will silently fall back to the next method that is available.
   */
  config,

  /**
   * **Creates a fixed buffer of the specified capacity.**
   *
   * A fixed buffer is a 'normal' buffer, one that stores and returns items on demand. While it is capable of being
   * over-filled, that ability is not used in Cispy. A buffer that is full will cause the next put to its channel to
   * block until at least one item is removed from the buffer.
   *
   * This buffer is able to be passed to `{@link module:cispy~chan|chan}` to create a buffered channel.
   *
   * @function fixedBuffer
   * @param {number} capacity The number of items that the new buffer can hold before it's full.
   * @return {module:cispy/core/buffers~FixedBuffer} A new fixed buffer of the specified capacity.
   */
  fixedBuffer: fixed,

  /**
   * **Creates a sliding buffer of the specified capacity.**
   *
   * A sliding buffer drops the first-added (oldest) item already in the buffer if a new item is added when the buffer
   * is already at capacity. Since it's always capable of having items added to it, it's never considered full, and
   * therefore a put to a channel buffered by a sliding buffer never blocks.
   *
   * This buffer is able to be passed to `{@link module:cispy~chan|chan}` to create a buffered channel.
   *
   * @function slidingBuffer
   * @param {number} capacity The number of items that the new buffer can hold before oldest items are dropped on add.
   * @return {module:cispy/core/buffers~SlidingBuffer} A new sliding buffer of the specified capacity.
   */
  slidingBuffer: sliding,

  /**
   * **Creates a dropping buffer of the specified capacity.**
   *
   * A dropping buffer silently drops the item being added if the buffer is already at capacity. Since adding a new
   * item will always 'succeed' (even if it succeeds by just ignoring the add), it is never considered full and
   * therefore a put to a channel buffered by a dropping buffer never blocks.
   *
   * This buffer is able to be passed to `{@link module:cispy~chan|chan}` to create a buffered channel.
   *
   * @function droppingBuffer
   * @param {number} capacity The number of items that the new buffer can hold before newest items are dropped on add.
   * @return {module:cispy/core/buffers~DroppingBuffer} A new dropping buffer of the specified capacity.
   */
  droppingBuffer: dropping,

  /**
   * **The value returned from a take on a channel when that channel is closed and has no more values available.**
   *
   * This is a special value that is returned under a certain circumstance, namely when a take is performed on a closed
   * channel. Because of that, it cannot be returned from a take on an open channel. For that reason, `CLOSED` is the
   * only value that cannot be put onto a channel - it would be impossible to distinguish between a legitimate value of
   * `CLOSED` and an actual closed channel.
   *
   * @type {Symbol}
   */
  CLOSED,

  /**
   * **The name of the channel returned from `yield {@link module:cispy~alts|alts}` and
   * `{@link module:cispy~altsAsync|altsAsync}` when the default is returned as its value.**
   *
   * This only happens when a `yield {@link module:cispy~alts|alts}` or `{@link module:cispy~altsAsync|altsAsync}` is
   * performed, all operations are initially blocking, and a `default` option is sent. The immediate response in that
   * situation is `{ value: options.default, channel: DEFAULT }`.
   *
   * @type {Symbol}
   */
  DEFAULT,

  /**
   * **The value returned from a buffer when it has no values in it.**
   *
   * This is used instead of `null` because `null` is a value that can actually be put onto a channel (and therefore
   * into a buffer backing that channel). That means that, despite the assertion that only
   * `{@link module:cispy~CLOSED|CLOSED}` cannot be put onto a channel, it's probably not a great idea to put `EMPTY`
   * onto an *unbuffered* channel. While it won't cause an error to be thrown, and while it will be removed from the
   * buffer to allow the next value to be removed, it's likely to cause some odd behavior.
   *
   * @type {Symbol}
   */
  EMPTY,

  /**
   * **A set of utility functions for working with channels.**
   *
   * This is a small 'standard library' of operations that are useful when working with channels.
   *
   * @type {module:cispy/util~GeneratorUtils}
   */
  util,

  /**
   * **The dispatch method option indicating that `setImmediate` should be used to dispatch tasks.**
   *
   * This is the default option. For environments that don't support `setImmediate`, this falls back to
   * `{@link moduls:cispy~MESSAGE_CHANNEL|MESSAGE_CHANNEL}`.
   *
   * @type {Symbol}
   * @see {@link module:cispy~config|config}
   */
  SET_IMMEDIATE,

  /**
   * **The dispatch method option indicating that a `MessageChannel` should be used to dispatch tasks.**
   *
   * For environments that don't support `MessageChannel`s, this falls back to
   * `{@link moduls:cispy~SET_TIMEOUT|SET_TIMEOUT}`.
   *
   * @type {Symbol}
   * @see  {@link module:cispy~config|config}
   */
  MESSAGE_CHANNEL,

  /**
   * **The dispatch method option indicating that `setTimeout` should be used to dispatch tasks.**
   *
   * This method is always available, but it's also always less efficient than any other method, so it should be used
   * as a last resort.
   *
   * @type {Symbol}
   * @see  {@link module:cispy~config|config}
   */
  SET_TIMEOUT
};
