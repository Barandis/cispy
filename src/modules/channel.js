/* eslint-disable max-lines */
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
 * An implementation of channels. These channels are essentially queues that
 * hold instructions waiting for the next available async function to process
 * them. They can be buffered, which is accomplished using the buffers
 * implemented in buffer.js.
 *
 * Channels do not interact with JS tasks or the dispatcher in any meaningful
 * way. They're just here to hold tasks (represented by handlers from
 * process.js) which may themselves then cause new JS tasks to be created via
 * the dispatcher.
 *
 * Channels may have transducers associated with them. The transducers are
 * expected to follow the same conventions as any of the popular transducer
 * libraries. Explicit support is required because channels wouldn't play well
 * with the normal way of making an object support transduction, for two
 * different reasons.
 *
 * * Transducers require the ability to create a new, empty collection of the
 *   same type as the input collection. In this case, that would mean creating a
 *   new channel, meaning that the output channel (where the transformed values
 *   are taken from) would be different than the input channel (where values are
 *   put).
 * * If we somehow get over that requirement and keep all action on the same
 *   channel, we can't take values from the channel, transform them, and put
 *   them back. This would potentially change the order of values in the channel
 *   since we are dealing with asynchronous processes.
 *
 * The explicit support means a transducer is directly associated with a
 * channel. When a value is sent to the channel, it's first run through the
 * transducer and the transformed value is the one actually put into the
 * channel's buffer. This avoids both of the problems noted above.
 *
 * The upshot is that channels are independent of async funcitons.
 *
 * @module cispy/channel
 */

import { queue, fixed, EMPTY } from "modules/buffers";
import { dispatch } from "modules/dispatcher";
import { protocols as p } from "modules/protocol";

/**
 * The maximum number of dirty operations that can be queued on a channel before
 * a cleanup is triggered.
 *
 * @type {number}
 * @private
 */
const MAX_DIRTY = 64;

/**
 * The maximum number of opertions that can be queued on a channel before new
 * operations are rejected.
 *
 * @type {number}
 * @private
 */
const MAX_QUEUED = 1024;

/**
 * A unique value used to indicate for certain that an object is indeed a box.
 * Since there is no access to this object outside of the library, there is no
 * way to emulate a box in a value that might be on a channel.
 *
 * @type {Symbol}
 * @private
 */
const BOX = Symbol();

/**
 * **The value returned from a receive on a channel when that channel is closed
 * and has no more values available.**
 *
 * This is a special value that is returned under a certain circumstance, namely
 * when a receive is performed on a closed channel. Because of that, it cannot
 * be returned from a receive on an open channel. For that reason, `CLOSED` is
 * the only value that cannot be sent onto a channel &mdash; it would be
 * impossible to distinguish between a legitimate value of `CLOSED` and an
 * actual closed channel.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
 */
export const CLOSED = Symbol("CLOSED");

/**
 * **The name of the channel returned from `await
 * {@link module:cispy~Cispy.select|select}` or sent to the callback in
 * `{@link module:cispy~Cispy.selectCallback|selectCallback}` when the default
 * is returned as its value.**
 *
 * This only happens when an `select` call is performed, all operations are
 * initially blocking, and a `default` option is sent. The immediate response in
 * that situation is `{ value: options.default, channel: DEFAULT }`.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
 */
export const DEFAULT = Symbol("DEFAULT");

/**
 * Determines whether an object is reduced. This is done using the transducer
 * protocol; an object with the protocol-specified `reduced` property is assumed
 * to be reduced. If a result of a transformation is reduced, it means that the
 * transformation is complete and the channel should be closed.
 *
 * @param {*} value The value being checked for reduction.
 * @return {boolean} `true` if the value has been reduced, or `false` if it has
 * not been.
 * @private
 */
function isReduced(value) {
  return !!(value && value[p.reduced]);
}

/**
 * A wrapper around a value. This is primarily used as a marker; a put or take
 * returning a Box indicates that the put or take has returned an immediate
 * value, while returning `null` indicates that the operation has been queued.
 *
 * @typedef Box
 * @private
 */

