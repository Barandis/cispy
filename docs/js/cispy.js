(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["cispy"] = factory();
	else
		root["cispy"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 20);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

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

const { queue, fixed, EMPTY } = __webpack_require__(2);
const { dispatch } = __webpack_require__(3);
const p = __webpack_require__(10).protocols;

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
 * **The value returned from a take on a channel when that channel is closed and has no more values available.**
 *
 * This is a special value that is returned under a certain circumstance, namely when a take is performed on a closed
 * channel. Because of that, it cannot be returned from a take on an open channel. For that reason, `CLOSED` is the
 * only value that cannot be put onto a channel - it would be impossible to distinguish between a legitimate value of
 * `CLOSED` and an actual closed channel.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
 */
const CLOSED = Symbol('CLOSED');

/**
 * **The name of the channel returned from `yield {@link module:cispy~Cispy.alts|alts}` (generator),
 * yield {@link module:cispy/promise~CispyPromise.alts|alts}` (promise), and
 * `{@link module:cispy~Cispy.altsAsync|altsAsync}` when the default is returned as its value.**
 *
 * This only happens when aa alts call is performed, all operations are initially blocking, and a `default` option is
 * sent. The immediate response in that situation is `{ value: options.default, channel: DEFAULT }`.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
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
 * **Creates and returns a new channel.**
 *
 * By default this channel will be a simple unbuffered, untransformed channel, but that can be changed through
 * parameters to this function. A channel does not have any externally useful functions. It exists largely to be
 * passed into `{@link module:cispy~Cispy.put|put}`, `{@link module:cispy~Cispy.take|take}`, and
 * `{@link module:cispy~Cispy.alts|alts}` invocations, along with their non-blocking variations
 * (`{@link module:cispy~Cispy.putAsync|putAsync}`, `{@link module:cispy~Cispy.takeAsync|takeAsync}`, and
 * `{@link module:cispy~Cispy.altsAsync|altsAsync}`).
 *
 * If a buffer value is provided, it defines what buffer should back the channel. If this is `null`, `0`, or
 * completely missing, the channel will be unbuffered. If it's a positive number, the channel will be buffered by a
 * {@link module:cispy/core/buffers~FixedBuffer|FixedBuffer} of that size. If it's a
 * {@link module:cispy/core/buffers~Buffer|Buffer} object, that object will be used as the channel's buffer.
 *
 * `chan` supports transducers by allowing a transducer function to be associated with it. This is passed as the
 * second parameter and can only be used if the channel is buffered (otherwise an error is thrown). This transducer
 * function must take another transducer as a parameter (allowing transformers to be chained), and it must return an
 * object conforming to the transducer protocol. The transducer functions provided by several libraries meet these
 * requirements.
 *
 * Errors in the transformation process can be handled by passing an error handler. This is a function that expects to
 * receive an error object as a parameter and can return a value that is then put onto the channel. If this value is
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}`, then no value will be put onto the channel upon handler completion.
 *
 * @memberOf module:cispy~Cispy
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer] The buffer object that should back this channel. If
 *     this is a positive number, a fixed buffer of that size will be created to back the channel. If it is `0` or
 *     `null` (or is just missing), the new channel will be unbuffered.
 * @param {module:cispy~transducer} [xform] A transducer to run each value through before putting it onto the channel.
 *     This function should expect one parameter (another transducer that it's chained to) and return an object that
 *     conforms to the transducer protocol. This is a reasonably well-supported protocol that means that transducers
 *     from a few libraries should work fine out of the box. If a transducer is provided on an unbuffered channel, an
 *     error will be thrown.
 * @param {module:cispy~exceptionHandler} [handler] An error handler that is run whenever an error occurs inside a
 *     transducer function. If that happens, this function is called with one parameter, which is the error object.
 *     The value that the handler returns (if it is not `{@link module:cispy~Cispy.CLOSED|CLOSED}`) will be put onto the
 *     channel when the handler finishes running.
 * @param {Object} [options] A set of options for configuring the channel's queue.
 * @param {number} [options.maxDirty=64] The maximum number of dirty operations that can be in the queue
 *     before those operations are subject to being purged. Dirty operations are those that may not be valid anymore
 *     because they were in the list of operations passed to `alts` but were not chosen to run. This provides a chance
 *     for a very minor performance tweak and is best left alone.
 * @param {number} [options.maxQueued=1024] The maximum number of operations that can be queued up at the same
 *     time. This prevents infinite loops from accidentally eating up all of the available memory.
 * @return {module:cispy/core/channel~Channel} A new channel.
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
 * **Creates a new unbuffered channel that closes after some amount of time.**
 *
 * This channel is able to be used for putting and taking as normal, but it will close after the number of
 * milliseconds in its `delay` parameter has passed. For that reason it's not really intended to be used for putting
 * and taking. Its primary purpose is to be a channel passed to `{@link module:cispy~Cispy.alts|alts}` to place a time
 * limit on how long its process will block.
 *
 * @memberOf module:cispy~Cispy
 * @param {number} delay The number of milliseconds to keep the new channel open. After that much time passes, the
 *     channel will close automatically.
 * @return {module:cispy/core/channel~Channel} A new channel that automatically closes after the delay completes.
 */
function timeout(delay) {
  const ch = channel(null, wrapTransformer(bufferReducer), true);
  setTimeout(() => close(ch), delay);
  return ch;
}

/**
 * **Closes a channel.**
 *
 * Marks a particular channel as closed. A closed channel cannot accept any new puts
 * (`{@link module:cispy~Cispy.put|put}` will return `false` if an attempt is made, and no new value will be on the
 * channel). If it's buffered, it will* still provide the values that are already on the channel until all of them are
 * taken, after which any `{@link module:cispy~Cispy.take|take}` will return `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
 *
 * If there are pending takes on a channel when it's closed, then all takes will immediately return with
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}`.
 *
 * @memberOf module:cispy~Cispy
 * @param {module:cispy/core/channel~Channel} channel The channel to be closed.
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


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

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

const { box, isBox, DEFAULT } = __webpack_require__(0);

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


/***/ }),
/* 2 */
/***/ (function(module, exports) {

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
 * Provides several types of buffers usable in buffered channels. These are all built on a small, efficient queue (also
 * provided) which is in turn backed by a JavaScript array.
 *
 * @module cispy/core/buffers
 */

/**
 * **The value returned from a buffer when it has no values in it.**
 *
 * This is used instead of `null` because `null` is a value that can actually be put onto a channel (and therefore
 * into a buffer backing that channel). That means that, despite the assertion that only
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}` cannot be put onto a channel, it's probably not a great idea to put
 * `EMPTY` onto an *unbuffered* channel. While it won't cause an error to be thrown, and while it will be removed from
 * the buffer to allow the next value to be removed, it's likely to cause some odd behavior.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
 */
const EMPTY = Symbol('EMPTY');

/**
 * A general purpose, highly efficient JavaScript queue. It is backed by a JavaScript array, but it does not
 * use `unshift` to take elements off the array because unshift causes elements to be copied every time it's used.
 * Instead, a pointer is maintained that keeps track of the location of the next element to be dequeued, and when that
 * dequeue happens, the pointer simply moves. When the empty space at the head of the array gets large enough, it's
 * removed by a single slice operation.
 *
 * Putting elements into the queue is just done with a basic `push`, which *is* highly efficient.
 *
 * This type of queue is possible in JavaScript because JS arrays are resizable. In languages with fixed-size arrays,
 * a resizing operation would have to be run each time the queue fills.
 *
 * @namespace Queue
 */

/**
 * Creates a new queue. This queue is created empty, with a backing array of length 0.
 *
 * @returns {module:cispy/core/buffers~Queue} a new, empty queue
 * @private
 */
function queue() {
  const obj = {
    store: [],
    pointer: 0,

    /**
     * Returns the number of elements stored in the queue. This may or may not equal the length of the backing store.
     *
     * @name count
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @type {number}
     * @readonly
     */
    get count() {
      return this.store.length - this.pointer;
    },

    /**
     * Returns `true` if the queue is empty.
     *
     * @name empty
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @type {boolean}
     * @readonly
     */
    get empty() {
      return this.store.length === 0;
    },

    /**
     * Adds an item to the queue.
     *
     * @function enqueue
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @param {*} item The value being added to the queue.
     */
    enqueue(item) {
      this.store.push(item);
    },

    /**
     * Removes an item from the queue and returns that item. If the removal causes the amount of empty space at the
     * head of the backing store to exceed a threshold, that empty space is removed.
     *
     * @function dequeue
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @return {*} The oldest stored item in the queue.
     */
    dequeue() {
      if (this.empty) {
        return EMPTY;
      }

      const item = this.store[this.pointer];
      // Removes the items in the backing array before the current pointer, if there is enough empty space before the
      // pointer to justify it.
      if (++this.pointer * 2 >= this.store.length) {
        this.store = this.store.slice(this.pointer);
        this.pointer = 0;
      }
      return item;
    },

    /**
     * Returns the next item in the queue without removing it.
     *
     * @function peek
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @return {*} The oldest item stored in the queue.
     */
    peek() {
      return this.empty ? EMPTY : this.store[this.pointer];
    },

    /**
     * Filters out any item in the queue that does not cause the supplied predicate functoin to return `true` when
     * passed that item. This is not exactly a general purpose queue operation, but we need it with channels that will
     * occasionally want to get rid of inactive handlers.
     *
     * @function filter
     * @memberOf module:cispy/core/buffers~Queue
     * @instance
     * @param {Function} fn The predicate function that determines whether an element remains in the queue.
     */
    filter(fn) {
      for (let i = 0, { count } = this; i < count; ++i) {
        const item = this.dequeue();
        if (fn(item)) {
          this.enqueue(item);
        }
      }
    }
  };

  return obj;
}

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Buffer implementations
//
// Each of the three buffers has the same three properties and two operations. The difference between them is the
// behavior of the `full` property and of the `add` operation.
//
// size: the largest number of items that can be in the buffer at once.
// count: the actual number of items in the buffer.
// full: whether or not the buffer is full.
// add: adds an item to the buffer.
// remove: removes an item from the buffer (and returns it).
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * The base for buffer classes, containing the common functionality between all of them. The only properties that
 * actually vary between buffer types are `full` (whether or not the buffer is full) and `add` (because different
 * buffers have different behavior when something is added to a full buffer).
 *
 * These buffers are each backed by a {@link Queue}.
 *
 * @namespace Buffer
 */

/**
 * Creates a base buffer of the given size.
 *
 * @param  {number} size the maximum number of items that the new buffer can hold.
 * @return {module:cispy.buffers~Buffer} the new buffer.
 * @private
 */
function base(size) {
  const q = queue();

  return {
    /**
     * The queue that backs this buffer.
     *
     * @name queue
     * @memberOf module:cispy/core/buffers~Buffer
     * @instance
     * @type {module:cispy/core/buffers~Queue}
     * @readonly
     */
    get queue() {
      return q;
    },

    /**
     * The size of the buffer.
     *
     * This is *not* the number of elements in the buffer; it is the number of items that can be stored without the
     * buffer overflowing. It is static and is set at creation time.
     *
     * @name size
     * @memberOf module:cispy/core/buffers~Buffer
     * @instance
     * @type {number}
     * @readonly
     */
    get size() {
      return size;
    },

    /**
     * The number of items currently being stored by the buffer.
     *
     * @name count
     * @memberOf module:cispy/core/buffers~Buffer
     * @instance
     * @type {number}
     * @readonly
     */
    get count() {
      return this.queue.count;
    },

    /**
     * Removes and returns the oldest item in the buffer.
     *
     * @function remove
     * @memberOf module:cispy/core/buffers~Buffer
     * @instance
     * @return {*} The oldest item in the buffer.
     */
    remove() {
      return this.queue.dequeue();
    }
  };
}

/**
 * **Creates a fixed buffer of the specified capacity.**
 *
 * A fixed buffer is a 'normal' buffer, one that stores and returns items on demand. While it is capable of being
 * over-filled, that ability is not used in Cispy. A buffer that is full will cause the next put to its channel to
 * block until at least one item is removed from the buffer.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function fixedBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before it's full.
 * @return {module:cispy/core/buffers~FixedBuffer} A new fixed buffer of the specified capacity.
 */
function fixed(size) {
  /**
   * A buffer implementation that never discards buffered items when a new item is added.
   *
   * This buffer has a concept of *full*, but it's a soft limit. If the size of the buffer is exceeded, added items are
   * still stored. {@link module:cispy/core/buffers~FixedBuffer#full|full} returns `true` any time that the size is
   * reached or exceeded, so it's entirely possible to call {@link module:cispy/core/buffers~Buffer#remove|remove} on a
   * full buffer and have it still be full.
   *
   * @namespace FixedBuffer
   * @augments {module:cispy/core/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      // Object.assign doesn't handle getters and setters properly, so we add this getter as a property descriptor
      // in the second argument of Object.create instead.
      full: {
        /**
         * Whether or not the buffer has as many or more items stored as its
         * {@link module:cispy/core/buffers~Buffer#size|size}.
         *
         * @name full
         * @memberOf module:cispy/core/buffers~FixedBuffer
         * @instance
         * @type {number}
         * @readonly
         */
        get() {
          return this.queue.count >= this.size;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. These items will be added even if the buffer is full.
       *
       * @function add
       * @memberOf module:cispy/core/buffers~FixedBuffer
       * @instance
       * @param {...*} items The items to be added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          this.queue.enqueue(item);
        }
      }
    }
  );
}

