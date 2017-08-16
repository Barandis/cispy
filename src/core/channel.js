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
 * An implementation of channels, which is one of the two big parts of CSP (the other being processes). These channels
 * are essentially queues that hold process instructions waiting for the next available process to process them. They
 * can be buffered, which is accomplished using the buffers implemented in buffer.js.
 *
 * Channels do not interact with JS tasks or the dispatcher in any meaningful way. They're just here to hold tasks
 * (represented by handlers from process.js) which may themselves then cause new JS tasks to be created via the
 * dispatcher.
 *
 * Channels may have transducers associated with them. The transducers are expected to follow the same conventions as
 * any of the popular transducer libraries. Explicit support is required because channels wouldn't play well with the
 * normal way of making an object support transduction, for two different reasons.
 *
 * * Transducers require the ability to create a new, empty collection of the same type as the input collection. In
 *   this case, that would mean creating a new channel, meaning that the output channel (where the transformed values
 *   are taken from) would be different than the input channel (where values are put).
 * * If we somehow get over that requirement and keep all action on the same channel, we can't take values from the
 *   channel, transform them, and put them back. This would potentially change the order of values in the channel since
 *   we are dealing with asynchronous processes.
 *
 * The explicit support means a transformer is directly associated with a channel. When a value is put onto the
 * channel, it's first run through the transformer and the transformed value is the one actually put into the channel's
 * buffer. This avoids both of the problems noted above.
 *
 * The upshot is that channels are independent of processes, even to the degree that these channels will work fine with
 * async functions in place of processes.
 *
 * @module cispy/core/channel
 */

const { queue, fixed, EMPTY } = require('./buffers');
const { dispatch } = require('./dispatcher');
const p = require('./protocol').protocols;

/**
 * The maximum number of dirty operations that can be queued on a channel before a cleanup is triggered.
 *
 * @type {number}
 * @private
 */
const MAX_DIRTY = 64;

/**
 * The maximum number of opertions that can be queued on a channel before new operations are rejected.
 *
 * @type {number}
 * @private
 */
const MAX_QUEUED = 1024;

/**
 * A unique value used to indicate for certain that an object is indeed a box. Since there is no access to this object
 * outside of the library, there is no way to emulate a box in a value that might be on a channel.
 *
 * @type {Symbol}
 * @private
 */
const BOX = Symbol();

/**
 * A unique value that is returned when an attempt is made to take from a closed channel. This is the only value that is
 * not legal to put *onto* a channel, as taking this value is read as the same as there being no value on a closed
 * channel.

 * @type {Symbol}
 * @private
 */
const CLOSED = Symbol('CLOSED');

//
/**
 * Used to represent the default channel in an alts call where a default is provided. If that default is returned, the
 * default value is returned as the value of the `value` property while this is returned as the value of the `channel`
 * property.
 *
 * @type {Symbol}
 * @private
 */
const DEFAULT = Symbol('DEFAULT');

/**
 * Determines whether an object is reduced. This is done using the transducer protocol; an object with the protocol-
 * specified `reduced` property is assumed to be reduced. If a result of a transformation is reduced, it means that the
 * transformation is complete and the channel should be closed.
 *
 * @param {*} value The value being checked for reduction.
 * @return {boolean} `true` if the value has been reduced, or `false` if it has not been.
 * @private
 */
function isReduced(value) {
  return !!(value && value[p.reduced]);
}

/**
 * A wrapper around a value. This is primarily used as a marker; a put or take returning a Box indicates that the put
 * or take has returned an immediate value, while returning `null` indicates that the operation has been queued.
 *
 * @typedef Box
 * @private
 */

/**
 * A wrapper object for a value. This is used almost entirely as a marker interface, though the fact that it becomes a
 * parameter that's passed by reference rather than value is also important in a couple places. If a channel operation
 * (put or take) returns a Box, it means that an actual value was returned. A non-Box (which always happens to be
 * `null`) means that the operation must block.
 *
 * @param {*} value The value to box.
 * @return {module:cispy/core/channel~Box} The boxed value.
 * @private
 */