/**
 * A wrapper object for a value. This is used almost entirely as a marker
 * interface, though the fact that it becomes a parameter that's passed by
 * reference rather than value is also important in a couple places. If a
 * channel operation (put or take) returns a Box, it means that an actual value
 * was returned. A non-Box (which always happens to be `null`) means that the
 * operation must block.
 *
 * @param {*} value The value to box.
 * @return {module:cispy/channel~Box} The boxed value.
 * @private
 */
export function box(value) {
  return {
    value,
    box: BOX,
  };
}

/**
 * A wrapper around a value. This is much like
 * {@link module:cispy/channel~Box|Box} except that it also carries a handler to
 * be used when a sent value is received. It is specifically for queueing sends.
 *
 * @typedef SendBox
 * @private
 */

/**
 * A box used to wrap a value being sent onto a channel. This is different from
 * a regular box in that the send handler is also included.
 *
 * @param  {Object} handler The handler used to process a send request for the
 * value.
 * @param  {*} value The value to box.
 * @return {Object} The boxed value.
 * @private
 */
function sendBox(handler, value) {
  return {
    handler,
    value,
    box: BOX,
  };
}

/**
 * Determines whether a value is a boxed value.
 *
 * @param {*} value The value to check to see whether it's boxed.
 * @return {boolean} `true` if the value is a boxed value, or `false` if it is
 * not.
 * @private
 */
export function isBox(value) {
  return value && value.box === BOX;
}

/**
 * Creates a new handler used for put and take operations. This handler is
 * always active, as there will never be a time when it's in the queue but
 * already handled.
 *
 * @param {module:cispy/ops~HandlerCallback} fn The callback to be run when the
 *     put or take operation completes.
 * @return {module:cispy/ops~Handler} The new handler.
 */
function opHandler(fn) {
  return {
    get active() {
      return true;
    },

    commit() {
      return fn;
    },
  };
}

/**
 * Creates a new channel.
 *
 * @param {module:cispy/buffers~Buffer} [buffer] The buffer that backs this
 *     channel. If this is not present or is `null` then the newly created
 *     channel will be unbuffered.
 * @param {Object} [xform] The transducer used to transform values put onto this
 *     channel. If this is not present or is `null` then there will be no
 *     transformation applied to values put onto the newly created channel.
 * @param {boolean} [timeout=false] Whether this is a timeout channel. A timeout
 *     channel, when created, is set to close after a certain amount of time.
 *     The channel itself is not aware of how much time it has until it closes.
 * @param {number} [maxDirty=MAX_DIRTY] The maximum number of dirty operations
 *     that can be in the queue before those operations are subject to being
 *     purged. Dirty operations are those that may not be valid anymore because
 *     they were in the list of operations passed to `alts` but were not chosen
 *     to run. This provides a chance for a very minor performance tweak and is
 *     best left alone.
 * @param {number} [maxQueued=MAX_QUEUED] The maximum number of operations that
 *     can be queued up at the same time. This prevents infinite loops from
 *     accidentally eating up all of the available memory.
 * @return {module:cispy/channel~Channel} A new channel object.
 * @private
 */