/**
 * **Creates a dropping buffer of the specified capacity.**
 *
 * A dropping buffer silently drops the item being added if the buffer is already at capacity. Since adding a new
 * item will always 'succeed' (even if it succeeds by just ignoring the add), it is never considered full and
 * therefore a put to a channel buffered by a dropping buffer never blocks.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function droppingBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before newest items are dropped on add.
 * @return {module:cispy/core/buffers~DroppingBuffer} A new dropping buffer of the specified capacity.
 */
function dropping(size) {
  /**
   * A buffer implementation that drops newly added items when the buffer is full.
   *
   * This dropping behavior is silent: the new item is simply not added to the queue. Note taht this buffer is never
   * `full` because it can always be added to wiehtout exceeding the size, even if that 'adding' doesn't result in a new
   * item actually appearing in the buffer.
   *
   * @namespace DroppingBuffer
   * @extends {module:cispy/core/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      full: {
        /**
         * Whether or not the buffer is full. As a {@link module:cispy/core/buffers~DroppingBuffer|DroppingBuffer} is
         * never considered full, this will always return `false`.
         *
         * @name full
         * @memberOf module:cispy/core/buffers~DroppingBuffer
         * @instance
         * @type {number}
         * @readonly
         */
        get() {
          return false;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. If the buffer has already reached its capacity, then the item is silently
       * dropped instead.
       *
       * @function add
       * @memberOf module:cispy/core/buffers~DroppingBuffer
       * @instance
       * @param {...*} items the items added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          if (this.queue.count < this.size) {
            this.queue.enqueue(item);
          }
        }
      }
    }
  );
}

/**
 * **Creates a sliding buffer of the specified capacity.**
 *
 * A sliding buffer drops the first-added (oldest) item already in the buffer if a new item is added when the buffer
 * is already at capacity. Since it's always capable of having items added to it, it's never considered full, and
 * therefore a put to a channel buffered by a sliding buffer never blocks.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function slidingBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before oldest items are dropped on add.
 * @return {module:cispy/core/buffers~SlidingBuffer} A new sliding buffer of the specified capacity.
 */
function sliding(size) {
  /**
   * A buffer implementation that drops the oldest item when an item is added to a full buffer.
   *
   * This is very similar to {@link module:cispy/core/buffers~DroppingBuffer|DroppingBuffer}; the only difference is in
   * what happens when an item is added. In this buffer, the new item is indeed added to the buffer, but in order to
   * keep the count of the buffer at or below its size, the oldest item in the buffer is silently dropped.
   *
   * @namespace SlidingBuffer
   * @extends {module:cispy/core/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      /**
       * Whether or not the buffer is full. As a {@link module:cispy/core/buffers~SlidingBuffer|SlidingBuffer} is
       * never considered full, this will always return `false`.
       *
       * @name full
       * @memberOf module:cispy/core/buffers~SlidingBuffer
       * @instance
       * @type {number}
       * @readonly
       */
      full: {
        get() {
          return false;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. If the buffer has already reached its capacity, then the oldest items in
       * the buffer are dropped to make way for the new items.
       *
       * @function add
       * @memberOf module:cispy/core/buffers~SlidingBuffer
       * @instance
       * @param {...*} items The items to be added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          if (this.queue.count === this.size) {
            this.queue.dequeue();
          }
          this.queue.enqueue(item);
        }
      }
    }
  );
}