function box(value) {
  return {
    value,
    box: BOX
  };
}

/**
 * A wrapper around a value. This is much like {@link module:cispy/core/channel~Box|Box} except that it also carries a
 * handler to be used when a put value is taken. It is specifically for queueing puts.
 *
 * @typedef PutBox
 * @private
 */

/**
 * A box used to wrap a value being put onto a channel. This is different from a regular box in that the put handler
 * is also included.
 *
 * @param  {Object} handler The handler used to process a put request for the value.
 * @param  {*} value The value to box.
 * @return {Object} The boxed value.
 * @private
 */
function putBox(handler, value) {
  return {
    handler,
    value,
    box: BOX
  };
}

/**
 * Determines whether a value is a boxed value.
 *
 * @param {*} value The value to check to see whether it's boxed.
 * @return {boolean} `true` if the value is a boxed value, or `false` if it is not.
 * @private
 */
function isBox(value) {
  return value && value.box === BOX;
}

/**
 * Creates a new channel.
 *
 * @param {module:cispy/core/buffers~Buffer} [buffer] The buffer that backs this channel. If this is not present or is
 *     `null` then the newly created channel will be unbuffered.
 * @param {Object} [xform] The transducer used to transform values put onto this channel. If this is not present or is
 *     `null` then there will be no transformation applied to values put onto the newly created channel.
 * @param {boolean} [timeout=false] Whether this is a timeout channel. A timeout channel, when created, is set to close
 *     after a certain amount of time. The channel itself is not aware of how much time it has until it closes.
 * @param {number} [options.maxDirty=MAX_DIRTY] The maximum number of dirty operations that can be in the queue
 *     before those operations are subject to being purged. Dirty operations are those that may not be valid anymore
 *     because they were in the list of operations passed to `alts` but were not chosen to run. This provides a chance
 *     for a very minor performance tweak and is best left alone.
 * @param {number} [options.maxQueued=MAX_QUEUED] The maximum number of operations that can be queued up at the same
 *     time. This prevents infinite loops from accidentally eating up all of the available memory.
 * @return {module:cispy/core/channel~Channel} A new channel object.
 * @private
 */