function channel(
  buffer,
  xform,
  timeout = false,
  maxDirty = MAX_DIRTY,
  maxQueued = MAX_QUEUED,
) {
  const receives = queue();
  const sends = queue();
  let dirtyReceives = 0;
  let dirtySends = 0;
  let closed = false;

  /**
   * A channel, used by processes to communicate with one another.
   *
   * For each operation, the channel first tests to see if there's a
   * corresponding operation already queued (i.e., if we're doing a `put` that
   * there's a queued `take` and vice versa). If there is, that corresponding
   * operation is unblocked and both operations complete. If not, the operation
   * is queued to wait for a corresponding operation. The process or that
   * created the operation then blocks.
   *
   * The channel can be backed by a buffer, though it is not by default. If a
   * buffer is in place, and that buffer is not full, then the process that
   * created an operation that has to be queued is **not** blocked.
   *
   * This channel object supports transformations, assuming that they follow the
   * rather informal protocol created by a few transducer library authors to
   * allow them to interoperate. The support must be explicitly created because
   * the normal method of making an object support transformations won't work
   * here. This method is to create a new object and add the transformed values
   * to it - but for a channel, we need to replace the values on the channel
   * with their transformed values, in the same order even in a multi-process
   * environment. Thus transformations happen in place.
   *
   * Transformations are applied before the value is queued, so even if there is
   * a corresponding operation ready to go, the transformation still happens.
   * Also, transformations require that the channel be buffered (this buffer is
   * what is sent to the transformer's reduction step function); trying to
   * create a channel with a transformer but without a buffer will result in an
   * error being thrown.
   *
   * This is the object that is returned from a call to
   * {@link module:cispy~Cispy.chan|chan()}. However, this object is intended to
   * be used as a value to pass to channel operation functions; the function
   * properties on this object are low-level.
   *
   * @namespace Channel
   */
  return {
    /**
     * Determines whether this channel has been closed.
     *
     * @name closed
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @type {boolean}
     * @readonly
     */
    get closed() {
      return closed;
    },

    /**
     * Determines whether this channel has a buffer.
     *
     * @name buffered
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @type {boolean}
     * @readonly
     */
    get buffered() {
      return !!buffer;
    },

    /**
     * Determines whether this channel is a timeout channel. A timeout channel
     * is one that, when created, was given a certain amount of time before
     * automatically closing. The channel itself is not aware of how long it has
     * until it is closed.
     *
     * @name timeout
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @type {boolean}
     * @readonly
     */
    get timeout() {
      return !!timeout;
    },

    [p.asyncIterator]: async function* iterator() {
      for (;;) {
        const value = await this.take();
        if (value === CLOSED) {
          break;
        }
        yield value;
      }
    },

    /**
     * Sends a value onto this channel. The specified handler is used to control
     * whether the send is active and what to do after the send completes. A
     * send can become inactive if it was part of an `select` call and some
     * other operation specified in that call has already completed.
     *
     * This value is given to a receive handler immediately if there's one
     * waiting. Otherwise the value and handler are queued together to wait for
     * a receive.
     *
     * This is a low-level operation that's provided as a part of the channel
     * object so that other operations functions can properly apply handlers. It
     * is not meant for general use. Use those other operations functions
     * instead.
     *
     * @param {*} value The value to be put onto the channel.
     * @param {boolean} handler.active Determines whether the send is still
     * active and should still be serviced.
     * @param {function} handler.commit Deactivates the send (so it can't be
     *     serviced a second time) and returns the callback to be fired when the
     *     send completes.
     * @return {?module:cispy/channel~Box} One of three values. A boxed `true`
     *     is returned if the send was immediately consumed by a pending
     *     receive. A boxed `false` is returned if the send was performed on a
     *     channel that was already closed by the time the send took place.
     *     `null` is returned if the send was queued pending a corresponding
     *     receive.
     * @private
     */
    handlePut(value, handler) {
      if (value === CLOSED) {
        throw Error("Cannot send CLOSED to a channel");
      }

      if (closed) {
        handler.commit();
        return box(false);
      }

      let receiver, callback;

      // Push the incoming value through the buffer, even if there's already a
      // receiver waiting for the value. This is to make sure that the
      // transducer step function has a chance to act on the value (which could
      // change the value or make it unavailable altogether) before the receiver
      // sees it.
      //
      // If this channel is unbuffered this process is skipped (there can't be a
      // transformer on an unbuffered channel anyway). If the buffer is full,
      // the transformation is deferred until later when the buffer is not full.
      if (buffer && !buffer.full) {
        handler.commit();
        const done = isReduced(xform[p.step](buffer, value));

        for (;;) {
          if (buffer.count === 0) {
            break;
          }
          receiver = receives.dequeue();
          if (receiver === EMPTY) {
            break;
          }
          if (receiver.active) {
            callback = receiver.commit();
            const val = buffer.remove();
            if (callback) {
              dispatch(() => callback(val));
            }
          }
        }

        if (done) {
          this.close();
        }
        return box(true);
      }

      // This next loop happens if the channel is unbuffered and there is at
      // least one pending receive. It processes the next pending receive
      // immediately. (Buffered channels break out of the loop immediately,
      // because in order for a buffered channel to reach this point, its buffer
      // must have been full. This means there are no pending received and the
      // first one pulled will be EMPTY.)
      for (;;) {
        receiver = receives.dequeue();
        if (receiver === EMPTY) {
          break;
        }
        if (receiver.active) {
          handler.commit();
          callback = receiver.commit();
          if (callback) {
            dispatch(() => callback(value));
          }
          return box(true);
        }
      }

      // If there are no pending receives on an unbuffered channel, or on a
      // buffered channel with a full buffer, we queue the send to let it wait
      // for a receive to become available. Sends whose handlers have gone
      // inactive (because they were part of an select list) are periodically
      // purged.
      if (dirtySends > maxDirty) {
        sends.filter(putter => putter.handler.active);
        dirtySends = 0;
      } else {
        dirtySends++;
      }

      if (sends.count >= maxQueued) {
        throw Error(
          `No more than ${maxQueued} pending sends are allowed on a single channel`,
        );
      }
      sends.enqueue(sendBox(handler, value));

      return null;
    },

    /**
     * Receives a value from this channel. The specified handler is used to
     * control whether the receive is active and what to do after the receive
     * completes. A receive can become inactive if it was part of an `select`
     * call and some other operation specified in that call has already
     * completed.
     *
     * This value is given to a send handler immediately if there's one waiting.
     * Otherwise the value and handler are queued together to wait for a send.
     *
     * This is a low-level operation that's provided as a part of the channel
     * object so that other operations functions can properly apply handlers. It
     * is not meant for general use. Use those other operations functions
     * instead.
     *
     * @param {boolean} handler.active Determines whether the receive is still
     * active and should still be serviced.
     * @param {function} handler.commit Deactivates the receive (so it can't be
     *     serviced a second time) and returns the callback to be fired when the
     *     receive completes.
     * @return {?module:cispy/channel~Box} Either the boxed value received from
     *     the channel, or `null` if the take must be queued to await a
     *     corresponding send.
     * @private
     */
    handleTake(handler) {
      let sender, sendHandler, callback;

      // Happens when this is a buffered channel and the buffer is not empty (an
      // empty buffer means there are no pending sends). We immediately process
      // any sends that were queued when there were no pending receives, up
      // until the buffer is filled with sent values.
      if (buffer && buffer.count > 0) {
        handler.commit();
        const value = buffer.remove();

        for (;;) {
          if (buffer.full) {
            break;
          }
          sender = sends.dequeue();
          if (sender === EMPTY) {
            break;
          }

          sendHandler = sender.handler;
          if (sendHandler.active) {
            callback = sendHandler.commit();
            if (callback) {
              dispatch(() => callback(true));
            }
            if (isReduced(xform[p.step](buffer, sender.value))) {
              this.close();
            }
          }
        }
        return box(value);
      }

      // This loop runs on an unbuffered channel if there are any pending sends.
      // It processes the next pending put immediately. (Buffered channels skip
      // this section because in order to have come this far, the channel's
      // buffer must have been empty. This means there are no pending sends, so
      // the first pending send pulled will be EMPTY.)
      for (;;) {
        sender = sends.dequeue();
        if (sender === EMPTY) {
          break;
        }
        sendHandler = sender.handler;
        if (sendHandler.active) {
          callback = sendHandler.commit();
          if (callback) {
            dispatch(() => callback(true));
          }
          return box(sender.value);
        }
      }

      // If we've exhausted all of our pending sends and the channel is marked
      // closed, we can finally return the fact that the channel is closed. This
      // ensures that any sends that were already pending on the channel are
      // still processed before closure, even if the channel was closed before
      // that could happen.
      if (closed) {
        handler.commit();
        return box(CLOSED);
      }

      // If an unbuffered channel or a buffered channel with an empty buffer has
      // no pending puts, and if the channel is still open, the take is queued
      // to be processed when a put is available. Takes whose handlers have gone
      // inactive as the result of alts processing are periodically purged.
      if (dirtyReceives > maxDirty) {
        receives.filter(taker => taker.active);
        dirtyReceives = 0;
      } else {
        dirtyReceives++;
      }

      if (receives.count >= maxQueued) {
        throw Error(
          `No more than ${maxQueued} pending receives are allowed on a single channel`,
        );
      }
      receives.enqueue(handler);

      return null;
    },

    /**
     * Closes the channel, if it isn't already closed. This immediately returns
     * any buffered values to pending receives. If there are no buffered values
     * (or if they've already been taken by other receives), then all of the
     * rest of the receives are completed with the value of
     * {@link module:cispy~CLOSED|CLOSED}. Any pending sends are completed with
     * the value of `false`.
     *
     * Note that the buffer is not emptied if there are still values remaining
     * after all of the pending receives have been handled. The channel will
     * still provide those values to any future receives, though no new values
     * may be added to the channel. Once the buffer is depleted, any future
     * receives will return {@link module:cispy~CLOSED|CLOSED}.
     */
    close() {
      if (closed) {
        return;
      }
      closed = true;

      let receiver, sender, callback;

      // If there is a buffer and it has at least one value in it, send those
      // values to any pending receives that might be queued.
      if (buffer) {
        xform[p.result](buffer);
        for (;;) {
          if (buffer.count === 0) {
            break;
          }
          receiver = receives.dequeue();
          if (receiver === EMPTY) {
            break;
          }
          if (receiver.active) {
            callback = receiver.commit();
            const value = buffer.remove();
            if (callback) {
              dispatch(() => callback(value));
            }
          }
        }
      }

      // Once the buffer is empty (or if there never was a buffer), send CLOSED
      // to all remaining queued receives.
      for (;;) {
        receiver = receives.dequeue();
        if (receiver === EMPTY) {
          break;
        }
        if (receiver.active) {
          callback = receiver.commit();
          if (callback) {
            dispatch(() => callback(CLOSED));
          }
        }
      }

      // Send `false` to any remaining queued sends.
      for (;;) {
        sender = sends.dequeue();
        if (sender === EMPTY) {
          break;
        }
        if (sender.handler.active) {
          callback = sender.handler.commit();
          if (callback) {
            dispatch(() => callback(false));
          }
        }
      }
    },

    /**
     * **Sends a value to this channel without blocking.**
     *
     * This means that a call to `sendAsync` does not go into an `await`
     * expression, and it is not necessary to use it inside a async function.
     * Rather than blocking until the sent value is taken by another async
     * function, this one returns immediately and then invokes the callback (if
     * provided) when the sent value is taken. It can be seen as a non-blocking
     * version of `{@link module:cispy~Cispy.put|send}`.
     *
     * While the primary use of this function is to send values onto channels in
     * contexts where being inside an async function is impossible (for example,
     * in a DOM element's event handler), it can still be used inside async
     * functions at times when it's important to make sure that the function
     * doesn't block from the send.
     *
     * The callback is a function of one parameter. The parameter that's
     * supplied to the callback is the same as what is supplied to `await send`:
     * `true` if the value was taken, or `false` if the channel was closed. If
     * the callback isn't present, nothing will happen after the value is taken.
     *
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @param {*} [value] The value being put onto the channel.
     * @param {module:cispy~nbCallback} [callback] A function that gets invoked
     *     either when the value is taken by another process or when the channel
     *     is closed. This function can take one parameter, which is `true` in
     *     the former case and `false` in the latter.
     */
    putAsync(value, callback = () => {}) {
      const result = this.handlePut(value, opHandler(callback));
      if (result && callback) {
        callback(result.value);
      }
    },

    /**
     * **Receives a value from this channel without blocking.**
     *
     * This means that a call to `receiveAsync` does not go into an `await`
     * expression, and it is not necessary to use it inside a async function.
     * Rather than blocking until a value becomes available on the channel to be
     * received, this one returns immediately and then invokes the callback (if
     * provided) when a value becomes available. It can be regarded as a
     * non-blocking version of {@link module:cispy~Cispy.take|receive}`.
     *
     * While the primary use of this function is to receive values from channels
     * in contexts where being inside an async function is impossible, it can
     * still be used inside async functions at times when it's important that
     * the receive doesn't block the function.
     *
     * The callback is a function of one parameter, and the value supplied for
     * that parameter is the value received from the channel (either a value
     * that was sent or `{@link module:cispy~Cispy.CLOSED|CLOSED}`). If the
     * callback isn't present, nothing will happen after the value is taken.
     *
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @param {module:cispy~nbCallback} [callback] A function that gets invoked
     *     when a value is made available to be received (this value may be
     *     `{@link module:cispy~Cispy.CLOSED|CLOSED}` if the channel closes with
     *     no available value). The function can take one parameter, which is
     *     the value that is received from the channel.
     */
    takeAsync(callback = () => {}) {
      const result = this.handleTake(opHandler(callback));
      if (result && callback) {
        callback(result.value);
      }
    },

    /**
     * **Sends a value to a channel, blocking the async function until that
     * value is received from the channel by a different function (or until the
     * channel closes).**
     *
     * A value is always sent to the channel, but if that value isn't specified
     * by the second parameter, it is `undefined`. Any value may be sent to a
     * channel, with the sole exception of the special value
     * `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
     *
     * This function *must* be called from within an async function and as part
     * of an `await` expression.
     *
     * When `send` is completed and its function unblocks, its `await`
     * expression evaluates to a status boolean that indicates what caused the
     * function to unblock. That value is `true` if the sent value was
     * successfully taken by another process, or `false` if the unblocking
     * happened because the target channel closed.
     *
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @param {*} [value] The value being put onto the channel.
     * @return {Promise} A promise that will resolve to `true` or `false`
     *     depending on whether the put value is actually taken.
     */
    put(value) {
      return new Promise(resolve => {
        this.putAsync(value, resolve);
      });
    },

    /**
     * **Receives a value from this channel, blocking the async function until a
     * value becomes available to be received (or until the channel closes with
     * no more values on it to be received).**
     *
     * This function *must* be called from within an async function and as part
     * of an `await` expression.
     *
     * When `receive` is completed and its function unblocks, its `await`
     * expression evaluates to the actual value that was received. If the target
     * channel closed, then all of the values already placed onto it are
     * resolved by `receive` as normal, and once no more values are available,
     * the special value `{@link module:cispy~Cispy.CLOSED|CLOSED}` is returned.
     *
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @return {Promise} A promise that will resolve to the value received from
     *     the channel once that receive is completed. If the channel closes
     *     without a value being made available, this will resolve to
     *     `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
     */
    take() {
      return new Promise(resolve => {
        this.takeAsync(resolve);
      });
    },

    /**
     * **Receives a value from a channel, blocking the async function until a
     * value becomes available to be received (or until the channel closes with
     * no more values on it to be received). If the received value is an error
     * object, that error is thrown at that point.**
     *
     * This function *must* be called from within an async function and as part
     * of an `await` expression.
     *
     * It functions in every way like
     * `{@link module:cispy/channel~Channel.take|receive}` *except* in the
     * case that the value on the channel is an object that has
     * `Error.prototype` in its prototype chain (any built-in error, any
     * properly-constructed custom error). If that happens, the error is thrown,
     * which will cause the returned promise to be rejected with the error. It
     * can then be handled up the promise chain like any other rejected promise.
     *
     * `takeOrThrow` is roughly equivalent to:
     *
     * ```
     * const value = await ch.take();
     * if (Error.prototype.isPrototypeOf(value)) {
     *   throw value;
     * }
     * ```
     *
     * @memberOf module:cispy/channel~Channel
     * @instance
     * @return {Promise} A promise that will resolve to the value taken from the
     *     channel once that take is completed. If the channel closes without a
     *     value being made available, this will resolve to
     *     `{@link module:cispy~Cispy.CLOSED|CLOSED}`. If the taken value is an
     *     error, the promise will instead be rejected with the error object as
     *     the reason.
     */
    takeOrThrow() {
      return new Promise((resolve, reject) => {
        this.takeAsync(result => {
          if (Object.prototype.isPrototypeOf.call(Error.prototype, result)) {
            reject(result);
          } else {
            resolve(result);
          }
        });
      });
    },
  };
}