module.exports = {
  EMPTY,
  queue,
  fixed,
  dropping,
  sliding
};


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(setImmediate) {/*
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

/* global MessageChannel */

/**
 * This is the place where the new JS tasks are actually created. A queue is maintained for them, and as each batch of
 * processes are completed, the next ones run. As each CSP process runs, it adds tasks to be run to the queue, which
 * are each run in their own JS task.
 *
 * The function that spawns the new JS task depends on environment. The `setImmediate` function is preferred as it's the
 * fastest, not waiting for event queues to empty before spawning the new process. However, it is not JS standard and
 * currently only works in IE and node.js. If `setImmediate` isn't available, an attempt is made to use
 * `MessageChannel`'s `onMessage` is tried next. If that is also not available, then `setTimeout` with `0` delay is
 * used, which is available everywhere but which is the least performant of all of the solutions.
 *
 * There are other possibilities for creating processes, but they were rejected as obsolete (`process.nextTick` and
 * `onreadystatechange`) or unnecessary (`window.postMessage`, which works like `MessageChannel` but doesn't work in Web
 * Workers).
 *
 * It is notable and important that we act as good citizens here. This dispatcher is capable of taking control of the
 * JavaScript engine until thousands, millions, or more tasks are handled. But that could cause the system event loop
 * to have to wait an unacceptable amount of time. So we limit ourselves to a batch of tasks at a time, and if there
 * are still more to be run, we let the event loop run before that next batch is processed.
 *
 * The dispatcher is **global**. There is a single instance that runs for all channels and processes. This is the only
 * element of the system that works like this.
 *
 * @module cispy/core/dispatcher
 * @private
 */

const buffers = __webpack_require__(2);

const queue = buffers.queue();
const EMPTY = buffers.EMPTY;

/**
 * **The dispatch method option indicating that `setImmediate` should be used to dispatch tasks.**
 *
 * This is the default option. For environments that don't support `setImmediate`, this falls back to
 * `{@link moduls:cispy~Cispy.MESSAGE_CHANNEL|MESSAGE_CHANNEL}`.
 *
 * @memberOf module:cispy~Cispy
 * @type {Symbol}
 * @see {@link module:cispy~Cispy.config|config}
 */
const SET_IMMEDIATE = Symbol('SET_IMMEDIATE');

/**
 * **The dispatch method option indicating that a `MessageChannel` should be used to dispatch tasks.**
 *
 * For environments that don't support `MessageChannel`s, this falls back to
 * `{@link module:cispy~Cispy.SET_TIMEOUT|SET_TIMEOUT}`.
 *
 * @memberOf module:cispy~Cispy
 * @type {Symbol}
 * @see  {@link module:cispy~Cispy.config|config}
 */
const MESSAGE_CHANNEL = Symbol('MESSAGE_CHANNEL');

/**
 * **The dispatch method option indicating that `setTimeout` should be used to dispatch tasks.**
 *
 * This method is always available, but it's also always less efficient than any other method, so it should be used
 * as a last resort.
 *
 * @memberOf module:cispy~Cispy
 * @type {Symbol}
 * @see  {@link module:cispy~Cispy.config|config}
 */
const SET_TIMEOUT = Symbol('SET_TIMEOUT');

const options = {
  batchSize: 1024,
  dispatchMethod: SET_IMMEDIATE
};

let dispatcher = createDispatcher();

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
 * @memberOf module:cispy~Cispy
 * @param {Object} opts A mapping of options to their new values. Extra values (properties that are not options) are
 *     ignored.
 * @param {number} [opts.taskBatchSize] The maximum number of tasks that the dispatcher will run in a single batch
 *     (by default, this is 1024). If the number of pending tasks exceeds this, the remaining are not discarded.
 *     They're simply run as part of another batch after the current batch completes.
 * @param {Symbol} [opts.dispatchMethod] The method used to dispatch a process into a separate line of execution.
 *     Possible values are `{@link module:cispy~Cispy.SET_IMMEDIATE|SET_IMMEDIATE}`,
 *     `{@link module:cispy~Cispy.MESSAGE_CHANNEL|MESSAGE_CHANNEL}`, or
 *     `{@link module:cispy~Cispy.SET_TIMEOUT|SET_TIMEOUT}`, with
 *     the default being `{@link module:cispy~Cispy.SET_IMMEDIATE|SET_IMMEDIATE}`. If a method is set but is not
 *     available in that environment, then it will silently fall back to the next method that is available.
 */
function config(opts) {
  for (const key in options) {
    if (opts.hasOwnProperty(key)) {
      options[key] = opts[key];

      if (key === 'dispatchMethod') {
        setDispatcher();
      }
    }
  }
}

let running = false;
let queued = false;

/**
 * Uses a combination of available methods and the dispatchMethod option to determine which of hte three dispatch
 * methods should be used. This is what provides fallback; e.g., {@link SET_IMMEDIATE} being specified but `setTimeout`
 * being used if `setImmediate` isn't available in the environment.
 *
 * @return {Symbol} One of {@link SET_IMMEDIATE}, {@link MESSAGE_CHANNEL}, or {@link SET_TIMEOUT}, which should be used
 *     as the ultimate dispatch method based on environment.
 * @private
 */
function getDispatchMethod() {
  switch (options.dispatchMethod) {
    case MESSAGE_CHANNEL:
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;

    case SET_TIMEOUT:
      return SET_TIMEOUT;

    default:
      if (typeof setImmediate !== 'undefined') {
        return SET_IMMEDIATE;
      }
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;
  }
}

/**
 * Creates a dispatcher function based on the currently selected dispatch method.
 *
 * @return {function} The function run to dispatch a set of queued tasks.
 * @private
 */
function createDispatcher() {
  switch (getDispatchMethod()) {
    // We prefer setImmediate if it's available.
    case SET_IMMEDIATE:
      return () => {
        if (!(queued && running)) {
          queued = true;
          setImmediate(processTasks);
        }
      };

    // Most modern browsers implement MessageChannel. This is basically a last-ditch effort to avoid using setTimeout,
    // since that's always the slowest way to do it. This was chosen over postMessage because postMessage doesn't work
    // in Web workers, where MessageChannel does.
    case MESSAGE_CHANNEL: {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => processTasks();
      return () => {
        if (!(queued && running)) {
          queued = true;
          channel.port2.postMessage(0);
        }
      };
    }

    // If all else fails, just use setTimeout. It may be a few milliseconds slower than the others over the long haul,
    // but it works everywhere.
    case SET_TIMEOUT:
      return () => {
        if (!(queued && running)) {
          queued = true;
          setTimeout(processTasks, 0);
        }
      };
  }
}

/**
 * Creates and integrates a new dispatcher function based on the current dispatch method settings. Nothing is returned;
 * the global dispatch function just becomes the newly created dispatch function.
 *
 * This is called external to this module when a new dispatch method is configured.
 *
 * @private
 */
function setDispatcher() {
  dispatcher = createDispatcher();
}

/**
 * Processes a batch of tasks one at a time. The reason for limiting this function to a batch size is because we need
 * to give up control to the system's process queue occasionally, or else the system event loop would never run. We
 * limit ourselves to running a batch at a time, and if there are still more tasks remaining, we put another call onto
 * the system process queue to be run after the event loop cycles once more.
 *
 * @private
 */
function processTasks() {
  running = true;
  queued = false;
  let count = 0;

  for (;;) {
    const task = queue.dequeue();
    if (task === EMPTY) {
      break;
    }

    task();

    if (count >= options.taskBatchSize) {
      break;
    }
    count++;
  }

  running = false;
  if (queue.length) {
    dispatcher();
  }
}

/**
 * Adds a task to the queue and dispatches it.
 *
 * @param {function} task The new function to be queued into the dispatcher.
 * @private
 */
function dispatch(task) {
  queue.enqueue(task);
  dispatcher();
}

module.exports = {
  config,
  dispatch,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT
};

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(8).setImmediate))

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

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
 * @module cispy/generator/operations
 * @private
 */