function channel(buffer, xform, timeout = false, { maxDirty = MAX_DIRTY, maxQueued = MAX_QUEUED } = {}) {
  const takes = queue();
  const puts = queue();
  let dirtyTakes = 0;
  let dirtyPuts = 0;
  let closed = false;

  /**
   * A channel, used by processes to communicate with one another. This is one of the two core objects of the library,
   * along with {@link module:cispy/generator/process~Process|Process}.
   *
   * For each operation, the channel first tests to see if there's a corresponding operation already queued (i.e., if
   * we're doing a `put` that there's a queued `take` and vice versa). If there is, that corresponding operation is
   * unblocked and both operations complete. If not, the operation is queued to wait for a corresponding operation. The
   * process or async function that created the operation then blocks.
   *
   * The channel can be backed by a buffer, though it is not by default. If a buffer is in place, and that buffer is not
   * full, then the process/async function that created an operation that has to be queued is **not** blocked.
   *
   * This channel object supports transformations, assuming that they follow the rather informal protocol created by a
   * few transducer library authors to allow them to interoperate. The support must be explicitly created because the
   * normal method of making an object support transformations won't work here. This method is to create a new object
   * and add the transformed values to it - but for a channel, we need to replace the values on the channel with their
   * transformed values, in the same order even in a multi-process environment. Thus transformations happen in place.
   *
   * Transformations are applied before the value is queued, so even if there is a corresponding operation ready to go,
   * the transformation still happens. Also, transformations require that the channel be buffered (this buffer is what
   * is sent to the transformer's reduction step function); trying to create a channel with a transformer but without a
   * buffer will result in an error being thrown.
   *
   * This is the object that is returned from a call to {@link module:cispy/core/operations~chan|chan()}. However, this
   * object is intended to be used as a value to pass to channel operation functions; the function properties on this
   * object are low-level.
   *
   * @namespace Channel
   */
  return {
    /**
     * Determines whether this channel has been closed.
     *
     * @name closed
     * @memberOf module:cispy/core/channel~Channel
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
     * @memberOf module:cispy/core/channel~Channel
     * @instance
     * @type {boolean}
     * @readonly
     */
    get buffered() {
      return !!buffer;
    },

    /**
     * Determines whether this channel is a timeout channel. A timeout channel is one that, when created, was given a
     * certain amount of time before automatically closing. The channel itself is not aware of how long it has until it
     * is closed.
     *
     * @name timeout
     * @memberOf module:cispy/core/channel~Channel
     * @instance
     * @type {boolean}
     * @readonly
     */
    get timeout() {
      return !!timeout;
    },

    /**
     * Puts a value onto this channel. The specified handler is used to control whether the put is active and what to do
     * after the put completes. A put can become inactive if it was part of an `alts` call and some other operation
     * specified in that call has already completed.
     *
     * This value is given to a take handler immediately if there's one waiting. Otherwise the value and handler are
     * queued together to wait for a take.
     *
     * This is a low-level operation that's provided as a part of the channel object so that other operations functions
     * can properly apply handlers. It is not meant for general use. Use those other operations functions instead.
     *
     * @param {*} value The value to be put onto the channel.
     * @param {boolean} handler.active Determines whether the put is still active and should still be serviced.
     * @param {function} handler.commit Deactivates the put (so it can't be serviced a second time) and returns the
     *     callback to be fired when the put completes.
     * @return {?module:cispy/core/channel~Box} One of three values. A boxed `true` is returned if the put was
     *     immediately consumed by a pending take. A boxed `false` is returned if the put was performed on a channel
     *     that was already closed by the time the put took place. `null` is returned if the put was queued pending a
     *     corresponding take.
     * @private
     */
    put(value, handler) {
      if (value === CLOSED) {
        throw Error('Cannot put CLOSED on a channel');
      }

      if (closed) {
        handler.commit();
        return box(false);
      }

      let taker, callback;

      // Push the incoming value through the buffer, even if there's already a taker waiting for the value. This is to
      // make sure that the transducer step function has a chance to act on the value (which could change the value or
      // make it unavailable altogether) before the taker sees it.
      //
      // If this channel is unbuffered this process is skipped (there can't be a transformer on an unbuffered channel
      // anyway). If the buffer is full, the transformation is deferred until later when the buffer is not full.
      if (buffer && !buffer.full) {
        handler.commit();
        const done = isReduced(xform[p.step](buffer, value));

        for (;;) {
          if (buffer.count === 0) {
            break;
          }
          taker = takes.dequeue();
          if (taker === EMPTY) {
            break;
          }
          if (taker.active) {
            callback = taker.commit();
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

      // This next loop happens if the channel is unbuffered and there is at least one pending take. It processes the
      // next pending take immediately. (Buffered channels break out of the loop immediately, because in order for a
      // buffered channel to reach this point, its buffer must have been full. This means there are no pending takes and
      // the first one pulled will be EMPTY.)
      for (;;) {
        taker = takes.dequeue();
        if (taker === EMPTY) {
          break;
        }
        if (taker.active) {
          handler.commit();
          callback = taker.commit();
          if (callback) {
            dispatch(() => callback(value));
          }
          return box(true);
        }
      }

      // If there are no pending takes on an unbuffered channel, or on a buffered channel with a full buffer, we queue
      // the put to let it wait for a take to become available. Puts whose handlers have gone inactive (because they
      // were part of an ALTS instruction) are periodically purged.
      if (dirtyPuts > maxDirty) {
        puts.filter(putter => putter.handler.active);
        dirtyPuts = 0;
      } else {
        dirtyPuts++;
      }

      if (puts.count >= maxQueued) {
        throw Error(`No more than ${maxQueued} pending puts are allowed on a single channel`);
      }
      puts.enqueue(putBox(handler, value));

      return null;
    },

    /**
     * Takes a value from this channel. The specified handler is used to control whether the take is active and what to
     * do after the take completes. A take can become inactive if it was part of an `alts` call and some other operation
     * specified in that call has already completed.
     *
     * This value is given to a put handler immediately if there's one waiting. Otherwise the value and handler are
     * queued together to wait for a put.
     *
     * This is a low-level operation that's provided as a part of the channel object so that other operations functions
     * can properly apply handlers. It is not meant for general use. Use those other operations functions instead.
     *
     * @param {boolean} handler.active Determines whether the take is still active and should still be serviced.
     * @param {function} handler.commit Deactivates the take (so it can't be serviced a second time) and returns the
     *     callback to be fired when the take completes.
     * @return {?module:cispy/core/channel~Box} Either the boxed value taken from the channel, or `null` if the take
     *     must be queued to await a corresponding put.
     * @private
     */
    take(handler) {
      let putter, putHandler, callback;

      // Happens when this is a buffered channel and the buffer is not empty (an empty buffer means there are no pending
      // puts). We immediately process any puts that were queued when there were no pending takes, up until the buffer
      // is filled with put values.
      if (buffer && buffer.count > 0) {
        handler.commit();
        const value = buffer.remove();

        for (;;) {
          if (buffer.full) {
            break;
          }
          putter = puts.dequeue();
          if (putter === EMPTY) {
            break;
          }

          putHandler = putter.handler;
          if (putHandler.active) {
            callback = putHandler.commit();
            if (callback) {
              dispatch(() => callback(true));
            }
            if (isReduced(xform[p.step](buffer, putter.value))) {
              this.close();
            }
          }
        }
        return box(value);
      }

      // This loop runs on an unbuffered channel if there are any pending puts. It processes the next pending put
      // immediately. (Buffered channels skip this section because in order to have come this far, the channel's buffer
      // must have been empty. This means there are no pending puts, so the first pending put pulled will be EMPTY.)
      for (;;) {
        putter = puts.dequeue();
        if (putter === EMPTY) {
          break;
        }
        putHandler = putter.handler;
        if (putHandler.active) {
          callback = putHandler.commit();
          if (callback) {
            dispatch(() => callback(true));
          }
          return box(putter.value);
        }
      }

      // If we've exhausted all of our pending puts and the channel is marked closed, we can finally return the fact
      // that the channel is closed. This ensures that any puts that were already pending on the channel are still
      // processed before closure, even if the channel was closed before that could happen.
      if (closed) {
        handler.commit();
        return box(CLOSED);
      }

      // If an unbuffered channel or a buffered channel with an empty buffer has no pending puts, and if the channel is
      // still open, the take is queued to be processed when a put is available. Takes whose handlers have gone inactive
      // as the result of alts processing are periodically purged.
      if (dirtyTakes > maxDirty) {
        takes.filter(taker => taker.active);
        dirtyTakes = 0;
      } else {
        dirtyTakes++;
      }

      if (takes.count >= maxQueued) {
        throw Error(`No more than ${maxQueued} pending takes are allowed on a single channel`);
      }
      takes.enqueue(handler);

      return null;
    },

    /**
     * Closes the channel, if it isn't already closed. This immediately returns any buffered values to pending takes. If
     * there are no buffered values (or if they've already been taken by other takes), then all of the rest of the takes
     * are completed with the value of {@link module:cispy~CLOSED|CLOSED}. Any pending puts are completed with the value
     * of `false`.
     *
     * Note that the buffer is not emptied if there are still values remaining after all of the pending takes have been
     * handled. The channel will still provide those values to any future takes, though no new values may be added to
     * the channel. Once the buffer is depleted, any future take will return {@link module:cispy~CLOSED|CLOSED}.
     *
     * It is perfectly reasonable to call this function on a channel. However, for the sake of consistency, a standalone
     * {@link cispy~close|close} function is provided as well.
     *
     * @private
     */
    close() {
      if (closed) {
        return;
      }
      closed = true;

      let taker, putter, callback;

      // If there is a buffer and it has at least one value in it, send those values to any pending takes that might be
      // queued.
      if (buffer) {
        xform[p.result](buffer);
        for (;;) {
          if (buffer.count === 0) {
            break;
          }
          taker = takes.dequeue();
          if (taker === EMPTY) {
            break;
          }
          if (taker.active) {
            callback = taker.commit();
            const value = buffer.remove();
            if (callback) {
              dispatch(() => callback(value));
            }
          }
        }
      }

      // Once the buffer is empty (or if there never was a buffer), send CLOSED to all remaining queued takes.
      for (;;) {
        taker = takes.dequeue();
        if (taker === EMPTY) {
          break;
        }
        if (taker.active) {
          callback = taker.commit();
          if (callback) {
            dispatch(() => callback(CLOSED));
          }
        }
      }

      // Send `false` to any remaining queued puts.
      for (;;) {
        putter = puts.dequeue();
        if (putter === EMPTY) {
          break;
        }
        if (putter.handler.active) {
          callback = putter.handler.commit();
          if (callback) {
            dispatch(() => callback(false));
          }
        }
      }
    }
  };
}

/**
 * The default exception handler, used when no exception handler is supplied to {@link handleException},
 * {@link wrapTransformer}, or {@link module:cispy~chan|chan}. This default handler merely returns
 * {@link module:cispy~CLOSED}, which will result in no new value being written to the channel.
 *
 * @type {function}
 * @private
 */
const DEFAULT_HANDLER = () => CLOSED;

/**
 * A handler function for exceptions that are thrown by a transducer while transforming values on a channel.
 *
 * @param {Object} err The error object that was thrown by the transducer.
 * @return {*} A value that should be put into the channel's buffer when the transducer throws the error. If this value
 *     is {@link module:cispy~CLOSED}, then no value at all will be added to the buffer.
 * @callback ExceptionHandler
 * @private
 */

/**
 * Handles an exception that is thrown inside a transducer. The thrown error is passed to the `handler` function, and
 * the result of that handler function is added to the channel's buffer. If that value is {@link module:cispy~CLOSED},
 * then it is *not* added to the buffer.
 *
 * @param  {module:cispy/core/buffers~Buffer} buffer The buffer that backs the channel whose transducer's exceptions
 *     are being handled.
 * @param  {ExceptionHandler} handler The exception handling function that is run when an error occurs in a transducer.
 * @param  {Object} ex The error object thrown by the transducer.
 * @return {module:cispy/core/buffers~Buffer} The buffer itself. This is done to make it easier to integrate this
 *     function into a transducer's step function.
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
 * A reducer that wraps another transducer with error handling code. Any error that occurs within the transducer, either
 * in the step function or the result function, will cause the error handler to be run.
 *
 * @param  {Object} xform The transducer to add an error handler to.
 * @param  {ExceptionHandler} [handler=DEFAULT_HANDLER] The exception handling function that is run when an error occurs
 *     in the transducer.
 * @return {Object} A new transducer that is the result of wrapping the provided transducer's step and result functions
 *     with the exception handler.
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
    }
  };
}

/**
 * The reducer used at the end of a transducer chain to control how the transformed values are reduced back onto the
 * channel's buffer. This reducer does nothing more than add the input items (which are the transformed values that are
 * being put onto the channel) to the channel buffer.
 *
 * This is a necessary part of working with a transducer, as the final reducer always takes the transformed values and
 * renders them into whatever collection is desired. This is that final reducer for channels.
 *
 * @type {Object}
 * @private
 */
const bufferReducer = {
  [p.init]() {
    throw Error('init not available');
  },

  [p.step](buffer, input) {
    buffer.add(input);
    return buffer;
  },

  [p.result](buffer) {
    return buffer;
  }
};

/**
 * Creates and returns a new channel. The channel may optionally be buffered, may optionally have a transformer
 * designated, and may optionally have an exception handler registered to deal with exceptions that occur in the
 * transformation process. There must be a buffer specified in order to add a transform or an error will be thrown. An
 * exception handler can be passed either way, though it will have no real effect if passed without a transformer.
 *
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer=0] The buffer used to back the new channel. If this is
 *     a number, then a {@link module:cispy/core/buffers~Buffer|FixedBuffer} of that size will be used. If the number
 *     is `0`, or if this parameter is not present, then the new channel will be unbuffered.
 * @param {?Object} [xform] The transducer used to transform values put onto the new channel, if any.
 * @param {?ExceptionHandler} [handler] The exception handling function used to deal with errors thrown by the
 *     transducer. If there is no transducer provided, this will be ignored.
 * @param {number} [options.maxDirty=MAX_DIRTY] The maximum number of dirty operations that can be in the queue
 *     before those operations are subject to being purged. Dirty operations are those that may not be valid anymore
 *     because they were in the list of operations passed to `alts` but were not chosen to run. This provides a chance
 *     for a very minor performance tweak and is best left alone.
 * @param {number} [options.maxQueued=MAX_QUEUED] The maximum number of operations that can be queued up at the same
 *     time. This prevents infinite loops from accidentally eating up all of the available memory.
 * @return {module:cispy/core/channel~Channel} The newly created channel.
 * @private
 */
function chan(buffer = 0, xform, handler, options = {}) {
  const buf = buffer === 0 ? null : buffer;
  const b = typeof buf === 'number' ? fixed(buf) : buf;

  if (xform && !b) {
    throw Error('Only buffered channels can use transformers');
  }
  const xf = wrapTransformer(xform ? xform(bufferReducer) : bufferReducer, handler);

  return channel(b, xf, false, options);
}

/**
 * Creates an unbuffered channel that closes after a certain delay (in milliseconds). This isn't terribly different
 * from the channel created in the `sleep` instruction, except that this one is available to be used while it's
 * delaying. A good use case for this is in preventing an `alts` call from waiting too long, as if one of these
 * channels is in its operations list, it will trigger the `alts` after the delay time if no other channel does first.
 *
 * @param  {number} delay The number of milliseconds that the new channel will live before being closed.
 * @return {module:cispy/core/channel~Channel} The newly created channel.
 * @private
 */
function timeout(delay) {
  const ch = channel(null, wrapTransformer(bufferReducer), true);
  setTimeout(() => close(ch), delay);
  return ch;
}

/**
 * Closes a channel. After a channel is closed, no further values can be put on it (`put` will return `false` and no
 * new value will be in the channel). If the channel is buffered, the values that are already there when the channel is
 * closed remain there, ready to be taken. If the channel is unbuffered or if it is buffered but empty, each `take`
 * will result in `CLOSED`. If there are pending takes on the channel when it is closed, those takes will immediately
 * return with `CLOSED`.
 *
 * Channels are perfectly capable of being closed with `channel.close()` without this function at all. However, that is
 * the only function that is regularly called on the channel object, and it is more consistent to do `close` the same
 * way we do `put`, `take`, etc.
 *
 * @param  {module:cispy/core/channel~Channel} channel The channel to be closed.
 * @private
 */
function close(channel) {
  channel.close();
}

module.exports = {
  CLOSED,
  DEFAULT,
  box,
  isBox,
  chan,
  timeout,
  close
};