/**
 * The default exception handler, used when no exception handler is supplied to
 * {@link handleException}, {@link wrapTransformer}, or
 * {@link module:cispy~chan|chan}. This default handler merely returns
 * {@link module:cispy~CLOSED|CLOSED}, which will result in no new value being
 * written to the channel.
 *
 * @type {function}
 * @private
 */
const DEFAULT_HANDLER = () => CLOSED;

/**
 * A handler function for exceptions that are thrown by a transducer while
 * transforming values on a channel.
 *
 * @param {Object} err The error object that was thrown by the transducer.
 * @return {*} A value that should be put into the channel's buffer when the
 *     transducer throws the error. If this value is
 *     {@link module:cispy~CLOSED}, then no value at all will be added to the
 *     buffer.
 * @callback ExceptionHandler
 * @private
 */

/**
 * Handles an exception that is thrown inside a transducer. The thrown error is
 * passed to the `handler` function, and the result of that handler function is
 * added to the channel's buffer. If that value is {@link module:cispy~CLOSED},
 * then it is *not* added to the buffer.
 *
 * @param  {module:cispy/buffers~Buffer} buffer The buffer that backs the
 *     channel whose transducer's exceptions are being handled.
 * @param  {ExceptionHandler} handler The exception handling function that is
 * run when an error occurs in a transducer.
 * @param  {Object} ex The error object thrown by the transducer.
 * @return {module:cispy/buffers~Buffer} The buffer itself. This is done to make
 *     it easier to integrate this function into a transducer's step function.
 * @private
 */