const { process, instruction, TAKE, PUT, ALTS, SLEEP } = __webpack_require__(13);
const { fixed } = __webpack_require__(2);
const { chan, close, CLOSED } = __webpack_require__(0);
const { putAsync } = __webpack_require__(1);

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
 * @memberOf module:cispy~Cispy
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
 * @memberOf module:cispy~Cispy
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
 * @memberOf module:cispy~Cispy
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


/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(9), __webpack_require__(6)))

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(7);
exports.setImmediate = setImmediate;
exports.clearImmediate = clearImmediate;


/***/ }),
/* 9 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 10 */
/***/ (function(module, exports) {

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
 * Protocols for iteration and reduction. The source for these protocols depends on which protocol it is.
 *
 * * **Iteration:** a part of the ES6 standard.
 * * **Transduction:** agreed to by several parties who maintain transducer libraries in the
 *   [comment thread](https://github.com/cognitect-labs/transducers-js/issues/20) for an issue on one of them.
 *
 * @module cispy/core/protocol
 * @private
 */

/**
 * Determines whether Symbols should be used as the names of properties related to the protocol, assuming Symbols are
 * available in the environment.
 *
 * **This is FALSE temporarily.** My own transducer library is using non-Symbols. I intend to change that...we're into
 * ES7 now, so it seems like using ES6 features should be reasonable. When it changes in that library, it'll also
 * change here.
 *
 * @type {boolean}
 * @private
 */
const USE_SYMBOLS = false;

/**
 * Whether or not to use Symbols. This is based on the value of
 * {@link module:cispy/core/protocol~USE_SYMBOLS|USE_SYMBOLS} *and* on whether Symbols are available in the environment.
 * If Symbols are unavailable, it doesn't matter what `USE_SYMBOLS` is set to, Symbols will not be used.
 *
 * @type {boolean}
 * @private
 */
const symbol = typeof Symbol !== 'undefined';

/**
 * Generation of the key used on an object to store a protocol function. This is a Symbol if Symbols are available and
 * {@link module:cispy/core/protocol~USE_SYMBOLS|USE_SYMBOLS} is set to true; if not, it's a regular string. If a Symbol
 * of the supplied name already exists, it'll be used instead of having a new one generated.
 *
 * @param {string} name The name of the protocol function to generate a key for.
 * @return {(string|Symbol)} The key to be used to store protocol values on objects. This is a Symbol if Symbols are
 *     specified and exist in the environment; otherwise it is a string.
 * @private
 */
function generateKey(name) {
  return USE_SYMBOLS && symbol ? Symbol.for(name) : `@@${name}`;
}

/**
 * A mapping of easy-to-use names for protocol properties and the actual name of the property as it's stored on objects.
 * This is merely for convenience, particularly since it's possible to use this library with Symbols or without,
 * depending on environment.
 *
 * @type {Object}
 * @private
 */
const protocols = {
  // Since this one is built in, it already has a custom Symbol property, so we don't need to generate a symbol for a
  // key when symbols are supported.
  iterator: symbol ? Symbol.iterator : '@@iterator',

  // Reduction protocols
  init: generateKey('transducer/init'),
  step: generateKey('transducer/step'),
  result: generateKey('transducer/result'),
  reduced: generateKey('transducer/reduced'),
  value: generateKey('transducer/value')
};

module.exports = { protocols };


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

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
 * A series of functions meant to operate on the channels that the rest of this library creates and manages.
 *
 * All of the functions that are here cannot be done with transducers because of the limitations on transducers
 * themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
 * (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
 *
 * @module cispy/util
 */

/**
 * A set of utility functions using generators (processes) to work with channels.
 *
 * These are all accessed through the `cispy.util` namespace; e.g.,
 * `{@link module:cispy/util~CispyUtil.reduce|reduce}` can be called like this:
 *
 * ```
 * const output = cispy.util.reduce((acc, value) => acc + value, ch, 0);
 * ```
 *
 * @namespace CispyUtil
 */

/**
 * A function used to reduce a collection of values into a single value via a reducer function.
 *
 * @callback reducer
 * @param {*} acc The accumulated value from the prior reduction step. If this is the first reduction step, this will
 *     be set to some initial value (either an explicit value or the first value of the collection).
 * @param {*} value The next value of the collection.
 * @return {*} The result of reducing the next value into the current accumulated value.
 */

/**
 * A function that tests a single input argument, returning `true` or `false` according to whether the argument passed
 * the test.
 *
 * @callback predicate
 * @param {*} value The value to test.
 * @return {boolean} Whether or not the value passed the test.
 */

/**
 * A function that takes a number of values and transforms them into a different value.
 *
 * @callback mapper
 * @param {...*} inputs The input values.
 * @return {*} The output value, calculated based on the input values.
 */

const conversion = __webpack_require__(14);
const flow = __webpack_require__(15);
const timing = __webpack_require__(16);

module.exports = Object.assign({}, conversion, flow, timing);


/***/ }),
/* 12 */,
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

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
// process.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// An implementation of processes, one of the two big parts of CSP (the other being channels). These processes
// represent lines of execution that may be run concurrently with other lines of execution.
//
// Processes are implemented as generators that have some extra functionality based on the values fed out of the
// generator by its `yield` expressions. By passing special values out of those expressions (in the form of
// instruction objects), the process can control when and how the generator is restarted.

const { chan } = __webpack_require__(0);
const { putAsync, takeAsync, altsAsync } = __webpack_require__(1);
const { dispatch } = __webpack_require__(3);

// Names of the actual instructions that are used within a CSP process. These are the five operations that are
// explicitly supported by the Process object itself. Other instructions like putAsync and takeAsync are handled
// outside of the process and do not have process instructions.

const TAKE = 'take';
const PUT = 'put';
const ALTS = 'alts';
const SLEEP = 'sleep';

// A unique value used to tag an object as an instruction. Since there's no access to this value outside of this module,
// there's no way to emulate (accidentally or on purpose) an instruction in the process queue.
const INSTRUCTION = Symbol();

// A simple object basically used as a wrapper to associate some data with a  particular instruction. The op property
// is the string name of the instruction (from the five choices in the constants above), while the data property
// contains whatever data is necessary to process that instruction.
function instruction(op, data) {
  return {
    op,
    data,
    instruction: INSTRUCTION
  };
}

// Determines whether an object is an instruction.
function isInstruction(value) {
  return value && value.instruction === INSTRUCTION;
}

// An actual process that is being run in a separate line of execution. This is one of the two key objects from this
// library; the other is Channel.
//
// A process wraps a generator. This generator can operate exactly like any other generator, except that certain
// `yield` expressions will be handled specially. A regular `yield` works just like normal, but if the value given to
// the `yield` is the result of a `put`, `take`, `alts`, `raise`, or `sleep`, something different happens. Each of
// `put`, `take`, and  `alts` will put values onto their channels and then block until they can complete; `raise` will
// cause the raised error to be injected back into the channel with default error handler support; and `sleep` will
// create a new rudimentary channel that blocks until it closes after a certain amount of time.
//
// Each invocation of the wrapped generator - whether from the initial run or continuing after handling a `yield`
// expression (special or not) - will be scheduled by the dispatcher to run as a separate message in the message queue.
function process(gen, exh, onFinish) {
  return {
    gen,
    exh,
    onFinish,
    finished: false,

    // Continues a process that has been paused by passing back the response (the value which will be assigned to the
    // `yield` expression inside the process) and running the code as a different JS task. If the response results from
    // a `yield raise`, the error handling code (which invokes the default handler, if required) will be run instead.
    continue(response, except = false) {
      if (Error.prototype.isPrototypeOf(response) && except) {
        this.injectError(response);
      } else {
        dispatch(this.run.bind(this, response));
      }
    },

    // Called with an arbitrary value when the process exits. This runs the onFinish callback (passing the value) as a
    // separate JS task.
    done(value) {
      if (!this.finished) {
        this.finished = true;
        const finish = this.onFinish;
        if (typeof finish === 'function') {
          dispatch(finish.bind(this, value));
        }
      }
    },

    // Called if an error object is passed out of the process via `takeOrThrow`. The error object is thrown back into
    // the process. If it's caught, then the process continues as normal. Otherwise the error is thrown as though it
    // was generated in the process itself (i.e., it can be caught with an event handler if the process was created
    // with `goSafe`).
    injectError(response) {
      let result;
      try {
        result = this.gen.throw(response);
      } catch (ex) {
        this.handleProcessError(ex);
        return;
      }
      if (result.done) {
        this.done(result.value);
      } else {
        this.run(result.value);
      }
    },

    // Deals with errors that happen inside a running process. Calls that restart a process (`next` or `throw`) should
    // be wrapped in a `try` with a call to this function in the `catch` block. This simply runs the error handler
    // function for the process if it exists, passing the resulting value into the process's return channel and ending
    // the process. If there is no error handler, the error is simply thrown.
    handleProcessError(ex) {
      if (typeof this.exh === 'function') {
        this.done(this.exh(ex));
      } else {
        throw ex;
      }
    },

    // Runs the process until it reaches a `yield`, and then handles the result of that `yield`. If the result is that
    // the process is finished (returns { done: true }), then the process is closed and the onFinish callback is called.
    run(response) {
      if (this.finished) {
        return;
      }

      let item;
      if (isInstruction(response)) {
        // If this function was called by `injectError`, then `this.gen.throw()` was already called so we already
        // have an instruction as the result, no need to call `this.gen.next()`
        item = response;
      } else {
        let iter;
        try {
          iter = this.gen.next(response);
        } catch (ex) {
          this.handleProcessError(ex);
          return;
        }
        if (iter.done) {
          this.done(iter.value);
          return;
        }
        item = iter.value;
      }

      if (isInstruction(item)) {
        // Handle any of the instructions, which are the only meaningful yield outputs inside a process.
        switch (item.op) {
          case PUT: {
            const { channel, value } = item.data;
            putAsync(channel, value, status => this.continue(status));
            break;
          }

          case TAKE: {
            const { channel, except } = item.data;
            takeAsync(channel, value => this.continue(value, except));
            break;
          }

          case ALTS: {
            const { ops, options } = item.data;
            altsAsync(ops, result => this.continue(result), options);
            break;
          }

          case SLEEP: {
            const delay = item.data.delay;
            if (delay === 0) {
              setTimeout(() => this.continue(), 0);
            } else {
              const ch = chan();
              setTimeout(() => ch.close(), delay);
              takeAsync(ch, value => this.continue(value));
            }
            break;
          }
        }
      } else {
        // Handles anything else, though this actually does nothing more than pass the response back into the process.
        this.continue(item);
      }
    }
  };
}

module.exports = {
  TAKE,
  PUT,
  ALTS,
  SLEEP,
  instruction,
  process
};


/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

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
 * A set of channel utilities for converting channels into other kinds of data, and vice versa.
 *
 * @module cispy/util/conversion
 * @private
 */

const { chan, close, CLOSED } = __webpack_require__(0);
const { go, put, take } = __webpack_require__(4);

/**
 * **Creates a single value from a channel by running its values through a reducing function.**
 *
 * For every value put onto the input channel, the reducing function is called with two parameters: the accumulator that
 * holds the result of the reduction so far, and the new input value. The initial value of the accumulator is the third
 * parameter to `reduce`. The reduction is not complete until the input channel closes.
 *
 * This function returns a channel. When the final reduced value is produced, it is put onto this channel, and when that
 * value is taken from it, the channel is closed.
 *
 * ```
 * const {chan, go, put, take, close, util} = cispy;
 * const {reduce} = util;
 *
 * const input = chan();
 * const output = reduce((acc, value) => acc + value, input, 0);
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 *   yield put(input, 3);
 *   close(input);
 * });
 *
 * go(function*() {
 *   const result = yield take(output);
 *   console.log(output);                  // -> 6
 * });
 *
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will ever appear on the output channel. The
 * closing of the channel is what signifies that the reduction should be completed.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/util~reducer} fn The reducer function responsible for turning the series of channel values into
 *     a single output value.
 * @param {module:cispy/core/channel~Channel} ch The channel whose values are being reduced into a single output value.
 * @param {*} init The initial value to feed into the reducer function for the first reduction step.
 * @return {module:cispy/core/channel~Channel} A channel that will, when the input channel closes, have the reduced
 *     value put into it. When this value is taken, the channel will automatically close.
 */
function reduce(fn, ch, init) {
  return go(function*() {
    let result = init;
    for (;;) {
      const value = yield take(ch);
      if (value === CLOSED) {
        return result;
      }
      result = fn(result, value);
    }
  });
}

/**
 * **Puts all values from an array onto the supplied channel.**
 *
 * If no channel is passed to this function, a new channel is created. In effect, this directly converts an array into a
 * channel with the same values on it.
 *
 * The channel is closed after the final array value is put onto it.
 *
 * ```
 * const {chan, go, take, util} = cispy;
 * const {onto} = util;
 *
 * const input = [1, 2, 3];
 * const output = onto(input);
 *
 * go(function*() {
 *   console.log(yield take(output));     // -> 1
 *   console.log(yield take(output));     // -> 2
 *   console.log(yield take(output));     // -> 3
 *   console.log(output.closed);          // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} [ch] The channel onto which to put all of the array elements. If this is
 *     not present, a new channel will be created.
 * @param {Array} array The array of values to be put onto the channel.
 * @return {module:cispy/core/channel~Channel} the channel onto which the array elements are put. This is the same as
 *     the input channel, but if no input channel is specified, this will be a new channel. It will close when the final
 *     value is taken from it.
 */
function onto(ch, array) {
  const [chnl, arr] = Array.isArray(ch) ? [chan(ch.length), ch] : [ch, array];

  go(function*() {
    for (const item of arr) {
      yield put(chnl, item);
    }
    close(chnl);
  });
  return chnl;
}

/**
 * **Takes all of the values from a channel and pushes them into an array.**
 *
 * If no array is passed to this function, a new (empty) one is created. In effect, this directly converts a channel
 * into an array with the same values. Either way, this operation cannot complete until the input channel is closed.
 *
 * This function returns a channel. When the final array is produced, it is put onto this channel, and when that value
 * is taken from it, the channel is closed.
 *
 * ```
 * const {chan, go, put, take, close, util} = cispy;
 * const {into} = util;
 *
 * const input = chan();
 * const output = into(input);
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 *   yield put(input, 3);
 *   close(input);
 * });
 *
 * go(function*() {
 *   const result = yield take(output);
 *   console.log(result);                 // -> [1, 2, 3]
 * });
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will ever appear on the output channel. The
 * closing of the channel is what signifies that all of the values needed to make the array are now available.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {Array} [array] The array to put the channel values into. If this is not present, a new, empty array will be
 *     created.
 * @param {module:cispy/core/channel~Channel} ch The channel from which values are taken to put into the array.
 * @return {module:cispy/core/channel~Channel} A channel that will, when the input channel closes, have the array of
 *     channel values put onto it. When this array is taken, the channel will automatically close.
 */
function into(array, ch) {
  const [arr, chnl] = Array.isArray(array) ? [array, ch] : [[], array];
  const init = arr.slice();

  return reduce(
    (acc, input) => {
      acc.push(input);
      return acc;
    },
    chnl,
    init
  );
}

module.exports = {
  reduce,
  onto,
  into
};


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

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
 * A set of channel utilities for routing channels to other channels in different ways.
 *
 * **In every one of these functions** the source channel will not be available to be taken from, as all of the source
 * channels will have their values taken by the processes within these functions. The lone exception is `tap`, where
 * the regular function of the source channel will be restored if all taps are removed. Even so, while at least one tap
 * is in place, the source channel cannot be taken from.
 *
 * @module cispy/util/flow
 * @private
 */

const { chan, close, CLOSED } = __webpack_require__(0);
const { putAsync, takeAsync } = __webpack_require__(1);
const { go, put, take, alts } = __webpack_require__(4);

// This is only a string for testability, changing it to a symbol would be good
const protocols = {
  taps: '@@multitap/taps'
};

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

/**
 * **Pipes the values from one channel onto another channel.**
 *
 * This ties two channels together so that puts on the source channel can be taken off the destination channel. This
 * does not duplicate values in any way - if another process takes a value off the source channel, it will never appear
 * on the destination channel. In most cases you will not want to take values off a channel once it's piped to another
 * channel, since it's difficult to know which values will go to which channel.
 *
 * Closing either channel will break the connection between the two. If the source channel is closed, the destination
 * channel will by default also be closed. However, passing `true` as the third parameter will cause the destination
 * channel to remain open even when the source channel is closed (the connection is still broken however).
 *
 * Because of the ability to leave the destination channel open, a possible use case for this function is to wrap the
 * destination channel(s) of one of the other flow control functions below to have a channel that survives the source
 * channel closing. The rest of those functions (aside from the special-case `{@link module:cispy/util~CispyUtil.tap}`)
 * automatically close their destination channels when the source channels close.
 *
 * ```
 * const {go, chan, put, take, close, util} = cispy;
 * const {pipe} = util;
 *
 * const input = chan();
 * const output = pipe(input, chan());
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 *   close(input);
 * });
 *
 * go(function*() {
 *   console.log(yield take(output));      // -> 1
 *   console.log(yield take(output));      // -> 2
 *   console.log(output.closed);           // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The source channel.
 * @param {module:cispy/core/channel~Channel} dest The destination channel.
 * @param {boolean} [keepOpen=false] A flag to indicate that the destination channel should be kept open after the
 *     source channel closes. By default the destination channel will close when the source channel closes.
 * @return {module:cispy/core/channel~Channel} The destination channel.
 */
function pipe(src, dest, keepOpen) {
  go(function*() {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED) {
        if (!keepOpen) {
          dest.close();
        }
        break;
      }
      if (!(yield put(dest, value))) {
        break;
      }
    }
  });
  return dest;
}

/**
 * **Creates two new channels and routes values from a source channel to them according to a predicate function.**
 *
 * The supplied function is invoked with every value that is put onto the source channel. Those that return `true` are
 * routed to the first destination channel; those that return `false` are routed to the second.
 *
 * The new channels are created by the function based on the buffer values passed as the third and fourth parameters. If
 * one or both of these are missing, `null`, or `0`, the corresponding destination channel is unbuffered. If one is a
 * positive integer, the corresponding channel is buffered by a fixed buffer of that size. If the parameter for a
 * channel is a buffer, then that buffer is used to buffer the new channel.
 *
 * Both new channels are closed when the source channel is closed.
 *
 *
 * ```
 * const {go, chan, put, take, util} = cispy;
 * const {partition} = util;
 *
 * const input = chan();
 * const [even, odd] = partition(x => x % 2 === 0, input);
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 *   yield put(input, 3);
 *   yield put(input, 4);
 * });
 *
 * go(function*() {
 *   console.log(yield take(even));     // -> 2
 *   console.log(yield take(even));     // -> 4
 * });
 *
 * go(function*() {
 *   console.log(yield take(odd));      // -> 1
 *   console.log(yield take(odd));      // -> 3
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/util~predicate} fn A predicate function used to test each value on the input channel.
 * @param {module:cispy/core/channel~Channel} src The source channel.
 * @param {(number|module:cispy/core/buffers~Buffer)} [tBuffer=0] A buffer used to create the destination channel which
 *     receives all values that passed the predicate. If this is a number, a
 *     {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or not present, the
 *     channel will be unbuffered.
 * @param {(number|module:cispy/core/buffers~Buffer)} [fBuffer=0] A buffer used to create the destination channel which
 *     receives all values that did not pass the predicate. If this is a number, a
 *     {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or not present, the
 *     channel will be unbuffered.
 * @return {module:cispy/core/channel~Channel[]} An array of two channels. The first is the destination channel with all
 *     of the values that passed the predicate, the second is the destination channel with all of the values that did
 *     not pass the predicate.
 */