function handleException(buffer, handler, ex) {
  const value = handler(ex);
  if (value !== CLOSED) {
    buffer.add(value);
  }
  return buffer;
}

/**
 * A reducer that wraps another transducer with error handling code. Any error
 * that occurs within the transducer, either in the step function or the result
 * function, will cause the error handler to be run.
 *
 * @param  {Object} xform The transducer to add an error handler to.
 * @param  {ExceptionHandler} [handler=DEFAULT_HANDLER] The exception handling
 *     function that is run when an error occurs in the transducer.
 * @return {Object} A new transducer that is the result of wrapping the provided
 *     transducer's step and result functions with the exception handler.
 * @private
 */
function wrapTransformer(xform, handler = DEFAULT_HANDLER) {
  return {
    [p.step](buffer, input) {
      try {
        return xform[p.step](buffer, input);
      } catch (ex) {
        return handleException(buffer, handler, ex);
      }
    },

    [p.result](buffer) {
      try {
        return xform[p.result](buffer);
      } catch (ex) {
        return handleException(buffer, handler, ex);
      }
    },
  };
}

/**
 * The reducer used at the end of a transducer chain to control how the
 * transformed values are reduced back onto the channel's buffer. This reducer
 * does nothing more than add the input items (which are the transformed values
 * that are being put onto the channel) to the channel buffer.
 *
 * This is a necessary part of working with a transducer, as the final reducer
 * always takes the transformed values and renders them into whatever collection
 * is desired. This is that final reducer for channels.
 *
 * @type {Object}
 * @private
 */
const bufferReducer = {
  [p.init]() {
    throw Error("init not available");
  },

  [p.step](buffer, input) {
    buffer.add(input);
    return buffer;
  },

  [p.result](buffer) {
    return buffer;
  },
};

/**
 * **Creates and returns a new channel.**
 *
 * By default this channel will be a simple unbuffered, untransformed channel,
 * but that can be changed through options. A channel does not have any
 * externally useful functions. It exists largely to be passed into
 * `{@link module:cispy~Cispy.put|put}`, `{@link module:cispy~Cispy.take|take}`,
 * and `{@link module:cispy~Cispy.alts|alts}` invocations, along with their
 * non-blocking variations (`{@link module:cispy~Cispy.putAsync|putAsync}`,
 * `{@link module:cispy~Cispy.takeAsync|takeAsync}`, and
 * `{@link module:cispy~Cispy.altsAsync|altsAsync}`).
 *
 * If a buffer value is provided, it defines what buffer should back the
 * channel. If this is `null`, `0`, or completely missing, the channel will be
 * unbuffered. If it's a positive number, the channel will be buffered by a
 * {@link module:cispy/buffers~FixedBuffer|FixedBuffer} of that size. If it's a
 * {@link module:cispy/buffers~Buffer|Buffer} object, that object will be used
 * as the channel's buffer.
 *
 * `chan` supports transducers by allowing a transducer function to be
 * associated with it. This is passed as the `transducer` option and can only be
 * used if the channel is buffered (otherwise an error is thrown). This
 * transducer function must take another transducer as a parameter (allowing
 * transformers to be chained), and it must return an object conforming to the
 * transducer protocol. The transducer functions provided by several libraries
 * meet these requirements.
 *
 * Errors in the transformation process can be handled by passing an error
 * handler. This is a function that expects to receive an error object as a
 * parameter and can return a value that is then put onto the channel. If this
 * value is `{@link module:cispy~Cispy.CLOSED|CLOSED}`, then no value will be
 * put onto the channel upon handler completion.
 *
 * @memberOf module:cispy~Cispy
 * @param {(number|module:cispy/buffers~Buffer)} [buffer] The buffer object that
 *     should back this channel. If this is a positive number, a fixed buffer of
 *     that size will be created to back the channel. If it is `0` or `null` (or
 *     is just missing), the new channel will be unbuffered.
 * @param {Object} [options] A set of options for configuring the channel's
 * queue.
 * @param {module:cispy~transducer} [options.transducer] A transducer to run
 *     each value through before putting it onto the channel. This function
 *     should expect one parameter (another transducer that it's chained to) and
 *     return an object that conforms to the transducer protocol. This is a
 *     reasonably well-supported protocol that means that transducers from a few
 *     libraries should work fine out of the box. If a transducer is provided on
 *     an unbuffered channel, an error will be thrown.
 * @param {module:cispy~exceptionHandler} [options.handler] An error handler
 *     that is run whenever an error occurs inside a transducer function. If
 *     that happens, this function is called with one parameter, which is the
 *     error object. The value that the handler returns (if it is not
 *     `{@link module:cispy~Cispy.CLOSED|CLOSED}`) will be put onto the channel
 *     when the handler finishes running.
 * @param {number} [options.maxDirty=64] The maximum number of dirty operations
 *     that can be in the queue before those operations are subject to being
 *     purged. Dirty operations are those that may not be valid anymore because
 *     they were in the list of operations passed to `alts` but were not chosen
 *     to run. This provides a chance for a very minor performance tweak and is
 *     best left alone.
 * @param {number|null} [options.timeout=null] The number of milliseconds before
 *     this channel will be automatically closed. A value of `null` indicates
 *     that the channel will not be automatically closed.
 * @param {number} [options.maxQueued=1024] The maximum number of operations
 *     that can be queued up at the same time. This prevents infinite loops from
 *     accidentally eating up all of the available memory.
 * @return {module:cispy/channel~Channel} A new channel.
 */
export function chan(
  buffer = 0,
  {
    transducer = undefined,
    handler = undefined,
    maxDirty = MAX_DIRTY,
    maxQueued = MAX_QUEUED,
    timeout = null,
  } = {},
) {
  const buf = buffer === 0 ? null : buffer;
  const b = typeof buf === "number" ? fixed(buf) : buf;

  if (transducer && !b) {
    throw Error("Only buffered channels can use transformers");
  }
  const xf = wrapTransformer(
    transducer ? transducer(bufferReducer) : bufferReducer,
    handler,
  );

  const isTimeout = timeout !== null;

  const ch = channel(b, xf, isTimeout, maxDirty, maxQueued);
  if (isTimeout) {
    setTimeout(() => ch.close(), timeout);
  }
  return ch;
}