function partition(fn, src, tBuffer = 0, fBuffer = 0) {
  const tDest = chan(tBuffer);
  const fDest = chan(fBuffer);

  go(function*() {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED) {
        close(tDest);
        close(fDest);
        break;
      }
      yield put(fn(value) ? tDest : fDest, value);
    }
  });
  return [tDest, fDest];
}

/**
 * **Merges one or more channels into a single destination channel.**
 *
 * Values are given to the destination channel as they are put onto the source channels. If `merge` is called when there
 * are already values on multiple source channels, the order that they're put onto the destination channel is random.
 *
 * The destination channel is created by the function based on the buffer value passed as the second parameter. If this
 * is missing, `null`, or `0`, the destination channel will be unbuffered. If it's a positive integer, the destination
 * channel is buffered by a fixed buffer of that size. If the parameter is a buffer, then that buffer is used to buffer
 * the destination channel.
 *
 * As each source channel closes, it is removed from the merge, leaving the channels that are still open to continue
 * merging. When *all* of the source channels close, then the destination channel is closed.
 *
 * ```
 * const {go, chan, put, take, util} = cispy;
 * const {merge} = util;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = merge([input1, input2, input3]);
 *
 * go(function*() {
 *   // Because we're putting to all three channels in the same
 *   // process, we know the order in which the values will be
 *   // put on the output channel; in general, we won't know this
 *   yield put(input1, 1);
 *   yield put(input2, 2);
 *   yield put(input3, 3);
 * });
 *
 * go(function*() {
 *   console.log(yield take(output));      // -> 1
 *   console.log(yield take(output));      // -> 2
 *   console.log(yield take(output));      // -> 3
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel[]} srcs An array of source channels.
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer=0] A buffer used to create the destination channel. If
 *     this is a number, a {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or
 *     not present, the channel will be unbuffered.
 * @return {module:cispy/core/channel~Channel} The destination channel, which will receive all values put onto every
 *     source channel.
 */
function merge(srcs, buffer = 0) {
  const dest = chan(buffer);
  const inputs = srcs.slice();

  go(function*() {
    for (;;) {
      if (inputs.length === 0) {
        break;
      }
      const { value, channel } = yield alts(inputs);
      if (value === CLOSED) {
        const index = inputs.indexOf(channel);
        inputs.splice(index, 1);
        continue;
      }
      yield put(dest, value);
    }
    close(dest);
  });
  return dest;
}

/**
 * **Splits a single channel into multiple destination channels, with each destination channel receiving every value put
 * onto the source channel.**
 *
 * Every parameter after the first represents the buffer from a single destination channel. Each `0` or `null` will
 * produce an unbuffered channel, while each positive integer will produce a channel buffered by a fixed buffer of that
 * size. Each buffer will produce a buffered channel backed by that buffer. If there are no parameters after the first,
 * then two unbuffered channels will be produced as a default.
 *
 * When the source channel is closed, all destination channels will also be closed. However, if destination channels are
 * closed, they do nothing to the source channel.
 *
 * ```
 * const {go, chan, put, take, util} = cispy;
 * const {split} = util;
 *
 * const input = chan();
 * const outputs = split(input, 3);
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 *   yield put(input, 3);
 * });
 *
 * go(function*() {
 *   for (const output of outputs) {       // Each output will happen 3 times
 *     console.log(yield take(output));    // -> 1
 *     console.log(yield take(output));    // -> 2
 *     console.log(yield take(output));    // -> 3
 *   }
 * });
 * ```
 *
 * This function moves its values to the output channels asynchronously. This means that even when using unbuffered
 * channels, it is not necessary for all output channels to be taken from before the next put to the input channel can
 * complete.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param  {module:cispy/core/channel~Channel} src The source channel.
 * @param  {...(number|module:cispy/core/buffers~Buffer)} [buffers=2] The buffers used to create the destination
 *     channels. Each entry is treated separately. If one is a number, then a
 *     {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If one is a `0`, then the corresponding
 *     channel will be unbuffered. **Exception:** if a single number is passed, then that number of unbuferred channels
 *     will be created. This means that the default is to create two unbuffered channels. To create a single channel
 *     with a fixed buffer, use `{@link cispy~Cispy.fixedBuffer}` explicitly.
 * @return {module:cispy/core/channel~Channel[]} An array of destination channels.
 */
function split(src, ...buffers) {
  const dests = [];

  let bs = buffers.length === 0 ? [2] : buffers;
  if (bs.length === 1 && isNumber(bs[0])) {
    const [count] = bs;
    bs = [];
    for (let i = 0; i < count; ++i) {
      bs.push(0);
    }
  }

  for (const b of bs) {
    dests.push(chan(b));
  }

  const doneCh = chan();
  let doneCount = 0;
  function done() {
    if (--doneCount === 0) {
      putAsync(doneCh);
    }
  }

  go(function*() {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED) {
        for (const dest of dests) {
          close(dest);
        }
        break;
      }

      doneCount = dests.length;
      for (const dest of dests) {
        putAsync(dest, value, done);
      }
      yield take(doneCh);
    }
  });
  return dests;
}

/**
 * Utility function to add the ability to be tapped to a channel that is being tapped. This will add a single property
 * to that channel only (named '@@multitap/taps' so as to decrease the chance of collision), but the tapping
 * functionality itself is provided outside the channel object. This new property is an array of the channels tapping
 * this channel, and it will be removed if all taps are removed.
 *
 * @param {module:cispy/core/channel~Channel} src The source channel to be tapped.
 * @private
 */
function tapped(src) {
  // Make the new property non-enumerable
  Object.defineProperty(src, protocols.taps, {
    configurable: true,
    writable: true,
    value: []
  });

  const doneCh = chan();
  let doneCount = 0;
  function done() {
    if (--doneCount === 0) {
      putAsync(doneCh);
    }
  }

  go(function*() {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED || src[protocols.taps].length === 0) {
        delete src[protocols.taps];
        break;
      }

      doneCount = src[protocols.taps].length;
      for (const tap of src[protocols.taps]) {
        putAsync(tap, value, done);
      }
      yield take(doneCh);
    }
  });
}

/**
 * **Taps a channel, sending all of the values put onto it to the destination channel.**
 *
 * A source channel can be tapped multiple times, and all of the tapping (destination) channels receive each value put
 * onto the tapped (source) channel.
 *
 * This is different from `{@link module:cispy/util~CispyUtil.split}` in that it's temporary. Channels can tap a channel
 * and then untap it, multiple times, as needed. If a source channel has all of its taps removed, then it reverts to a
 * normal channel, just as it was before it was tapped.
 *
 * Also unlike `{@link module:cispy/util~CispyUtil.split}`, each call can only tap once. For multiple channels to tap a
 * source channel, `tap` has to be called multiple times.
 *
 * Closing either the source or any of the destination channels has no effect on any of the other channels.
 *
 * ```
 * const {go, chan, put, take, util} = cispy;
 * const {tap} = util;
 *
 * const input = chan();
 * const tapper = chan();
 * tap(input, tapper);
 *
 * go(function*() {
 *   yield put(input, 1);
 *   yield put(input, 2);
 * });
 *
 * go(function*() {
 *   console.log(yield take(tapper));   // -> 1
 *   console.log(yield take(tapper));   // -> 2
 * });
 *
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The channel to be tapped.
 * @param {module:cispy/core/channel~Channel} [dest] The channel tapping the source channel. If this is not present,
 *     a new unbuffered channel will be created.
 * @return {module:cispy/core/channel~Channel} The destination channel. This is the same as the second argument, if
 *     present; otherwise it is the newly-created channel tapping the source channel.
 */
function tap(src, dest = chan()) {
  if (!src[protocols.taps]) {
    tapped(src);
  }
  if (!~src[protocols.taps].indexOf(dest)) {
    src[protocols.taps].push(dest);
  }
  return dest;
}

/**
 * **Untaps a previously tapping destination channel from its source channel.**
 *
 * This removes a previously created tap. The destination (tapping) channel will stop receiving the values put onto the
 * source channel.
 *
 * If the destination channel was not, in fact, tapping the source channel, this function will do nothing. If all taps
 * are removed, the source channel reverts to normal (i.e., it no longer has the tapping code applied to it and can be
 * taken from as normal).
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The tapped channel.
 * @param {module:cispy/core/channel~Channel} dest The channel that is tapping the source channel that should no longer
 *     be tapping the source channel.
 */
function untap(src, dest) {
  if (src[protocols.taps]) {
    const index = src[protocols.taps].indexOf(dest);
    if (index !== -1) {
      src[protocols.taps].splice(index, 1);
      if (src[protocols.taps].length === 0) {
        // We have to do this because a tapped channel sits waiting in a while loop for a take to happen, and once all
        // of the taps are removed, it will STILL be waiting. This reverts it back to a normal put/take response.
        putAsync(src);
      }
    }
  }
}

/**
 * **Removes all taps from a source channel.**
 *
 * The previously-tapped channel reverts to a normal channel, while any channels that might have been tapping it no
 * longer receive values from the source channel. If the source channel had no taps, this function does nothing.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The tapped channel. All taps will be removed from this channel.
 */
function untapAll(src) {
  if (src[protocols.taps]) {
    src[protocols.taps] = [];
    putAsync(src);
  }
}

/**
 * **Maps the values from one or more source channels through a function, putting the results on a new channel.**
 *
 * The mapping function is given one value from each source channel, after at least one value becomes available on every
 * source channel. The output value from the function is then put onto the destination channel.
 *
 * The destination channel is created by the function based on the buffer value passed as the third parameter. If this
 * is missing, `null`, or `0`, the destination channel will be unbuffered. If it's a positive integer, the destination
 * channel is buffered by a fixed buffer of that size. If the parameter is a buffer, then that buffer is used to buffer
 * the destination channel.
 *
 * Once *any* source channel is closed, the mapping ceases and the destination channel is also closed.
 *
 * This is obviously similar to a map transducer, but unlike a transducer, this function works with multiple input
 * channels. This is something that a transducer on a single channel is unable to do.
 *
 * ```
 * const {go, chan, put, take, close, util} = cispy;
 * const {map} = util;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = map((x, y, z) => x + y + z, [input1, input2, input3]);
 *
 * go(function*() {
 *   yield put(input1, 1);
 *   yield put(input1, 2);
 *   yield put(input1, 3);
 * });
 *
 * go(function*() {
 *   yield put(input2, 10);
 *   yield put(input2, 20);
 *   close(input2);
 * });
 *
 * go(function*() {
 *   yield put(input3, 100);
 *   yield put(input3, 200);
 *   yield put(input3, 300);
 * });
 *
 * go(function*() {
 *   console.log(yield take(output));     // -> 111
 *   console.log(yield take(output));     // -> 222
 *   // Output closes now because input2 closes after 2 values
 *   console.log(output.closed);          // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/util~mapper} fn The mapping function. This should have one parameter for each source channel
 *     and return a single value.
 * @param {module:cispy/core/channel~Channel[]} srcs The source channels.
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer=0] A buffer used to create the destination channel. If
 *     this is a number, a {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or
 *     not present, the channel will be unbuffered.
 * @return {module:cispy/core/channel~Channel} The destination channel.
 */
function map(fn, srcs, buffer = 0) {
  const dest = chan(buffer);
  const srcLen = srcs.length;
  const values = [];
  const callbacks = [];
  const temp = chan();
  let count;

  for (let i = 0; i < srcLen; ++i) {
    callbacks[i] = (index => {
      return value => {
        values[index] = value;
        if (--count === 0) {
          putAsync(temp, values.slice());
        }
      };
    })(i);
  }

  go(function*() {
    for (;;) {
      count = srcLen;
      for (let i = 0; i < srcLen; ++i) {
        takeAsync(srcs[i], callbacks[i]);
      }
      const values = yield take(temp);
      for (const value of values) {
        if (value === CLOSED) {
          close(dest);
          return;
        }
      }
      yield put(dest, fn(...values));
    }
  });
  return dest;
}

module.exports = {
  pipe,
  partition,
  merge,
  split,
  tap,
  untap,
  untapAll,
  map
};


/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

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
 * A set of channel utilities for changing the timing of inputs being put onto the input channel.
 *
 * @module  cispy/util/timing
 * @private
 */

const { chan, timeout, close, CLOSED } = __webpack_require__(0);
const { go, put, alts } = __webpack_require__(4);

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

/**
 * **Debounces an input channel.**
 *
 * Debouncing is the act of turning several input values into one. For example, debouncing a channel driven by a
 * `mousemove` event would cause only the final `mousemove` event to be put onto the channel, dropping all of the other
 * ones. This can be desirable because `mousemove` events come in bunches, being produced continually while the mouse is
 * moving, and often all that we really care about is to learn where the mouse ended up.
 *
 * This function does this by controlling which values that have been put onto the source channel are made available on
 * the destination channel, and when.
 *
 * The `delay` parameter determines the debounce threshold. Once the first value is put onto the source channel,
 * debouncing is in effect until the number of milliseconds in `delay` passes without any other value being put onto
 * that channel. In other words, the delay will be refreshed if another value is put onto the source channel before the
 * delay elapses. After a full delay interval passes without a value being placed on the source channel, the last value
 * put becomes available on the destination channel.
 *
 * This behavior can be modified through four options: `leading`, `trailing`, `maxDelay`, and `cancel`.
 *
 * If both `leading` and `trailing` are `true`, values will not be duplicated. The first value put onto the source
 * channel will be put onto the destination channel immediately (per `leading`) and the delay will begin, but a value
 * will only be made available on the destination channel at the end of the delay (per `trailing`) if *another* input
 * value was put onto the source channel before the delay expired.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The source channel.
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer=0] A buffer used to create the destination channel. If
 *     this is a number, a {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or
 *     not present, the channel will be unbuffered.
 * @param {number} delay The debouncing delay, in milliseconds.
 * @param {Object} [options={}] A set of options to further configure the debouncing.
 * @param {boolean} [options.leading=false] Instead of making a value available on the destination channel after the
 *     delay passes, the first value put onto the source channel is made available *before* the delay begins. No value
 *     is available on the destination channel after the delay has elapsed (unless `trailing` is also `true`).
 * @param {boolean} [options.trailing=true] The default behavior, where a value is not made available on the destination
 *     channel until the entire delay passes without a new value being put on the source channel.
 * @param {number} [options.maxDelay=0] The maximum delay allowed before a value is put onto the destination channel.
 *     Debouncing can, in theory, go on forever as long as new input values continue to be put onto the source channel
 *     before the delay expires. Setting this option to a positive number sets the maximum number of milliseconds that
 *     debouncing can go on before it's forced to end, even if in the middle of a debouncing delay. Having debouncing
 *     end through the max delay operates exactly as if it had ended because of lack of input; the last input is made
 *     available on the destination channel (if `trailing` is `true`), and the next input will trigger another debounce
 *     operation.
 * @param {module:cispy/core/channel~Channel} [options.cancel] A channel used to signal a cancellation of the
 *     debouncing. Any value put onto this channel will cancel the current debouncing operation, closing the output
 *     channel and discarding any values that were waiting for the debounce threshold timer to be sent to the output.
 * @return {module:cispy/core/channel~Channel}} The newly-created destination channel, where all of the values will be
 *     debounced from the source channel.
 */
function debounce(src, buffer, delay, options) {
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign(
    { leading: false, trailing: true, maxDelay: 0, cancel: chan() },
    (isNumber(delay) ? options : delay) || {}
  );

  const dest = chan(buf);
  const { leading, trailing, maxDelay, cancel } = opts;

  go(function*() {
    let timer = chan();
    let max = chan();
    let current = CLOSED;

    for (;;) {
      const { value, channel } = yield alts([src, timer, max, cancel]);

      if (channel === cancel) {
        close(dest);
        break;
      }
      if (channel === src) {
        if (value === CLOSED) {
          close(dest);
          break;
        }

        const timing = timer.timeout;
        timer = timeout(del);

        if (!timing && maxDelay > 0) {
          max = timeout(maxDelay);
        }

        if (leading) {
          if (!timing) {
            yield put(dest, value);
          } else {
            current = value;
          }
        } else if (trailing) {
          current = value;
        }
      } else {
        timer = chan();
        max = chan();
        if (trailing && current !== CLOSED) {
          yield put(dest, current);
          current = CLOSED;
        }
      }
    }
  });

  return dest;
}

/**
 * **Throttles an input channel.**
 *
 * Throttling is the act of ensuring that something only happens once per time interval. In this case, it means that a
 * value put onto the source channel is only made available to the destination channel once per a given number of
 * milliseconds. An example usage would be with window scroll events; these events are nearly continuous as scrolling is
 * happening, and perhaps we don't want to call an expensive UI updating function every time a scroll event is fired. We
 * can throttle the input channel and make it only offer up the scroll events once every 100 milliseconds, for instance.
 *
 * Throttling is effected by creating a new channel as a throttled destination for values put onto the source channel.
 * Values will only appear on that destination channel once per delay interval; other values that are put onto the
 * source channel in the meantime are discarded.
 *
 * The `delay` parameter controls how often a value can become available on the destination channel. When the first
 * value is put onto the source channel, it is immediately put onto the destination channel as well and the delay
 * begins. Any further values put onto the source channel during that delay are *not* passed through; only when the
 * delay expires is the last input value made available on the destination channel. The delay then begins again, so that
 * further inputs are squelched until *that* delay passes. Throttling continues, only allowing one value through per
 * interval, until an entire interval passes without input.
 *
 * This behavior can be modified by three options: `leading`, `trailing`, and `cancel`.
 *
 * If both `leading` and `trailing` are `true`, values will not be duplicated. The first value put onto the source
 * channel will be put onto the destination channel immediately (per `leading`) and the delay will begin, but a value
 * will only be made available on the destination channel at the end of the delay (per `trailing`) if *another* input
 * value was put onto the source channel before the delay expired.
 *
 * @memberOf module:cispy/util~CispyUtil
 * @param {module:cispy/core/channel~Channel} src The source channel.
 * @param {(number|module:cispy/core/buffers~Buffer)} [buffer=0] A buffer used to create the destination channel. If
 *     this is a number, a {@link module:cispy/core/buffers~FixedBuffer} of that size will be used. If this is `0` or
 *     not present, the channel will be unbuffered.
 * @param {number} delay The throttling delay, in milliseconds.
 * @param {Object} [options={}] A set of options to further configure the throttling.
 * @param {boolean} [options.leading=true] Makes the value that triggered the throttling immediately available on the
 *     destination channel before beginning the delay. If this is `false`, the first value will not be put onto the
 *     destination channel until a full delay interval passes.
 * @param {boolean} [options.trailing=true] Makes the last value put onto the source channel available on the
 *     destination channel when the delay expires. If this is `false`, any inputs that come in during the delay are
 *     ignored, and the next value is not put onto the destination channel until the first input *after* the delay
 *     expires.
 * @param {module:cispy/core/channel~Channel} [options.cancel] A channel used to signal a cancellation of the
 *     throttling. Any value put onto this channel will cancel the current throttling operation, closing the output
 *     channel and discarding any values that were waiting for the throttle threshold timer to be sent to the output.
 * @return {module:cispy/core/channel~Channel}} The newly-created destination channel, where all of the values will be
 *     throttled from the source channel.
 */
function throttle(src, buffer, delay, options) {
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign(
    { leading: true, trailing: true, cancel: chan() },
    (isNumber(delay) ? options : delay) || {}
  );

  const dest = chan(buf);
  const { leading, trailing, cancel } = opts;

  go(function*() {
    let timer = chan();
    let current = CLOSED;

    for (;;) {
      const { value, channel } = yield alts([src, timer, cancel]);

      if (channel === cancel) {
        close(dest);
        break;
      } else if (channel === src) {
        if (value === CLOSED) {
          close(dest);
          break;
        }

        const timing = timer.timeout;
        if (!timing) {
          timer = timeout(del);
        }

        if (leading) {
          if (!timing) {
            yield put(dest, value);
          } else if (trailing) {
            current = value;
          }
        } else if (trailing) {
          current = value;
        }
      } else if (trailing && current !== CLOSED) {
        timer = timeout(del);
        yield put(dest, current);
        current = CLOSED;
      } else {
        timer = chan();
      }
    }
  });

  return dest;
}

module.exports = {
  debounce,
  throttle
};


/***/ }),
/* 17 */,
/* 18 */,
/* 19 */,
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

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

const { fixed, sliding, dropping, EMPTY } = __webpack_require__(2);
const { chan, timeout, close, CLOSED, DEFAULT } = __webpack_require__(0);
const { putAsync, takeAsync, altsAsync } = __webpack_require__(1);
const { config, SET_IMMEDIATE, MESSAGE_CHANNEL, SET_TIMEOUT } = __webpack_require__(3);

const { go, goSafe, spawn, put, take, takeOrThrow, alts, sleep } = __webpack_require__(4);

const util = __webpack_require__(11);

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
  config,
  fixedBuffer: fixed,
  slidingBuffer: sliding,
  droppingBuffer: dropping,
  CLOSED,
  DEFAULT,
  EMPTY,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT,

  /**
   * **A set of utility functions for working with channels.**
   *
   * This is a small 'standard library' of operations that are useful when working with channels.
   *
   * @type {module:cispy/util~CispyUtil}
   * @memberOf module:cispy~Cispy
   */
  util
};


/***/ })
/******/ ]);
});