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
/******/ 	return __webpack_require__(__webpack_require__.s = 21);
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
/* 4 */,
/* 5 */
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
 * Core operations for channels working with async functions.
 *
 * @module cispy/promise/operations
 * @private
 */

const { chan } = __webpack_require__(0);
const { putAsync, takeAsync, altsAsync } = __webpack_require__(1);

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


/***/ }),
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
/***/ (function(module, exports, __webpack_require__) {

(function webpackUniversalModuleDefinition(root, factory) {
	if(true)
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["xduce"] = factory();
	else
		root["xduce"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

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

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 107);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _sign = __webpack_require__(62);

var _sign2 = _interopRequireDefault(_sign);

var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _getPrototypeOf = __webpack_require__(64);

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * A whole bunch of utility functions. These are all used by the library itself in places, but many of them are
 * suitable for general use as well.
 ^
 * @module util
 * @private
 */

/**
 * `Object`'s `toString` is explicitly used throughout because it could be redefined in any subtype of `Object`.
 *
 * @function toString
 * @private
 */
var toString = Object.prototype.toString;

/**
 * **Determines whether a value is an array.**
 *
 * This function merely delegates to `Array.isArray`. It is provided for consistency in calling style only.
 *
 * @function isArray
 * @memberof module:xduce.util
 *
 * @param {*} x The value being tested to see if it is an array.
 * @return {boolean} Either `true` if the test value is an array or `false` if it is not.
 */
var isArray = Array.isArray;

/**
 * **Determines whether a value is a function.**
 *
 * @memberof module:xduce.util
 *
 * @param {*} x The value being tested to see if it is a function.
 * @return {boolean} Either `true` if the test value is a function or `false` if it is not.
 */
function isFunction(x) {
  return toString.call(x) === '[object Function]';
}

/**
 * **Determines whether a value is a plain object.**
 *
 * This function returns `false` if the value is any other sort of built-in object (such as an array or a string). It
 * also returns `false` for any object that is created by a constructor that is not `Object`'s constructor, meaning that
 * "instances" of custom "classes" will return `false`. Therefore it's only going to return `true` for literal objects
 * or those created with `Object.create()`.
 *
 * @memberof module:xduce.util
 *
 * @param {*} x The value being tested to see if it is a plain object.
 * @return {boolean} Either `true` if the test value is a plain object or `false` if it is not.
 */
function isObject(x) {
  // This check is true on all objects, but also on all objects created by custom constructors (which we don't want).
  // Note that in ES2015 and later, objects created by using `new` on a `class` will return false directly right here.
  if (toString.call(x) !== '[object Object]') {
    return false;
  }

  // The Object prototype itself passes, along with objects created without a prototype from Object.create(null);
  var proto = (0, _getPrototypeOf2.default)(x);
  if (proto === null) {
    return true;
  }

  // Check to see whether the constructor of the tested object is the Object constructor,
  var ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return typeof ctor === 'function' && ctor === Object;
}

/**
 * **Determines whether a value is a number.**
 *
 * This function will return `true` for any number literal or instance of `Number` except for `Infinity` or `NaN`. It
 * will return `false` for strings that happen to also be numbers; the value must be an actual `Number` instance or
 * number literal to return `true`.
 *
 * @memberof module:xduce.util
 *
 * @param {*} x The value being tested to see if it is a number.
 * @return {boolean} Either `true` if the test value is a finite number (not including string representations of
 *     numbers) or `false` if it is not.
 */
function isNumber(x) {
  return toString.call(x) === '[object Number]' && isFinite(x);
}

/**
 * **Determines whether a value is a string.**
 *
 * Literal strings will return `true`, as will instances of the `String` object.
 *
 * @memberof module:xduce.util
 *
 * @param {*} x The value being tested to see if it is a string.
 * @return {boolean} Either `true` if the test value is a string or `false` if it is not.
 */
function isString(x) {
  return toString.call(x) === '[object String]';
}

/**
 * **Returns the character at a particular index in a string, taking double-width
 * <abbr title="Basic Multilingual Plane">BMP</abbr> characters into account.**
 *
 * This is a BMP version of the standard JavaScript `string.charAt` function. The index is adjusted to account for
 * double-width characters in the input string, and if the resulting character is double-width, it will be returned as a
 * two-character string. The second half of these double-width characters don't get assigned an index at all, so it
 * works seemlessly between character widths.
 *
 * @function charAt
 * @memberof module:xduce.util.bmp
 *
 * @param {string} str The input string whose character at the given index is sought.
 * @param {number} index The index in the input string of the character being sought.
 * @return {string} The character at the given index in the provided string. If this character is a BMP character,
 *     the full character will be returned as a two-character string.
 */
function bmpCharAt(str, index) {
  var s = str + '';
  var i = index;
  var end = s.length;

  var pairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;
  while (pairs.exec(s)) {
    var li = pairs.lastIndex;
    if (li - 2 < i) {
      i++;
    } else {
      break;
    }
  }

  if (i >= end || i < 0) {
    return '';
  }

  var result = s.charAt(i);

  if (/[\uD800-\uDBFF]/.test(result) && /[\uDC00-\uDFFF]/.test(s.charAt(i + 1))) {
    result += s.charAt(i + 1);
  }

  return result;
}

/**
 * **Calculates the length of a string, taking double-width <abbr title="Basic Multilingual Plane">BMP</abbr>
 * characters into account.**
 *
 * Since this function takes double-width characters into account and the build in string `length` property does not,
 * it is entirely possible for this function to provide a different result than querying the same string's `length`
 * property.
 *
 * @function length
 * @memberof module:xduce.util.bmp
 *
 * @param {string} str The string whose length is being determined.
 * @return {number} The number of characters in the string, counting double-width BMP characters as single characters.
 */
function bmpLength(str) {
  var s = str + '';

  var matches = s.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
  var count = matches ? matches.length : 0;
  return s.length - count;
}

/**
 * **Creates an array of values between the specified ranges.**
 *
 * The actual range is `[start, end)`, meaning that the start value is a part of the array, but the end value is not.
 *
 * If only one parameter is supplied, it is taken to be `end`, and `start` is set to 0. If there is a third parameter,
 * it defines the distance between each successive element of the array; if this is missing, it's set to 1 if `start` is
 * less than `end` (an ascending range) or -1 if `end` is less than `start` (a descending range).
 *
 * If the step is going in the wrong direction - it's negative while `start` is less than `end`, or vice versa - then
 * the `start` value will be the only element in the returned array. This prevents the function from trying to
 * generate infinite ranges.
 *
 * ```
 * const { range } = xduce.util;
 *
 * console.log(range(5));         // -> [0, 1, 2, 3, 4]
 * console.log(range(1, 5));      // -> [1, 2, 3, 4]
 * console.log(range(0, 5, 2));   // -> [0, 2, 4]
 * console.log(range(5, 0, -1));  // -> [5, 4, 3, 2, 1]
 * console.log(range(5, 0));      // -> [5, 4, 3, 2, 1]
 * console.log(range(0, 5, -2));  // -> [0]
 * ```
 *
 * @memberof module:xduce.util
 *
 * @param {number} [start=0] The starting point, inclusive, of the array. This value will be the first value of the
 *     array.
 * @param {number} end The ending point, exclusive, of the array. This value will *not* be a part of the array; it will
 *     simply define the upper (or lower, if the array is descending) bound.
 * @param {number} [step=1|-1] The amount that each element of the array increases over the previous element. If this is
 *     not present, it will default to `1` if `end` is greater than `start`, or `-1` if `start` is greater than `end`.
 * @return {number[]} An array starting at `start`, with each element increasing by `step` until it reaches the last
 *     number before `end`.
 */
function range(start, end, step) {
  var _ref = end == null ? [0, start] : [start, end],
      _ref2 = (0, _slicedToArray3.default)(_ref, 2),
      s = _ref2[0],
      e = _ref2[1];

  var t = step || (s > e ? -1 : 1);

  // This aborts the production if a bad step is given; i.e., if the step is going in a direction that does not lead
  // to the end. This prevents the function from never reaching the end value and trying to create an infinite range.
  if ((0, _sign2.default)(t) !== (0, _sign2.default)(e - s)) {
    return [s];
  }

  var result = [];
  for (var i = s; t < 0 ? i > e : i < e; i += t) {
    result.push(i);
  }
  return result;
}

/**
 * **Creates a function that returns the opposite of the supplied predicate function.**
 *
 * The parameter lists of the input and output functions are exactly the same. The only difference is that the two
 * functions will return opposite results. If a non-predicate function is passed into this function, the resulting
 * function will still return a boolean that is the opposite of the truthiness of the original.
 *
 * ```
 * const even = x => x % 2 === 0;
 * const odd = xduce.util.complement(even);
 *
 * console.log(even(2));      // -> true
 * console.log(odd(2));       // -> false
 * ```
 *
 * @memberof module:xduce.util
 *
 * @param {function} fn A predicate function.
 * @return {function} A new function that takes the same arguments as the input function but returns the opposite
 *     result.
 */
function complement(fn) {
  return function () {
    return !fn.apply(undefined, arguments);
  };
}

module.exports = {
  isArray: isArray,
  isObject: isObject,
  isFunction: isFunction,
  isString: isString,
  isNumber: isNumber,
  bmpCharAt: bmpCharAt,
  bmpLength: bmpLength,
  range: range,
  complement: complement
};

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _iterator = __webpack_require__(67);

var _iterator2 = _interopRequireDefault(_iterator);

var _for = __webpack_require__(66);

var _for2 = _interopRequireDefault(_for);

var _symbol = __webpack_require__(24);

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Iteration: a part of the ES6 standard.
 * Transduction: agreed to by several parties who maintain transducer libraries in the comment thread for an issue on
 *     one of them ({@link https://github.com/cognitect-labs/transducers-js/issues/20}).
 *
 * @module protocol
 * @private
 */

var _require = __webpack_require__(0),
    isFunction = _require.isFunction;

/**
 * Whether or not to use symbols for protocol property names if they're available. Even if this is set to `true`,
 * strings will be used for the names if symbols are not available.
 *
 * @private
 * @type {boolean}
 */


var USE_SYMBOLS = true;

/**
 * Whether or not symbols are available in the environment.
 *
 * @private
 * @type {boolean}
 */
var symbol = typeof _symbol2.default !== 'undefined';

/**
 * Generation of the key used on an object to store a protocol function. This is a symbol if symbols are available and
 * {@link module:protocol~USE_SYMBOLS} is set to true; if not, it's a regular string. If a symbol of the supplied name
 * already exists, it'll be used instead of having a new one generated.
 *
 * @private
 *
 * @param {name} name The name of the protocol to generate a key name for.
 * @return {(string|Symbol)} The property key name to use. This is a Symbol if configured to use symbols and if they're
 *     available; otherwise it's a string.
 */
function generateKey(name) {
  return USE_SYMBOLS && symbol ? (0, _for2.default)(name) : '@@' + name;
}

/**
 * **The mapping of protocol names to their respective property key names.**
 *
 * The values of this map will depend on whether symbols are available, whatever is present here will be used as key
 * names for protocol properties throughout the library.
 *
 * @memberof module:xduce
 * @type {module:xduce~protocolMap}
 */
var protocols = {
  // Since this one is built in, it already has a custom Symbol property, so we don't need to generate a symbol for a
  // key when symbols are supported.
  iterator: symbol ? _iterator2.default : '@@iterator',

  // Reduction protocols
  init: generateKey('transducer/init'),
  step: generateKey('transducer/step'),
  result: generateKey('transducer/result'),
  reduced: generateKey('transducer/reduced'),
  value: generateKey('transducer/value')
};

/**
 * Determines whether an object implements a given protocol. Generally, a protocol is implemented if the object has a
 * function property with the name of that protocol (as given in the protocol object). For iteration, it's accepted that
 * an object with a `next` function is also an iterator, so we make a specific check for that.
 *
 * For the reduced and value protocols, the requirement that the property be a function is waived.
 *
 * @private
 *
 * @param {*} obj The value to be checked to see if it implements a protocol.
 * @param {string} protocol The short name of the protocol, as reflected in {@link module:xduce.protocols|protocols}.
 *     This is one of `iterator`, `init`, `step`, `result`, `reduced`, or `value`.
 * @return {boolean} Either `true` if the value implements the protocol or `false` if it does not.
 */
function isImplemented(obj, protocol) {
  if (obj == null) {
    return false;
  }
  switch (protocol) {
    case 'iterator':
      return isFunction(obj[protocols.iterator] || obj.next);
    case 'reduced':
    case 'value':
      return protocols[protocol] in obj;
    default:
      return isFunction(obj[protocols[protocol]]);
  }
}

module.exports = {
  protocols: protocols,
  isImplemented: isImplemented
};

/***/ }),
/* 2 */
/***/ (function(module, exports) {

var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _defineProperty = __webpack_require__(63);

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (obj, key, value) {
  if (key in obj) {
    (0, _defineProperty2.default)(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * @module transformation
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols,
    isImplemented = _require.isImplemented;

var _require2 = __webpack_require__(20),
    isKvFormObject = _require2.isKvFormObject,
    iterator = _require2.iterator;

var _require3 = __webpack_require__(13),
    isCompleted = _require3.isCompleted,
    reduce = _require3.reduce,
    arrayReducer = _require3.arrayReducer,
    objectReducer = _require3.objectReducer,
    stringReducer = _require3.stringReducer;

var _require4 = __webpack_require__(0),
    isArray = _require4.isArray,
    isObject = _require4.isObject,
    isString = _require4.isString;

var p = protocols;

// An iterator that also acts as a transformer, transforming its collection one element at a time. This is the actual
// output of the sequence function (when the input collection is an iterator) and the asIterator function.
//
// This object supports non-1-to-1 correspondences between input and output values. For example, a filter transformation
// might return fewer output elements than were in the input collection, while a repeat transformation will return more.
// In either case, `next` in this class will return one element per call.
/**
 * Creates an iterator that is also a transducer, transforming its collection one element at a time. This is the
 * actual output of the {@link module:xduce.asIterator|asIterator} function, as well as the output of the
 * {@link module:xduce.sequence|sequence} function when the input is an iterator.
 *
 * The end user need not be concerned with the type of the output iterator in these circumstances; the end user need
 * only care that the output is, in fact, an iterator and can be expected to act like one. For this reason, this
 * function and the type it returns are not exported.
 *
 * This object supports non-1-to-1 correspondences between input and output values. For example, a filter transformation
 * might return fewer output elements than were in the input collection, while a repeat transformation will return more.
 * In either case, `next` in this class will return one element per call.
 *
 * @private
 *
 * @param {*} collection the input collection that the produced iterator will be iterating over.
 * @param {module:xduce~transducerFunction} xform A function that creates a transducer object that defines the
 *     transformation being done to the iterator's elements. Any of the {@link module:xduce.transducers|transducers} in
 *     this library can produce a suitable transducer function.
 * @return {module:xduce~iterator} An iterator that will transform its input elements using the transducer function as
 *     its `{@link module:xduce~next|next}` function is called.
 */
function transducingIterator(collection, xform) {
  var _stepReducer, _ref2;

  var stepReducer = (_stepReducer = {}, (0, _defineProperty3.default)(_stepReducer, p.step, function (xiter, input) {
    var value = isKvFormObject(input) ? (0, _defineProperty3.default)({}, input.k, input.v) : input;
    xiter.items.unshift(value);
    return xiter;
  }), (0, _defineProperty3.default)(_stepReducer, p.result, function (value) {
    return value;
  }), _stepReducer);

  var iter = iterator(collection, null, true);
  var xf = xform(stepReducer);
  var reduced = false;

  return _ref2 = {
    // This array is the key to working properly with step functions that return more than one value. All of them are
    // put into the items array. As long as this array has values in it, the `next` function will return one value
    // popped from it rather than running the step function again.
    items: []

  }, (0, _defineProperty3.default)(_ref2, p.iterator, function () {
    return this;
  }), (0, _defineProperty3.default)(_ref2, 'next', function next() {
    if (this.items.length === 0) {
      this.step();
    }
    if (this.items.length === 0) {
      return {
        done: true
      };
    }
    return {
      value: this.items.pop(),
      done: false
    };
  }), (0, _defineProperty3.default)(_ref2, 'step', function step() {
    var count = this.items.length;
    while (this.items.length === count) {
      var step = iter.next();
      if (step.done || reduced) {
        xf[p.result](this);
        break;
      }
      reduced = isCompleted(xf[p.step](this, step.value));
    }
  }), _ref2;
}

/**
 * **Transforms the elements of the input collection and reduces them into an output collection.**
 *
 * This is the lowest-level of the transduction functions that is likely to see regular use. It does not assume anything
 * about the reducer, as it asks for it to be passed explicitly. This means that any kind of collection can be produced,
 * since the reducer is not tied to the input collection in any way.
 *
 * `transduce` also will accept an initial value for the resulting collection as the optional last parameter. If this
 * parameter isn't present, then the initial value is determined from the transducer init protocol property on the
 * reducer. Note however that many reducers may not provide an initial value, and in those cases it will *have* to be
 * passed as a parameter.
 *
 * ```
 * const xform = map(x => x + 1);
 *
 * const arrayReducer = {
 *   [protocols.init]() { return []; },
 *   [protocols.result](x) { return x; },
 *   [protocols.step](acc, x) {
 *     acc.push(x);
 *     return acc;
 *   }
 * };
 *
 * const stringReducer = {
 *   [protocols.init]() { return ''; },
 *   [protocols.result](x) { return x; },
 *   [protocols.step](acc, x) { return acc + x; }
 * };
 *
 * let result = transduce([1, 2, 3, 4, 5], xform, arrayReducer);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = transduce([1, 2, 3, 4, 5], xform, stringReducer);
 * // result = '23456'
 *
 * result = transduce('12345', xform, arrayReducer);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = transduce('12345', xform, stringReducer);
 * // result = '23456'
 * ```
 *
 * These examples illustrate a number of important concepts. First of all, the transducer function is independent of the
 * type of the collection; the same transducer function is used no matter the type of input or output collections.
 * Secondly, two reducers are defined. These are objects that conform to the transducer protocol (see the documentation
 * on `{@link module:xduce.protocols}`) and that know how to produce the output collection of choice. In this case, the
 * reducers know how to create new arrays and strings (the `init` protocol) and how to add elements to arrays and
 * strings (the `step` protocol). Because these reducers do have `init` protocol properties, the `transduce` calls do
 * not require explicit initial collections.
 *
 * The final point is that `transduce` can accept any kind of iterable collection, and by passing in the proper reducer,
 * it can produce any kind of output collection. The same `transduce` function and the same map transformer is used in
 * all four examples, despite the input/output combination being different in all four.
 *
 * The `init` collection doesn't have to be empty. If it isn't, the elements that are already in it are retained and the
 * transformed input elements are reduced into the collection normally.
 *
 * Of course, the examples are not really necessary - the same thing could be accomplished using
 * `{@link module:xduce.into|into}` without having to create the reducers (strings and arrays passed to
 * `{@link module:xduce.into|into}` as targets know how to reduce themselves already).
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~transducerFunction} xform A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function.
 * @param {object} reducer An object that implements the transducer protocols (`init` is only required if the `init`
 *     parameter is not present). This object must know how to produce an output collection through its `step` and
 *     `result` protocol functions.
 * @param {*} [init] aAcollection of the same type as the output collection. If this is not present, then the reducer's
 *     `init` protocol function is called instead to get the initial collection. If it is present and not empty, then
 *     the existing elements remain and the transformed input collection elements are added to it.
 * @return {*} A collection of a type determined by the passed reducer. The elements of this collection are the results
 *     from the transformer function being applied to each element of the input collection.
 */
function transduce(collection, xform, reducer) {
  var init = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : reducer[p.init]();

  var xf = xform ? xform(reducer) : reducer;
  return reduce(collection, xf, init);
}

/**
 * **Transforms the elements of the input collection and reduces them into a new array.**
 *
 * The transformer is optional. If it isn't present, this function just converts the input collection into an array.
 *
 * ```
 * const xform = map(x => x + 1);
 *
 * let result = asArray([1, 2, 3, 4, 5], xform);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = asArray('12345', xform);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = asArray('12345');
 * // result = [1, 2, 3, 4, 5]
 *
 * result = asArray({a: 1, b: 2});
 * // result = [{a: 1}, {b: 2}]
 * ```
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~transducerFunction} [xform] A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function. If this
 *     isn't present, the input collection will simply be reduced into an array without transformation.
 * @return {array} An array containing all of the transformed values from the input collection elements.
 */
function asArray(collection, xform) {
  return transduce(collection, xform, arrayReducer);
}

/**
 * **Transforms the elements of the input collection and reduces them into a new object.**
 *
 * The transformer is optional. If it isn't present, this function just converts the input collection into an object.
 *
 * ```
 * const xform = map(({ k, v }) => ({ [k]: v + 1 }));
 *
 * let result = asObject({a: 1, b: 2}, xform);
 * // result = {a: 2, b: 3}
 *
 * result = asObject([{a: 1}, {b: 2}], xform);
 * // result = {a: 2, b: 3}
 *
 * result = asObject([1, 2, 3, 4, 5]);
 * // result = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5}
 *
 * result = asObject('hello');
 * // result = {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'}
 * ```
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~tranducerFunction} [xform] A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function. If this
 *     isn't present, the input collection will simply be reduced into an object without transformation.
 * @return {object} An object containing all of the transformed values from the input collection elements.
 */
function asObject(collection, xform) {
  return transduce(collection, xform, objectReducer);
}

/**
 * **Transforms the elements of the input collection and reduces them into a new string.**
 *
 * The transformer is optional. If it isn't present, this function just converts the input collection into an string.
 *
 * ```
 * const xform = map(x => x.toUpperCase());
 *
 * let result = asString('hello', xform);
 * // result = 'HELLO'
 *
 * result = asString(['h', 'e', 'l', 'l', 'o'], xform);
 * // result = 'HELLO'
 *
 * result = asString([1, 2, 3, 4, 5]);
 * // result = '12345'
 *
 * result = asString({a: 1, b: 2});
 * // result = '12'
 * ```
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~transducerFunction} [xform] A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function. If this
 *     isn't present, the input collection will simply be reduced into a string without transformation.
 * @return {string} A string containing all of the transformed values from the input collection elements.
 */
function asString(collection, xform) {
  return transduce(collection, xform, stringReducer);
}

/**
 * **Transforms the elements of the input collection and reduces them into a new iterator.**
 *
 * The transformer is optional. If it isn't present, this function just converts the input collection into an iterator.
 *
 * *(The results here are shown passed through `asArray` because there's no literal interpretation of an iterator to
 * show. The `asArray` calls are for demonstration purposes only.)*
 *
 * ```
 * const xform = map(x => x + 1);
 * function* five() {
 *   for (let i = 1; i <= 5; ++i) {
 *     yield i;
 *   }
 * };
 *
 * let result = asIterator(five(), xform);
 * // asArray(result) = [2, 3, 4, 5, 6]
 *
 * result = asIterator([1, 2, 3, 4, 5], xform);
 * // asArray(result) = [2, 3, 4, 5, 6]
 *
 * result = asIterator([1, 2, 3, 4, 5]);
 * // asArray(result) = [1, 2, 3, 4, 5]
 *
 * result = asIterator({a: 1, b: 2});
 * // asArray(result) = [{a: 1}, {b: 2}]
 * ```
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~transducerFunction} [xform] A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function. If this
 *     isn't present, the input collection will simply be reduced into an iterator without transformation.
 * @return {module:xduce~iterator} An iterator containing all of the transformed values from the input collection
 *     elements.
 */
function asIterator(collection, xform) {
  return xform ? transducingIterator(collection, xform) : iterator(collection);
}

/**
 * **Transforms the elements of the input collection and reduces them into a new collection of the same type.**
 *
 * This is the highest level of the three main transduction functions (`sequence`, `{@link module:xduce.into|into}`,
 * and `{@link module:xduce.transduce|transduce}`). It creates a new collection of the same type as the input collection
 * and reduces the transformed elements into it. Additionally, unlike `{@link module:xduce.into|into}` and
 * `{@link module:xduce.transduce|transduce}`, this function is capable of producing an iterator (as long as the input
 * is an iterator).
 *
 * The input collection must not only implement the `iterator` protocol (as in the last two functions) but also the
 * `init`, `result`, and `step` transducer protocols. Special support is provided for arrays, strings, objects, and
 * iterators, so they need not implement any protocol.
 *
 * The obvious limitation of this function is that the type of output collection cannot be chosen. Since it is always
 * the same as the input collection, this function cannot be used to convert a collection into a different type.
 *
 * ```
 * const xform = map(x => x + 1);
 *
 * let result = sequence([1, 2, 3, 4, 5], xform);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = sequence('12345', xform);
 * // result = '23456'
 * ```
 *
 * These examples are identical to two of the four examples from the `asX` functions. The other two examples are not
 * possible with `sequence` because they have different input and output collection types.
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. This must implement the `iterator`, `init`, `result`, and `step`
 *     protocols. Special support is provided for arrays, strings, objects, and iterators, so they do not have to
 *     implement any protocols.
 * @param {module:xduce~transducerFunction} xform A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function.
 * @return {*} A collection of the same type as the input collection, containing all of the transformed values from the
 *     input collection elements.
 */
function sequence(collection, xform) {
  switch (true) {
    case isArray(collection):
      return asArray(collection, xform);
    case isObject(collection):
      return asObject(collection, xform);
    case isString(collection):
      return asString(collection, xform);
    case isImplemented(collection, 'step'):
      return transduce(collection, xform, collection);
    case isImplemented(collection, 'iterator'):
      return asIterator(collection, xform);
    default:
      throw Error('Cannot sequence collection: ' + collection);
  }
}

/**
 * **Transforms the elements of the input collection and reduces them into the target collection.**
 *
 * This is much like `{@link module:xduce.transduce|transduce}`, except that instead of explicitly providing a reducer
 * (and perhaps an initial collection), the target collection acts as a reducer itself. This requires that the
 * collection implement the `init`, `result`, and `step` transducer protocol functions.
 *
 * If no transducer function is provided, the input collection elements are reduced into the target collection without
 * being transformed. This can be used to convert one kind of collection into another.
 *
 * ```
 * const xform = map(x => x + 1);
 *
 * let result = into([], [1, 2, 3, 4, 5], xform);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = into('', [1, 2, 3, 4, 5], xform);
 * // result = '23456'
 *
 * result = into([], '12345', xform);
 * // result = [2, 3, 4, 5, 6]
 *
 * result = into('', '12345', xform);
 * // result = '23456'
 * ```
 *
 * These examples are exactly equivalent to the four examples under `{@link module:xduce.transduce|transduce}`, but
 * using `into` instead.
 *
 * @memberof module:xduce
 *
 * @param {*} target The collection into which all of the transformed input collection elements will be reduced. This
 *     collection must implement the `init`, `result`, and `step` protocol functions from the transducer protocol.
 *     Special support is provided for arrays, strings, and objects, so they need not implement the protocol.
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {module:xduce~transducerFunction} [xform] A function that creates a transducer object that defines the
 *     transformation being done to the input collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function. If this
 *     isn't present, the input collection will simply be reduced into the target collection without transformation.
 * @return {*} The `target` collection, with all of the tranformed input collection elements reduced onto it.
 */
function into(target, collection, xform) {
  switch (true) {
    case isArray(target):
      return transduce(collection, xform, arrayReducer, target);
    case isObject(target):
      return transduce(collection, xform, objectReducer, target);
    case isString(target):
      return transduce(collection, xform, stringReducer, target);
    case isImplemented(target, 'step'):
      return transduce(collection, xform, target, target);
    default:
      throw Error('Cannot reduce collection into ' + target + ': ' + collection);
  }
}

/**
 * **Composes two or more transducer functions into a single transducer function.**
 *
 * Each function that takes a transducer function (`{@link module:xduce.sequence|sequence}`,
 * `{@link module:xduce.into|into}`, etc.) is only capable of accepting one of them. If there is a need to have
 * several transducers chained together, then use `compose` to create a transducer function that does what all of them
 * do.
 *
 * This operates only on {@link module:xduce~transducerFunction|transducer functions}, not on
 * {@link module:xduce~transducer|transducers} themselves. There is no option for a shortcut form on a composed
 * transducer function. They must be passed to functions that operate on them (`{@link module:xduce.sequence|sequence}`
 * and the like).
 *
 * NOTE: In functional programming, a compose function is generally ordered so that the first-executed function is
 * listed last. This is done in the opposite way, with the first transducer executing first, etc. This is more sensible
 * for transducer functions.
 *
 * ```
 * const add1 = x => x + 1;
 * const odd = x => x % 2 !== 0;
 *
 * const xform = compose(map(add1), filter(odd), take(3));
 *
 * const result = sequence([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], xform);
 * // result = [3, 5, 7];
 * ```
 *
 * @memberof module:xduce
 *
 * @param {...module:xduce~transducerFunction} fns One or more function that each create a transducer object that
 *     defines the transformation being done to a collection's elements. Any of the
 *     {@link module:xduce.transducers|transducers} in this library can produce a suitable transducer function.
 * @return {module:xduce~transducerFunction} A transducer function that produces a transducer object that performs
 *     *all* of the transformations of the objects produced by the input transducer functions.
 */
function compose() {
  for (var _len = arguments.length, fns = Array(_len), _key = 0; _key < _len; _key++) {
    fns[_key] = arguments[_key];
  }

  var reversedFns = fns.reverse();
  return function (value) {
    return reversedFns.reduce(function (acc, fn) {
      return fn(acc);
    }, value);
  };
}

module.exports = {
  transduce: transduce,
  asArray: asArray,
  asObject: asObject,
  asString: asString,
  asIterator: asIterator,
  sequence: sequence,
  into: into,
  compose: compose
};

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _isIterable2 = __webpack_require__(61);

var _isIterable3 = _interopRequireDefault(_isIterable2);

var _getIterator2 = __webpack_require__(60);

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = (0, _getIterator3.default)(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if ((0, _isIterable3.default)(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var store      = __webpack_require__(32)('wks')
  , uid        = __webpack_require__(23)
  , Symbol     = __webpack_require__(7).Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

// Thank's IE8 for his funny defineProperty
module.exports = !__webpack_require__(17)(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});

/***/ }),
/* 9 */
/***/ (function(module, exports) {

var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var anObject       = __webpack_require__(15)
  , IE8_DOM_DEFINE = __webpack_require__(42)
  , toPrimitive    = __webpack_require__(35)
  , dP             = Object.defineProperty;

exports.f = __webpack_require__(8) ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = __webpack_require__(83)
  , defined = __webpack_require__(26);
module.exports = function(it){
  return IObject(defined(it));
};

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

var dP         = __webpack_require__(10)
  , createDesc = __webpack_require__(22);
module.exports = __webpack_require__(8) ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * A set of functions related to the producing reducer objects, marking reduced objects, and performing general
 * reduction operations.
 *
 * @module reduction
 * @private
 */

var _require = __webpack_require__(0),
    isArray = _require.isArray,
    isFunction = _require.isFunction,
    isObject = _require.isObject,
    isString = _require.isString;

var _require2 = __webpack_require__(20),
    isKvFormObject = _require2.isKvFormObject,
    iterator = _require2.iterator;

var _require3 = __webpack_require__(1),
    protocols = _require3.protocols,
    isImplemented = _require3.isImplemented;

var p = protocols;

/**
 * Returns an init function for a collection. This is a function that returns a new, empty instance of the collection in
 * question. If the collection doesn't support reduction, `null` is returned. This makes conditionals a bit easier to
 * work with.
 *
 * In order to support the conversion of functions into reducers, function support is also provided.
 *
 * @private
 *
 * @param {*} collection A collection to create an init function for. This can be anything that supports the ES2015
 *     iteration protocol, a plain object, a pre-ES2015 string or array, or a function.
 * @return {module:xduce~init} A function that, when called, returns an initial version of the provided collection. If
 *     the provided collection is not iterable, then `null` is returned.
 */
function init(collection) {
  switch (true) {
    case isImplemented(collection, 'init'):
      return collection[p.init];
    case isString(collection):
      return function () {
        return '';
      };
    case isArray(collection):
      return function () {
        return [];
      };
    case isObject(collection):
      return function () {
        return {};
      };
    case isFunction(collection):
      return function () {
        throw Error('init not available');
      };
    default:
      return null;
  }
}

/**
 * Returns a step function for a collection. This is a function that takes an accumulator and a value and returns the
 * result of reducing the value into the accumulator. If the collection doesn't support reduction, `null` is returned.
 * The returned function itself simply reduces the input into the target collection without modifying it.
 *
 * In order to support the conversion of functions into reducers, function support is also provided.
 *
 * @private
 *
 * @param {*} collection A collection to create a step function for. This can be anything that supports the ES2015
 *     iteration protocol, a plain object, a pre-ES2015 string or array, or a function.
 * @return {module:xduce~step} A reduction function for the provided collection that simply adds an element to the
 *     target collection without modifying it. If the provided collection is not iterable, `null` is returned.
 */
function step(collection) {
  switch (true) {
    case isImplemented(collection, 'step'):
      return collection[p.step];

    case isString(collection):
      return function (acc, input) {
        var value = isKvFormObject(input) ? input.v : input;
        return acc + value;
      };

    case isArray(collection):
      return function (acc, input) {
        var value = isKvFormObject(input) ? (0, _defineProperty3.default)({}, input.k, input.v) : input;
        acc.push(value);
        return acc;
      };

    case isObject(collection):
      return function (acc, input) {
        var value = input;

        if (isKvFormObject(input)) {
          // if the object is kv-form, change the object from { k: key, v: value } to { key: value }
          value = (0, _defineProperty3.default)({}, input.k, input.v);
        } else if (!isObject(input)) {
          // if the input isn't an object at all, turn it into an object with a key based on what's already in the
          // accumulator
          var max = -1;
          for (var k1 in acc) {
            var knum = parseInt(k1);
            if (knum > max) {
              max = knum;
            }
          }
          value = (0, _defineProperty3.default)({}, max + 1, input);
        }

        for (var k2 in value) {
          if (value.hasOwnProperty(k2)) {
            acc[k2] = value[k2];
          }
        }
        return acc;
      };

    case isFunction(collection):
      return function (acc, input) {
        return collection(acc, input);
      };

    default:
      return null;
  }
}

/**
 * Returns a result function for a collection. This is a function that performs any final processing that should be done
 * on the result of a reduction. If the collection doesn't support reduction, `null` is returned.
 *
 * In order to support the conversion of functions into reducers, function support is also provided.
 *
 * @private
 *
 * @param {*} collection A collection to create a step function for. This can be anything that supports the ES2015
 *     iteration protocol, a plain object, a pre-ES2015 string or array, or a function.
 * @return {module:xduce~result} A function that, when given a reduced collection, produces the final output. If the
 *     provided collection is not iterable, `null` will be returned.
 */
function result(collection) {
  switch (true) {
    case isImplemented(collection, 'result'):
      return collection[p.result];
    case isString(collection):
    case isArray(collection):
    case isObject(collection):
    case isFunction(collection):
      return function (value) {
        return value;
      };
    default:
      return null;
  }
}

/**
 * **Creates a reducer object from a function or from a built-in reducible type (array, object, or string).**
 *
 * To create a reducer for arrays, objects, or strings, simply pass an empty version of that collection to this function
 * (e.g., `toReducer([])`). These reducers support the kv-form for objects.
 *
 * The notable use for this function though is to turn a reduction function into a reducer object. The function is a
 * function oftwo parameters, an accumulator and a value, and returns the accumulator with the value in it. This is
 * exactly the same kind of function that is passed to reduction functions like JavaScript's `Array.prototype.reduce`
 * and Lodash's `_.reduce`.
 *
 * Note in particular that the output of this reducer does not need to be a collection. It can be anything. While
 * transducing normally involves transforming one collection into another, it need not be so. For example, here is a
 * reducer that will result in summing of the collection values.
 *
 * ```
 * const { toReducer, reduce } = xduce;
 *
 * const sumReducer = toReducer((acc, input) => acc + input);
 * const sum = reduce([1, 2, 3, 4, 5], sumReducer, 0);
 * // sum = 15
 * ```
 *
 * This can be combined with transducers as well, as in this calculation of the sum of the *squares* of the collection
 * values.
 *
 * ```
 * const { toReducer, transduce } = xduce;
 * const { map } = xduce.transducers;
 *
 * const sumReducer = toReducer((acc, input) => acc + input);
 * const sum = transduce([1, 2, 3, 4, 5], map(x => x * x), sumReducer, 0);
 * // sum = 55
 * ```
 *
 * @memberof module:xduce
 *
 * @param {*} collection An iterable collection or a reducer function.
 * @return {object} An object containing protocol properties for init, step, and result. This object is suitable for
 *     use as a reducer object (one provided to `{@link xduce.reduce|reduce}` or `{@link xduce.transduce|transduce}`).
 *     If the provided collection is not iterable, all of the properties of this object will be `null`.
 */
function toReducer(collection) {
  var _ref2;

  return _ref2 = {}, (0, _defineProperty3.default)(_ref2, p.init, init(collection)), (0, _defineProperty3.default)(_ref2, p.step, step(collection)), (0, _defineProperty3.default)(_ref2, p.result, result(collection)), _ref2;
}

// Reducer functions for the three common built-in iterable types.
var arrayReducer = toReducer([]);
var objectReducer = toReducer({});
var stringReducer = toReducer('');

/**
 * **Creates a reduction function from a transducer and a reducer.**
 *
 * This produces a function that's suitable for being passed into other libraries' reduce functions, such as
 * JavaScript's `Array.prototype.reduce` or Lodash's `_.reduce`. It requires both a transformer and a reducer because
 * reduction functions for those libraries must know how to do both. The reducer can be a standard reducer object like
 * the ones sent to`{@link module:xduce.transduce|transduce}` or `{@link module:xduce.reduce|reduce}`, or it can be a
 * plain function that takes two parameters and returns the result of reducing the second parameter into the first.
 *
 * If there is no need for a transformation, then pass in the `{@link module:xduce.identity|identity}` transducer.
 *
 * @memberof module:xduce
 *
 * @param {module:xduce~transducerObject} xform A transducer object whose step function will become the returned
 *     reduction function.
 * @param {(module:xduce~step|module:xduce~transducerObject)} reducer A reducer that knows how to reduce values into an
 *     output collection. This can either be a reducing function or a transducer object whose `step` function knows how
 *     to perform this reduction.
 * @return {module:xduce~step} A function that handles both the transformation and the reduction of a value onto a
 *     target function.
 */
function toFunction(xform, reducer) {
  var r = typeof reducer === 'function' ? toReducer(reducer) : reducer;
  var result = xform(r);
  return result[p.step].bind(result);
}

/**
 * **Marks a value as complete.**
 *
 * This is done by wrapping the value. This means three things: first, a complete object may be marked as complete
 * again; second, a complete value isn't usable without being uncompleted first; and third any type of value (including
 * `undefined`) may be marked as complete.
 *
 * @memberof module:xduce.util.status
 *
 * @param {*} value The value to be completed.
 * @return {*} A completed version of the provided value. This reduction is achieved by wrapping the value in a marker
 *     object.
 */
function complete(value) {
  var _ref3;

  return _ref3 = {}, (0, _defineProperty3.default)(_ref3, p.reduced, true), (0, _defineProperty3.default)(_ref3, p.value, value), _ref3;
}

/**
 * **Removes the complete status from a completed value.**
 *
 * This function is intended to be used when it's certain that a value is already marked as complete. If it is not,
 * `undefined` will be returned instead of the value.
 *
 * @memberof module:xduce.util.status
 *
 * @param {*} value The value to be uncompleted.
 * @return {*} An uncompleted version of the provided value. If the value was not complete in the first place,
 *     `undefined` will be returned instead.
 */
function uncomplete(value) {
  if (value == null) {
    return;
  }
  return value[p.value];
}

/**
 * **Determines whether a value is marked as complete.**
 *
 * @memberof module:xduce.util.status
 *
 * @param {*} value The value to test for its complete status.
 * @return {boolean} Either `true` if the value is complete, or `false` if it is not.
 */
function isCompleted(value) {
  if (value == null) {
    return false;
  }
  return !!value[p.reduced];
}

/**
 * **Makes sure that a value is marked as complete; if it is not, it will be marked as complete.**
 *
 * This differs from {@link module:xduce.util.status.complete|complete} in that if the value is already complete, this
 * function won't complete it again. Therefore thus function can't be used to make a value complete multiple times.
 *
 * @memberof module:xduce.util.status
 *
 * @param {*} value The value to be completed.
 * @return {*} If the value is already complete, then the value is simply returned. Otherwise, a completed version of
 *     the value is returned.
 */
function ensureCompleted(value) {
  return isCompleted(value) ? value : complete(value);
}

/**
 * **Removes the complete status from a value, as long as it actually is complete.**
 *
 * This does a check to make sure the value passed in actually is complete. If it isn't, the value itself is returned.
 * It's meant to be used when the completed status is uncertain.
 *
 * @memberof module:xduce.util.status
 *
 * @param {*} value The complete value to be uncompleted.
 * @return {*} If the value is already uncompleted, the value is simply returned. Otherwise an uncompleted version of
 *     the value is returned.
 */
function ensureUncompleted(value) {
  return isCompleted(value) ? uncomplete(value) : value;
}

/**
 * **Reduces the elements of the input collection through a reducer into an output collection.**
 *
 * This is the lowest-level of the transduction functions. In fact, this one is so low-level that it doesn't have a lot
 * of use in normal operation. It's more useful for writing your own transformation functions.
 *
 * `reduce` doesn't assume that there's even a transformation. It requires an initial collection and a reducer object
 * that is matched to that initial collection. The reducer object must implement the `step` and `result` protocols,
 * which instruct `reduce` on how to build up the collection. The reducer may implement a transformation as well, but
 * all that's important here is that it can do the reduction.
 *
 * The input collection need only implement `iterator`. It is not necessary for the input and output collections to be
 * of the same type; as long as the input implements `iterator` and the reducer implements `step` and `result`
 * appropriate to the type of the `init` collection, then any translation between collection types can occur.
 *
 * The normal course of operation will be to call {@link module:xduce.transduce|transduce} instead, as that function
 * makes it easy to combine transformations with reductions and can optionally figure out the initial collection itself.
 *
 * @memberof module:xduce
 *
 * @param {*} collection The input collection. The only requirement of this collection is that it implement the
 *     `iterator` protocol. Special support is provided by the library for objects and pre-ES2015 arrays and strings
 *     (ES2015 arrays and strings already implement `iterator`), so any of those can also be used.
 * @param {object} reducer An object that implements the `step` and `result` protocols. This object must know how to
 *     produce an output collection through those protocol functions.
 * @param {*} init a collection of the same type as the output collection. It need not be empty; if it is not, the
 *     existing elements are retained as the input collection is reduced into it.
 * @return {*} A new collection, consisting of the `init` collection with all of the elements of the `collection`
 *     collection reduced into it.
 */
function reduce(collection, reducer, init) {
  if (collection == null) {
    return null;
  }

  var iter = iterator(collection, null, true);
  if (!iter) {
    throw Error('Cannot reduce an instance of ' + collection.constructor.name);
  }

  var acc = init;
  var step = iter.next();

  while (!step.done) {
    acc = reducer[p.step](acc, step.value);
    if (isCompleted(acc)) {
      acc = uncomplete(acc);
      break;
    }
    step = iter.next();
  }

  return reducer[p.result](acc);
}

module.exports = {
  init: init,
  step: step,
  result: result,
  toReducer: toReducer,
  arrayReducer: arrayReducer,
  objectReducer: objectReducer,
  stringReducer: stringReducer,
  toFunction: toFunction,
  complete: complete,
  uncomplete: uncomplete,
  isCompleted: isCompleted,
  ensureCompleted: ensureCompleted,
  ensureUncompleted: ensureUncompleted,
  reduce: reduce
};

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Basic functions necessary across transducers, along with a number of transducers that don't belong in other
 * categories.
 *
 * @module core
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(20),
    isIterable = _require3.isIterable;

var _require4 = __webpack_require__(0),
    isNumber = _require4.isNumber;

var _require5 = __webpack_require__(13),
    isCompleted = _require5.isCompleted,
    complete = _require5.complete,
    reduce = _require5.reduce;

var p = protocols;

/**
 * Defines equality per the definition of SameValueZero in the JS spec, This is the comparison used in similar
 * situations by Lodash and other libraries. It's the same as `===` in JavaScript, except that `NaN` is equal to itself.
 *
 * @private
 *
 * @param {number} a The first number.
 * @param {number} b The second number.
 * @return {boolean} Either `true` if the numbers are equal per `===` or if both numbers are `NaN`, or `false`
 *     otherwise.
 */
function sameValueZero(a, b) {
  return a === b || isNaN(a) && isNaN(b);
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.identity|identity}` transducer.
 *
 * @private
 *
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function identityTransducer(xform) {
  var _ref;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    return xform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Returns exactly the same collection sent to it.**
 *
 * This is generally a function used when a transducer function is required but there is no desire to do an actual
 * transformation. The "transformation" implemented here is to pass each element through exactly as it is.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = identity([1, 2, 3, 4, 5]);
 * // result = [1, 2, 3, 4, 5]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection untouched. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function identity(collection) {
  return collection ? sequence(collection, identity()) : function (xform) {
    return identityTransducer(xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.flatten|flatten}` transducer.
 *
 * @private
 *
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function flattenTransducer(xform) {
  var _ref2;

  return _ref2 = {}, (0, _defineProperty3.default)(_ref2, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref2, p.step, function (acc, input) {
    var _subXform;

    var subXform = (_subXform = {}, (0, _defineProperty3.default)(_subXform, p.init, function () {
      return xform[p.init]();
    }), (0, _defineProperty3.default)(_subXform, p.step, function (acc, input) {
      var v = xform[p.step](acc, input);
      return isCompleted(v) ? complete(v) : v;
    }), (0, _defineProperty3.default)(_subXform, p.result, function (value) {
      return xform[p.result](value);
    }), _subXform);

    return isIterable(input) ? reduce(input, subXform, acc) : subXform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref2, p.result, function (value) {
    return xform[p.result](value);
  }), _ref2;
}

/**
 * **Flattens a collection by merging elements in any sub-collection into the main collection.**
 *
 * Elements of the main collection that are not collections themselves are not changed. It's fine to have a combination
 * of the two, some elements that are collections and some that are not.
 *
 * Since there aren't sub-collections in objects, strings, or iterators, `flatten` doesn't make sense with those types
 * of collections.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = flatten([[1, 2], [3, 4, 5], 6, [7]]);
 * // result = [1, 2, 3, 4, 5, 6, 7]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection flattened. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function flatten(collection) {
  return collection ? sequence(collection, flatten()) : function (xform) {
    return flattenTransducer(xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.flatten|flatten}` transducer.
 *
 * @private
 *
 * @param {number} n The number of times that each element should be repeated in the output collection.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function repeatTransducer(n, xform) {
  var _ref3;

  return _ref3 = {}, (0, _defineProperty3.default)(_ref3, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref3, p.step, function (acc, input) {
    var result = acc;
    for (var i = 0; i < n; ++i) {
      result = xform[p.step](result, input);
      if (isCompleted(result)) {
        break;
      }
    }
    return result;
  }), (0, _defineProperty3.default)(_ref3, p.result, function (value) {
    return xform[p.result](value);
  }), _ref3;
}

/**
 * **Repeats each element from the input collection `n` times in the output collection.**
 *
 * These elements are put into the main output collection, not into subcollections. In other words, each input element
 * creates `n` output elements.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = repeat([1, 2, 3, 4, 5], 3);
 * // result = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {number} n The number of times that each element from the input collection should be repeated in the output
 *     collection.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection repeated. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function repeat(collection, n) {
  var _ref4 = isNumber(collection) ? [null, collection] : [collection, n],
      _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
      col = _ref5[0],
      num = _ref5[1];

  return col ? sequence(col, repeat(num)) : function (xform) {
    return repeatTransducer(num, xform);
  };
}

module.exports = {
  sameValueZero: sameValueZero,
  identity: identity,
  flatten: flatten,
  repeat: repeat
};

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(21);
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

var global    = __webpack_require__(7)
  , core      = __webpack_require__(2)
  , ctx       = __webpack_require__(80)
  , hide      = __webpack_require__(12)
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};

/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = {};

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = __webpack_require__(48)
  , enumBugKeys = __webpack_require__(27);

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _keys = __webpack_require__(65);

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Functions that deal with iteration - the first step in transduction, which is taking the input collection and
 * breaking it into its component parts.
 *
 * Iteration is the simplest to deal with because it's already well-supported natively by JavaScript. This file is
 * largely dedicated to implementing consistent iteration in pre-ES2015 environments, as well as adding iteration
 * possibilities for those objects not already supported natively.
 *
 * @module iteration
 * @private
 */

var _require = __webpack_require__(0),
    bmpCharAt = _require.bmpCharAt,
    bmpLength = _require.bmpLength,
    isArray = _require.isArray,
    isFunction = _require.isFunction,
    isObject = _require.isObject,
    isString = _require.isString;

var _require2 = __webpack_require__(1),
    protocols = _require2.protocols,
    isImplemented = _require2.isImplemented;

var p = protocols;

/**
 * Creates an iterator over strings. ES2015 strings already satisfy the iterator protocol, so this function will not
 * be used for them. This is for ES5 strings where the iterator protocol doesn't exist. As with ES2015 iterators, it
 * takes into account double-width BMP characters and will return the entire character as a two-character string.
 *
 * @private
 *
 * @param {string} str The string to be iterated over.@author [author]
 * @return {module:xduce~iterator} An iterator that returns one character per call to `next`.
 */
function stringIterator(str) {
  var index = 0;
  return {
    next: function next() {
      return index < bmpLength(str) ? {
        value: bmpCharAt(str, index++),
        done: false
      } : {
        done: true
      };
    }
  };
}

/**
 * Creates an iterator over strings. ES2015 strings already satisfy the iterator protocol, so this function will not
 * be used for them. This is for ES5 strings where the iterator protocol doesn't exist.
 *
 * @private
 *
 * @param {array} array The array to be iterated over.
 * @return {module:xduce~iterator} An iterator that returns one element per call to `next`.
 */
function arrayIterator(array) {
  var index = 0;
  return {
    next: function next() {
      return index < array.length ? {
        value: array[index++],
        done: false
      } : {
        done: true
      };
    }
  };
}

/**
 * Creates an iterator over objcts.
 *
 * Objects are not generally iterable, as there is no defined order for an object, and each "element" of an object
 * actually has two values, unlike any other collection (a key and a property). However, it's tremendously useful to
 * be able to use at least some transformers with objects as well. This iterator adds support in two different
 * ways to make that possible.
 *
 * The first is that a sort order is defined. Quite simply, it's done alphabetically by key. There is also an option -
 * through the second parameter `sort` - to provide a different sort function. This should be a function in the style
 * of `Array.prototype.sort`, where two parameters are compared and -1 is returned if the first is larger, 1 is returned
 * if the second is larger, and 0 is returned if they're equal. This is applied ONLY TO THE KEYS of the object. If you
 * wish to sort on values, consider iterating into an array and then sorting the elements by value.
 *
 * In the public API, this sort function can only be passed through the `{@link module:xduce.iterator|iterator}`
 * function. If you  wish to use an object sorted in a non-default order, you should create an iterator out of it and
 * transform that iterator. For example:
 *
 * | DEFAULT ORDER                        | CUSTOM ORDER                                         |
 * | ------------------------------------ | ---------------------------------------------------- |
 * | `var result = sequence(obj, xform);` | `var result = asObject(iterator(obj, sort), xform);` |
 *
 * The second support feature is the alternative "kv-form" objects. A reasonable way to iterate over objects would be to
 * produce single-property objects, one per property on the original object (i.e., `{a: 1, b: 2}` would become two
 * elements: `{a: 1}` and `{b: 2}`). This is fine for straight iteration and reduction, but it can present a challenge
 * to use a transformer with. Consider this example code, which uppercases the key and adds one to the value.
 *
 * ```
 * function doObjectSingle(obj) {
 *   var key = Object.keys(obj)[0];
 *   var result = {};
 *   result[key.toUpperCase()] = obj[key] + 1;
 *   return result;
 * }
 * ```
 *
 * This is a little unwieldy, so the iterator provides for another kind of iteration. Setting the third parameter,
 * `kv`, to `true` (which is the default), objects will be iterated into two-property objects with `k` and `v` as the
 * property names. For example, `{a: 1, b: 2}` will become two elements: `{k: 'a', v: 1}` and `{k: 'b', v: 2}`. This
 * turns the mapping function shown above into something simpler.
 *
 * ```
 * function doObjectKv(obj) {
 *   var result = {};
 *   result[obj.k.toUpperCase()]: obj.v + 1;
 *   return result;
 * }
 * ```
 *
 * This is the default iteration form for objects internally. If you want to iterate an object into the `{key: value}`
 * form, for which you would have to use the `doObjectSingle` style transformer, you must call
 * `{@link module:xduce.iterator|iterator}` with the third parameter explicitly set to `false` and then pass that
 * iterator to the transducing function. This is availabe in particular for those writing their own transducers.
 *
 * Still, while this is nice, we can do better. The built-in reducers for arrays, objects, strings, and iterators
 * recognize the kv-form and know how to reduce it back into a regular key-value form for output. So instead of that
 * first `doObjectKv`, we could write it this way.
 *
 * ```
 * function doObjectKvImproved(obj) {
 *   return {k: obj.k.toUpperCase(), v: obj.v + 1};
 * }
 * ```
 *
 * The reducer will recognize the form and reduce it correctly. The upshot is that in this library, `doObjectKv` and
 * `doObjectKvImproved` will produce the SAME RESULT. Which function to use is purely a matter of preference. IMPORTANT
 * NOTE: If you're adding transducer support to non-supported types, remember that you must decide whether to have your
 * `step` function recognize kv-form objects and reduce them into key-value. If you don't, then the style of
 * `doObjectKvImproved` will not be available.
 *
 * ANOTHER IMPORTANT NOTE: The internal reducers recognize kv-form very explicitly. The object must have exactly two
 * enumerable properties, and those properties must be named 'k' and 'v'. This is to reduce the chance as much as
 * possible of having errors because an object that was meant to be two properties was turned into one. (It is possible
 * to have a transformation function return an object of more than one property; if that happens, and if that object is
 * not a kv-form object, then all of the properties will be merged into the final object.)
 *
 * One final consideration: you have your choice of mapping function styles, but the better choice may depend on
 * language. The above examples are in ES5. If you're using ES2015, however, you have access to destructuring and
 * dynamic object keys. That may make `doObjectKv` look better, because with those features it can be written like this:
 *
 * ```
 * doObjectKv = ({k, v}) => {[k.toUpperCase()]: v + 1};
 * ```
 *
 * And that's about as concise as it gets. Note that some languages that compile into JavaScript, like CoffeeScript and
 * LiveScript, also support these features.
 *
 * TL;DR:
 * 1. Iteration order of objects is alphabetical by key, though that can be changed by passing a sort function to
 *    `{@link module:xduce.iterator|iterator}`.
 * 2. Iteration is done internally in kv-form.
 * 3. Transformation functions can output objects in key-value, which is easier in ES2015.
 * 4. Transformation functions can output objects in kv-form, which is easier in ES5.
 * @param {object} obj The object to iterate over.
 * @param {module:xduce~sort} [sort] An optional sort function. This is applied to the keys of the object to
 *     determine the order of iteration.
 * @param {boolean} [kv=false] Whether or not this object should be iterated into kv-form (if false, it remains in the
 *     normal key-value form).
 * @return {module:xduce~iterator} An iterator that returns one key-value pair per call to `next`.
 */
function objectIterator(obj, sort) {
  var kv = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var keys = (0, _keys2.default)(obj);
  keys = typeof sort === 'function' ? keys.sort(sort) : keys.sort();
  var index = 0;

  return {
    next: function next() {
      if (index < keys.length) {
        var k = keys[index++];
        var value = {};
        if (kv) {
          value.k = k;
          value.v = obj[k];
        } else {
          value[k] = obj[k];
        }
        return {
          value: value,
          done: false
        };
      }
      return {
        done: true
      };
    }
  };
}

/**
 * Determines whether an object is in kv-form. This used by the reducers that must recognize this form and reduce those
 * elements back into key-value form.
 *
 * This determination is made by simply checking that the object has exactly two properties and that they are named
 * `k` and `v`.
 *
 * @private
 *
 * @param {object} obj The object to be tested.
 * @return {boolean} Either `true` if the object is in kv-form or `false` if it isn't.
 */
function isKvFormObject(obj) {
  var keys = (0, _keys2.default)(obj);
  if (keys.length !== 2) {
    return false;
  }
  return !!~keys.indexOf('k') && !!~keys.indexOf('v');
}

/**
 * **Creates an iterator over the provided collection.**
 *
 * For collections that are not objects, it's as simple as that. Pass in the collection, get an iterator over that
 * collection.
 *
 * Objects get special support though, as noted in the section above on iterating over objects. Objects are iterated in
 * alphabetical order by key, unless a second parameter is passed to `iterator`. This must be a function that takes two
 * parameters (which will be object keys) and returns `-1` if the first is less than the second, `1` if the second is
 * less than the first, and `0` if they're equal.
 *
 * Also, `iterator` by default iterates objects into kv-form. This is the form used internally by the xduce library. If
 * this is not appropriate for a particular use case, then a third parameter of `false` can be passed, which will result
 * in the iteration being into single-property form instead.
 *
 * The second and third parameters are ignored if the input collection is not an object.
 *
 * Note that if this function is passed an object that looks like an iterator (an object that has a `next` function),
 * the object itself is returned. It is assumed that a function called `next` conforms to the iteration protocol.
 *
 * @memberof module:xduce
 *
 * @param {*} obj The value to be iterated over.
 * @param {module:xduce~sort} [sort] A function used to determine the sorting of keys for an object iterator. It has
 *     no effect when iterating over anything that is not a plain object.
 * @param {boolean} [kv=false] Whether an object should be iterated into kv-form. This is only relevant when iterating
 *     over an object; otherwise its value is ignored.
 * @return {module:xduce~iterator} An iterator over the provided value. If the value is not iterable (it's not an
 *     array, object, or string, and it doesn't have a protocol-defined iterator), `null` is returned.
 */
function iterator(obj, sort, kv) {
  switch (true) {
    case isFunction(obj[p.iterator]):
      return obj[p.iterator]();
    case isFunction(obj.next):
      return obj;
    case isString(obj):
      return stringIterator(obj);
    case isArray(obj):
      return arrayIterator(obj);
    case isObject(obj):
      return objectIterator(obj, sort, kv);
    default:
      return null;
  }
}

/**
 * Determines whether the passed object is iterable, in terms of what 'iterable' means to this library. In other words,
 * objects and ES5 arrays and strings will return `true`, as will objects with a `next` function. For that reason this
 * function is only really useful within the library and therefore isn't exported.
 *
 * @private
 *
 * @param {*} obj The value to test for iterability.
 * @return {boolean} Either `true` if the value is iterable (`{@link module:xduce.iterator}` will return an iterator
 *     for it) or `false` if it is not.
 */
function isIterable(obj) {
  return isImplemented(obj, 'iterator') || isString(obj) || isArray(obj) || isObject(obj);
}

module.exports = {
  isKvFormObject: isKvFormObject,
  iterator: iterator,
  isIterable: isIterable
};

/***/ }),
/* 21 */
/***/ (function(module, exports) {

module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};

/***/ }),
/* 23 */
/***/ (function(module, exports) {

var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(75), __esModule: true };

/***/ }),
/* 25 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};

/***/ }),
/* 26 */
/***/ (function(module, exports) {

// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};

/***/ }),
/* 27 */
/***/ (function(module, exports) {

// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

/***/ }),
/* 28 */
/***/ (function(module, exports) {

module.exports = true;

/***/ }),
/* 29 */
/***/ (function(module, exports) {

exports.f = {}.propertyIsEnumerable;

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

var def = __webpack_require__(10).f
  , has = __webpack_require__(9)
  , TAG = __webpack_require__(6)('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

var shared = __webpack_require__(32)('keys')
  , uid    = __webpack_require__(23);
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(7)
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};

/***/ }),
/* 33 */
/***/ (function(module, exports) {

// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.13 ToObject(argument)
var defined = __webpack_require__(26);
module.exports = function(it){
  return Object(defined(it));
};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = __webpack_require__(21);
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

var global         = __webpack_require__(7)
  , core           = __webpack_require__(2)
  , LIBRARY        = __webpack_require__(28)
  , wksExt         = __webpack_require__(37)
  , defineProperty = __webpack_require__(10).f;
module.exports = function(name){
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if(name.charAt(0) != '_' && !(name in $Symbol))defineProperty($Symbol, name, {value: wksExt.f(name)});
};

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

exports.f = __webpack_require__(6);

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $at  = __webpack_require__(93)(true);

// 21.1.3.27 String.prototype[@@iterator]()
__webpack_require__(43)(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(99);
var global        = __webpack_require__(7)
  , hide          = __webpack_require__(12)
  , Iterators     = __webpack_require__(18)
  , TO_STRING_TAG = __webpack_require__(6)('toStringTag');

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype;
  if(proto && !proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = __webpack_require__(25)
  , TAG = __webpack_require__(6)('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function(it, key){
  try {
    return it[key];
  } catch(e){ /* empty */ }
};

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(21)
  , document = __webpack_require__(7).document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = !__webpack_require__(8) && !__webpack_require__(17)(function(){
  return Object.defineProperty(__webpack_require__(41)('div'), 'a', {get: function(){ return 7; }}).a != 7;
});

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var LIBRARY        = __webpack_require__(28)
  , $export        = __webpack_require__(16)
  , redefine       = __webpack_require__(50)
  , hide           = __webpack_require__(12)
  , has            = __webpack_require__(9)
  , Iterators      = __webpack_require__(18)
  , $iterCreate    = __webpack_require__(85)
  , setToStringTag = __webpack_require__(30)
  , getPrototypeOf = __webpack_require__(47)
  , ITERATOR       = __webpack_require__(6)('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = __webpack_require__(15)
  , dPs         = __webpack_require__(90)
  , enumBugKeys = __webpack_require__(27)
  , IE_PROTO    = __webpack_require__(31)('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = __webpack_require__(41)('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  __webpack_require__(82).appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};


/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys      = __webpack_require__(48)
  , hiddenKeys = __webpack_require__(27).concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O){
  return $keys(O, hiddenKeys);
};

/***/ }),
/* 46 */
/***/ (function(module, exports) {

exports.f = Object.getOwnPropertySymbols;

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = __webpack_require__(9)
  , toObject    = __webpack_require__(34)
  , IE_PROTO    = __webpack_require__(31)('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

var has          = __webpack_require__(9)
  , toIObject    = __webpack_require__(11)
  , arrayIndexOf = __webpack_require__(79)(false)
  , IE_PROTO     = __webpack_require__(31)('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

// most Object methods by ES6 should accept primitives
var $export = __webpack_require__(16)
  , core    = __webpack_require__(2)
  , fails   = __webpack_require__(17);
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(12);

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// ECMAScript 6 symbols shim
var global         = __webpack_require__(7)
  , has            = __webpack_require__(9)
  , DESCRIPTORS    = __webpack_require__(8)
  , $export        = __webpack_require__(16)
  , redefine       = __webpack_require__(50)
  , META           = __webpack_require__(89).KEY
  , $fails         = __webpack_require__(17)
  , shared         = __webpack_require__(32)
  , setToStringTag = __webpack_require__(30)
  , uid            = __webpack_require__(23)
  , wks            = __webpack_require__(6)
  , wksExt         = __webpack_require__(37)
  , wksDefine      = __webpack_require__(36)
  , keyOf          = __webpack_require__(87)
  , enumKeys       = __webpack_require__(81)
  , isArray        = __webpack_require__(84)
  , anObject       = __webpack_require__(15)
  , toIObject      = __webpack_require__(11)
  , toPrimitive    = __webpack_require__(35)
  , createDesc     = __webpack_require__(22)
  , _create        = __webpack_require__(44)
  , gOPNExt        = __webpack_require__(92)
  , $GOPD          = __webpack_require__(91)
  , $DP            = __webpack_require__(10)
  , $keys          = __webpack_require__(19)
  , gOPD           = $GOPD.f
  , dP             = $DP.f
  , gOPN           = gOPNExt.f
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , PROTOTYPE      = 'prototype'
  , HIDDEN         = wks('_hidden')
  , TO_PRIMITIVE   = wks('toPrimitive')
  , isEnum         = {}.propertyIsEnumerable
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , OPSymbols      = shared('op-symbols')
  , ObjectProto    = Object[PROTOTYPE]
  , USE_NATIVE     = typeof $Symbol == 'function'
  , QObject        = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(dP({}, 'a', {
    get: function(){ return dP(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = gOPD(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  dP(it, key, D);
  if(protoDesc && it !== ObjectProto)dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it){
  return typeof it == 'symbol';
} : function(it){
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D){
  if(it === ObjectProto)$defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if(has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if(this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  it  = toIObject(it);
  key = toPrimitive(key, true);
  if(it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return;
  var D = gOPD(it, key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = gOPN(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var IS_OP  = it === ObjectProto
    , names  = gOPN(IS_OP ? OPSymbols : toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if(!USE_NATIVE){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function(value){
      if(this === ObjectProto)$set.call(OPSymbols, value);
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if(DESCRIPTORS && setter)setSymbolDesc(ObjectProto, tag, {configurable: true, set: $set});
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString(){
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f   = $defineProperty;
  __webpack_require__(45).f = gOPNExt.f = $getOwnPropertyNames;
  __webpack_require__(29).f  = $propertyIsEnumerable;
  __webpack_require__(46).f = $getOwnPropertySymbols;

  if(DESCRIPTORS && !__webpack_require__(28)){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function(name){
    return wrap(wks(name));
  }
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});

for(var symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), i = 0; symbols.length > i; )wks(symbols[i++]);

for(var symbols = $keys(wks.store), i = 0; symbols.length > i; )wksDefine(symbols[i++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    if(isSymbol(key))return keyOf(SymbolRegistry, key);
    throw TypeError(key + ' is not a symbol!');
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it){
    if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
    var args = [it]
      , i    = 1
      , replacer, $replacer;
    while(arguments.length > i)args.push(arguments[i++]);
    replacer = args[1];
    if(typeof replacer == 'function')$replacer = replacer;
    if($replacer || !isArray(replacer))replacer = function(key, value){
      if($replacer)value = $replacer.call(this, key, value);
      if(!isSymbol(value))return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || __webpack_require__(12)($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


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
 * The central module that brings all of the separate parts of the library together into a public API. Everything
 * publicly available is available through this module or one of its child modules.
 *
 * All of the functions in this module deal directly with transducers. But first, let's talk about the protocols that
 * are going to be referred to throughout many of the function discussions.
 *
 * ## Protocols
 *
 * One of the key selling points for transducers is that the same transducer can be used on any type of collection.
 * Rather than having to write a new `map` function (for example) for every kind of collection - one for an array, one
 * for a string, one for an iterator, etc. - there is a single `map` transducer that will work with all of them, and
 * potentially with *any* kind of collection. This is possible implementing *protocols* on the collections.
 *
 * A protocol in JavaScript is much like an interface in languages like Java and C#. It is a commitment to providing a
 * certain functionality under a certain name. ES2015 has seen the introduction of an `iterator` protocol, for example,
 * and language support for it (the new `for...of` loop can work with any object that correctly implements the
 * `iterator` protocol).
 *
 * To support transduction, Xduce expects collections to implement four protocols.
 *
 * - `iterator`: a function that returns an iterator (this one is built in to ES6 JavaScript)
 * - `transducer/init`: a function that returns a new, empty instance of the output collection
 * - `transducer/step`: a function that takes an accumulator (the result of the reduction so far) and the next input
 *   value, and then returns the accumulator with the next input value added to it
 * - `transducer/result`: a function that takes the reduced collection and returns the final output collection
 *
 * `iterator` is the built-in JavaScript protocol. When called, it is expected to return an iterator over the
 * implementing collection. This iterator is an object that has a `next` function. Each call to `next` is expected to
 * return an object with `value` and `done` properties, which respectively hold the next value of the iterator and a
 * boolean to indicate whether the iteration has reached its end. (This is a simplified explanation; see
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators|this MDN page} for more
 * detailed information.)
 *
 * `transducer/init` (referred to from now on as `init`) should be a function that takes no parameters and returns a
 * new, empty instance of the output collection. This is the function that defines how to create a new collection of the
 * correct type.
 *
 * `transducer/step` (referred to from now on as `step`) should be a function that takes two parameters. These
 * parameters are the result of the reduction so far (and so is a collection of the output type) and the next value from
 * the input collection. It must return the new reduction result, with the next value incorporated into it. This is the
 * function that defines how reduce a value onto the collection.
 *
 * `transducer/result` (referred to from now on as `result`) should be a function that takes one parameter, which is the
 * fully reduced collection. It should return the final output collection. This affords a chance to make any last-minute
 * adjustments to the reduced collection before returning it.
 *
 * Arrays, strings, and objects are all given support for all of these protocols. Other collections will have to provide
 * their own (though it should be noted that since `iterator` is built-in, many third-party collections will already
 * implement this protocol). As an example, let's add transducer support to a third-party collection, the
 * `Immutable.List` collection from {@link https://facebook.github.io/immutable-js/|immutable-js}.
 *
 * ```
 * Immutable.List.prototype[protocols.init] = () => Immutable.List().asMutable();
 * Immutable.List.prototype[protocols.step] = (acc, input) => acc.push(input);
 * Immutable.List.prototype[protocols.result] = (value) => value.asImmutable();
 * ```
 *
 * `Immutable.List` already implements `iterator`, so we don't have to do it ourselves.
 *
 * The `init` function returns an empty mutable list. This is important for immutable-js because its default lists are
 * immutable, and immutable lists mean that a new list has to be created with every reduction step. It would work fine,
 * but it's quite inefficient.
 *
 * The `step` function adds the next value to the already-created list. `Immutable.List` provides a `push` function that
 * works like an array's `push`, except that it returns the new list with the value pushed onto it. This is perfect for
 * our `step` function.
 *
 * The `result` function converts the now-finished mutable list into an immutable one, which is what's going to be
 * expected if we're transducing something into an `Immutable.List`. In most cases, `result` doesn't have to do any
 * work, but since we're creating an intermediate representation of our collection type here, this lets us create the
 * collection that we actually want to output. (Without `result`, we would have to use immutable lists all the way
 * through, creating a new one with each `step` function, since we wouldn't be able to make this converstion at the
 * end.)
 *
 * With those protocols implemented on the prototype, `Immutable.List` collections can now support any transduction we
 * can offer.
 *
 * ### Protocols
 *
 * After talking a lot about protocols and showing how they're properties added to an object, it's probably pretty
 * obvious that there's been no mention of what the actual names of those properties are. That's what
 * `{@link module:xduce.protocols|protocols}` is for.
 *
 * `{@link module:xduce.protocols|protocols}` means that the actual names aren't important, which is good because the
 * name might vary depending on whether or not the JavaScript environment has symbols defined. That unknown quantity can
 * be abstracted away by using the properties on the `{@link module:xduce.protocols|protocols}` object as property keys.
 * (Besides, the actual name of the protocol will either be a `Symbol` for the name of the protocol or a string like
 * `'@@transducer/init'`, depending on whether `Symbol`s are available, and those aren't a lot of fun to work with.)
 *
 * The best way to use these keys can be seen in the immutable-js example above. Instead of worrying about the name of
 * the key for the `init` protocol, the value of `protocols.init` is used.
 *
 * `{@link module:xduce.protocols|protocols}` defines these protocol property names.
 *
 * - `iterator`: if this is built in (like in later versions of node.js or in ES2015), this will match the built-in
 *   protocol name.
 * - `init`
 * - `step`
 * - `result`
 * - `reduced`: used internally to mark a collection as already reduced
 * - `value`: used internally to provide the actual value of a reduced collection
 *
 * The final two values don't have a lot of use outside the library unless you're writing your own transducers.
 *
 * ## How Objects Are Treated
 *
 * Before getting onto the core functions, let's talk about objects.
 *
 * Objects bear some thought because regularly, they aren't candidates for iteration. They don't have any inherent
 * order, normally something that's necessary for true iteration, and they have *two* pieces of data (key and value) for
 * every element instead of one. Yet it's undeniable that at least for most transformations, being able to apply them to
 * objects would be quite handy.
 *
 * For that reason, special support is provided end-to-end for objects.
 *
 * ### Object iteration
 *
 * Iterating over an object will produce one object per property of the original object. An order is imposed; by
 * default, this order is "alphabetical by key". The `{@link module:xduce.iterator|iterator}` function can be passed a
 * sorting function that can sort keys in any other way.
 *
 * The result of the iteration, by default, is a set of objects of the form `{k: key, v: value}`, called kv-form. The
 * reason for this form is that it's much easier to write transformation functions when you know the name of the key. In
 * the regular single-property `{key: value}` form (which is still available by passing `false` as the third parameter
 * to `{@link module:xduce.iterator|iterator}`), the name of the key is unknown; in kv-form, the names of the keys are
 * `k` and `v`.
 *
 * ```
 * var obj = {c: 1, a: 2, b: 3};
 * var reverseSort = function (a, b) { return a < b ? 1 : b > a ? -1 : 0; };
 *
 * var result = iterator(obj);
 * // asArray(result) = [{k: 'a', v: 2}, {k: 'b', v: 3}, {k: 'c', v: 1}]
 *
 * result = iterator(obj, reverseSort);
 * // asArray(result) = [{k: 'c', v: 1}, {k: 'b', v: 3}, {k: 'a', v: 2}]
 *
 * result = iterator(obj, null, false);
 * // asArray(result) = [{a: 2}, {b: 3}, {c: 1}]
 *
 * result = iterator(obj, reverseSort, false);
 * // asArray(result) = [{c: 1}, {b: 3}, {a: 2}]
 * ```
 *
 * Internally, every object is iterated into kv-form, so if you wish to have it in single-property, you must use
 * `{@link module:xduce.iterator|iterator}` in this way and pass that iterator into the transduction function.
 *
 * ### Object transformation
 *
 * The kv-form makes writing transformation functions a lot easier. For comparison, here's what a mapping function (for
 * a `{@link module:xduce.map|map}` transformer) would look like if we were using the single-property form.
 *
 * ```javascript
 * function doObjectSingle(obj) {
 *   var key = Object.keys(obj)[0];
 *   var result = {};
 *   result[key.toUpperCase()] = obj[key] + 1;
 *   return result;
 * }
 * ```
 *
 * Here's what the same function looks like using kv-form.
 *
 * ```javascript
 * function doObjectKv(obj) {
 *   var result = {};
 *   result[obj.k.toUpperCase()]: obj.v + 1;
 *   return result;
 * }
 * ```
 *
 * This is easier, but we can do better. The built-in reducers also recognize kv-form, which means that we can have our
 * mapping function produce kv-form objects as well.
 *
 * ```javascript
 * function doObjectKvImproved(obj) {
 *   return {k: obj.k.toUpperCase(), v: obj.v + 1};
 * }
 * ```
 *
 * This is clearly the easiest to read and write - if you're using ES5. If you're using ES2015, destructuring and
 * dynamic object keys allow you to write `doObjectKv` as
 *
 * ```javascript
 * doObjectKv = ({k, v}) => {[k.toUpperCase()]: v + 1};
 * ```
 *
 * ### Reducing objects
 *
 * The built-in reducers (for arrays, objects, strings, and iterators) understand kv-form and will reduce objects
 * properly whether they're in single-property or kv-form. If you're adding transducer support for non-supported types,
 * you will have to decide whether to support kv-form. It takes a little extra coding, while single-property form just
 * works.
 *
 * That's it for object-object reduction. Converting between objects and other types is another matter.
 *
 * Every transducer function except for `{@link module:xduce.sequence|sequence}` is capable of turning an object into a
 * different type of collection, turning a different type of collection into an object, or both. Objects are different
 * because they're the only "collections" that have two different pieces of data per element. Because of this, we have
 * to have a strategy on how to move from one to another.
 *
 * Transducing an object into a different type is generally pretty easy. If an object is converted into an array, for
 * instance, the array elements will each be single-property objects, one per property of the original object.
 *
 * Strings are a different story, since encoding a single-property object to a string isn't possible (because every
 * "element" of a string has to be a single character). Strings that are produced from objects will instead just be the
 * object values, concatenated. Because objects are iterated in a particular order, this conversion will always produce
 * the same string, but except in some very specific cases there really isn't a lot of use for this converstion.
 *
 * ```javascript
 * var obj = {a: 1, b: 2};
 *
 * var result = asArray(obj);
 * // result = [{a: 1}, {b: 2}]
 *
 * result = asIterator(obj);
 * // result is an iterator with two values: {a: 1} and {b: 2}
 *
 * result = into(Immutable.List(), obj)
 * // result is an immutable list with two elements: {a: 1} and {b: 2}
 *
 * result = asString(obj);
 * // result is '12'
 * ```
 *
 * The opposite conversion depends on the values inside the collections. If those values are objects, then the result is
 * an object with all of the objects combined (if more than one has the same key, the last one is the one that's kept).
 * Otherwise, keys are created for each of the elements, starting with `0` and increasing from there.
 *
 * This means that converting an object to any non-string collection and back produces the original object.
 *
 * ```javascript
 * var result = asObject([{a: 1}, {b: 2}]);
 * // result = {a: 1, b: 2}
 *
 * result = asObject([1, 2, 3]);
 * // result = {0: 1, 1: 2, 2: 3}
 *
 * result = asObject('hello');
 * // result = {0: 'h', 1: 'e', 2: 'l', 3: 'l', 4: 'o'}
 * ```
 *
 * @module xduce
 */

/**
 * A generic iterator. This conforms to the `iterator` protocol in that it has a `{@link module:xduce~next|next}`
 * function that produces {@link module:xduce~nextValue|`iterator`-compatible objects}.
 *
 * @typedef {object} iterator
 * @property {module:xduce~next} next A function that, when called, returns the next iterator value.
 */

/**
 * The function that makes an object an iterator. This can be called repeatedly, with each call returning one iterator
 * value, in order. This function must therefore keep state to know *which* of the values is the one to return next,
 * based on the values that have already been returned by prior calls.
 *
 * @callback next
 * @return {module:xduce~nextValue} An object containing the status and value of the next step of the iteration.
 */

/**
 * An object returned by an iterator's `next` function. It has two properties so one can be used as a flag, since
 * values like `false` and `undefined` can be legitimate iterator values.
 *
 * @typedef {object} nextValue
 * @property {boolean} done A flag to indicate whether there are any more values remaining in the iterator. Once this
 *     becomes `true`, there are no more iterator values (and the object may not even have a `value` property).
 * @property {*} [value] The value returned by the iterator on this step. As long as `done` is `false`, this will be a
 *     valid value. Once `done` returns `true`, if there will be no further valid values (the spec allows a "return
 *     value", but this library does not use that).
 */

/**
 * A function used for sorting a collection.
 *
 * @callback sort
 * @param {*} a The first item to compare.
 * @param {*} b The second item to compare.
 * @return {number} Either `1` if `a` is less than `b`, `-1` if `a` is greater than `b`, or `0` if `a` is equal to `b`.
 */

/**
 * The mapping of protocol names to their respective property key names. The values of this map will depend on whether
 * symbols are available.
 *
 * @typedef {object} protocolMap
 * @property {(string|Symbol)} init The `iterator` protocol. This is built-in in ES2015+ environments; in that case the
 *     built-in protocol will be the value of this property.
 * @property {(string|Symbol)} init The `transducer/init` protocol. This is used to mark functions that initialize a
 *     target collection before adding items to it.
 * @property {(string|Symbol)} step The `transducer/step` protocol. This is used to mark functions that are used in the
 *     transducer's step process, where objects are added to the target collection one at a time.
 * @property {(string|Symbol)} result The `transducer/result` protocol. This is used to mark functions that take the
 *     final result of the step process and return the final form to be output. This is optional; if the transducer does
 *     not want to transform the final result, it should just return the result of its chained transducer's `result`
 *     function.
 * @property {(string|Symbol)} reduced The `transducer/reduced` protocol. The presence of this key on an object
 *     indicates that its transformation has been completed. It is used internally to mark collections whose
 *     transformations conclude before every object is iterated over (as in `{@link xduce.take}` transducers.) It is of
 *     little use beyond transducer authoring.
 * @property {(string|Symbol)} value The `transducer/value` protocol. This is used internally to mark properties that
 *     contain the value of a reduced transformation. It is of little use beyond transducer authoring.
 */

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Transduction protocol function definitions

/**
 * Returns a new, blank, empty instance of the target collection.
 *
 * @callback init
 * @return {*} An initial instance of the target collection. This is usually, but is not required to be, an empty
 *     instance of the collection.``
 */

/**
 * Performs a transformation on a single element of a collection, adding it to the target collection at the end. Thus,
 * this function performs both the transformation *and* the reduction steps.
 *
 * @callback step
 * @param {*} acc The target collection into which the transformed value will be reduced.
 * @param {*} value A single element from the original collection, which is to be tranformed and reduced into the target
 *     collection.
 * @return {*} The resulting collection after the provided value is reduced into the target collection.
 */

/**
 * Performs any post-processing on the completely reduced target collection. This lets a transducer make a final,
 * whole-collection transformation, particularly useful when the step function has been used on an intermediate form
 * of the collection which is not meant to be the output.
 *
 * @callback result
 * @param {*} input The final, reduced collection derived from using {@link module:xduce~step} on each of the original
 *     collection's elements.
 * @return {*} The final collection that is the result of the transduction.
 */

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Transducers

/**
 * An object implementing all three transduction protocols (`init`, `step`, and `result`) which is used by the engine
 * to define transduction.
 *
 * Transducer objects can (and must) be chained together. For instance, none of the transducer functions defined in
 * {@link module:xduce.transducers} produces objects that know how to reduce transformed values into an output
 * collection. This is the entire point; reduction is separate from transformation, which allows transformations to be
 * used no matter the type of the output collection. So the engine automatically chains transducer objects to a reducer
 * object (which is basically a specialized transducer objects whose `step` function transforms its inputs by adding
 * them to a collection) that *does* know how to create an output collection. Thus, the protocol methods need to call
 * the protocol methods of the next transducer object in the chain.
 *
 * For that reason, transducer objects are not created manually. They are instead created by
 * {@link module:xduce~transducerFunction|transducer functions} that automatically create transducer objects and link
 * them to the next transducer object in the chain.
 *
 * @typedef {object} transducerObject
 * @property {module:xduce~init} @@transducer/init An implementation of the transducer `init` protocol. In environments
 *     where symbols are available, this will be named `Symbol.for('transducer/init')`.
 * @property {module:xduce~step} @@transducer/step An implementation of the transducer `step` protocol. In environments
 *     where symbols are available, this will be named `Symbol.for('transducer/step')`.
 * @property {module:xduce~result} @@transducer/result An implementation of the transducer `result` protocol. In
 *     environments where symbols are available, this will be named `Symbol.for('transducer/result')`.
 */

/**
 * A function that creates a {@link module:xduce~transducerObject|transducer object} and links it to the next one in
 * the chain.
 *
 * @callback transducerFunction
 * @param {module:xduce~transducerObject} xform A transducer object to chain the new transducer object to.
 * @return {module:xduce~transducerObject} A new transducer object already chained to `xform`.
 */

/**
 * A function that is responsible for performing transductions on collections.
 *
 * These functions have two forms. If no input collection is supplied, then this takes a set of configuration parameters
 * and returns a {@link module:xduce~transducerFunction|transducer function} configured to handle that specific
 * transformation.
 *
 * There is also a shortcut form, where an input collection *is* supplied. In this case, a transducer function is still
 * configured and created, but then it is immediately applied as though `{@link module:xduce.sequence|sequence}` was
 * called with that collection and transducer function. The transformed collection is then returned.
 *
 * @callback transducer
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {...*} params Parameters that are used to configure the underlying transformation. Which parameters are
 *     necessary depends on the transducer. See the {@link module:xduce.transducers|individual transducers} for details.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */

var _require = __webpack_require__(0),
    bmpCharAt = _require.bmpCharAt,
    bmpLength = _require.bmpLength,
    range = _require.range,
    complement = _require.complement,
    isArray = _require.isArray,
    isFunction = _require.isFunction,
    isNumber = _require.isNumber,
    isObject = _require.isObject,
    isString = _require.isString;

var _require2 = __webpack_require__(13),
    complete = _require2.complete,
    uncomplete = _require2.uncomplete,
    isCompleted = _require2.isCompleted,
    ensureCompleted = _require2.ensureCompleted,
    ensureUncompleted = _require2.ensureUncompleted,
    toReducer = _require2.toReducer,
    toFunction = _require2.toFunction,
    reduce = _require2.reduce;

var _require3 = __webpack_require__(1),
    protocols = _require3.protocols;

var _require4 = __webpack_require__(20),
    iterator = _require4.iterator;

var _require5 = __webpack_require__(4),
    transduce = _require5.transduce,
    into = _require5.into,
    sequence = _require5.sequence,
    asArray = _require5.asArray,
    asIterator = _require5.asIterator,
    asObject = _require5.asObject,
    asString = _require5.asString,
    compose = _require5.compose;

var _require6 = __webpack_require__(53),
    chunk = _require6.chunk,
    chunkBy = _require6.chunkBy;

var _require7 = __webpack_require__(14),
    identity = _require7.identity,
    flatten = _require7.flatten,
    repeat = _require7.repeat;

var _require8 = __webpack_require__(54),
    distinct = _require8.distinct,
    distinctBy = _require8.distinctBy,
    distinctWith = _require8.distinctWith;

var _require9 = __webpack_require__(55),
    drop = _require9.drop,
    dropWhile = _require9.dropWhile;

var _require10 = __webpack_require__(56),
    filter = _require10.filter,
    reject = _require10.reject,
    compact = _require10.compact;

var _require11 = __webpack_require__(57),
    map = _require11.map,
    flatMap = _require11.flatMap;

var _require12 = __webpack_require__(58),
    take = _require12.take,
    takeWhile = _require12.takeWhile,
    takeNth = _require12.takeNth;

var _require13 = __webpack_require__(59),
    unique = _require13.unique,
    uniqueBy = _require13.uniqueBy,
    uniqueWith = _require13.uniqueWith;

module.exports = {
  /**
   * A series of utility functions that are used internally in Xduce. Most of them don't have a lot to do with
   * transducers themselves, but since they were already available and potentially useful, they're provided here. The
   * reduction-related functions *are* related to transducers, specifically to writing them, so they are also provided.
   *
   * @memberof module:xduce
   * @static
   * @namespace util
   * @type {object}
   */
  util: {
    /**
     * These functions are used by xduce to create iterators for strings in pre-ES2015 environments. String iterators in
     * ES2015+ account for double-width characters in the Basic Multilingual Plane, returning those double-wide
     * characters as one iterator value. Older environments do not do this; double-width characters would in that case
     * be returned as two distinct characters, but for Xduce's use of these functions.
     *
     * Note that the built-in `charAt` and `length` do *not* take double-width characters into account even in ES2015+
     * environments even though iterators do. These functions are still useful as utility functions in any environment.
     *
     * @memberof module:xduce.util
     * @static
     * @namespace bmp
     * @type {object}
     */
    bmp: {
      charAt: bmpCharAt,
      length: bmpLength
    },
    range: range,
    complement: complement,

    isArray: isArray,
    isFunction: isFunction,
    isNumber: isNumber,
    isObject: isObject,
    isString: isString,

    /**
     * Helper functions for writing transducers. These are markers for telling the transducer engine that operation on
     * a value should be complete, even if there are still input elements left.
     *
     * For example, the {@link module:xduce.transducers.take|take} transducer marks its output collection as completed
     * when it takes a certain number of items. This allows reduction to be shut off before all of the elements of the
     * input collection are processed.
     *
     * Without being able to be marked as completed, the only other option for the
     * {@link module:xduce.transducers.take|take} transducer would be to process the collection to its end and simply
     * not add any of the elements after a certain number to the output collection. This would be inefficient and would
     * also make it impossible for {@link module:xduce.transducers.take|take} to handle infinite iterators.
     *
     * Values can be completed multiple times. This nests a completed value inside a completed value, and so on. To
     * uncomplete values like this, {@link module:xduce.util.status.uncomplete|uncomplete} would have to be called
     * multiple times. This is used in the library in the `{@link module:xduce.transducers.flatten|flatten}` transducer.
     *
     * @memberof module:xduce.util
     * @static
     * @namespace status
     * @type {object}
     */
    status: {
      complete: complete,
      uncomplete: uncomplete,
      isCompleted: isCompleted,
      ensureCompleted: ensureCompleted,
      ensureUncompleted: ensureUncompleted
    }
  },
  protocols: protocols,
  iterator: iterator,
  toReducer: toReducer,
  toFunction: toFunction,
  reduce: reduce,
  transduce: transduce,
  into: into,
  sequence: sequence,
  asArray: asArray,
  asIterator: asIterator,
  asObject: asObject,
  asString: asString,
  compose: compose,

  /**
   * Functions which actually perform transformations on the elements of input collections.
   *
   * Each of these is a function of type {@link module:xduce~transducer}. They can operate either by transforming a
   * collection themselves or, if no collection is supplied, by creating a
   * {@link module:xduce~transducerFunction|transducer function} that can be passed to any of the functions that
   * require one (`{@link module:xduce.sequence|sequence}`, `{@link module:xduce.into|into}`,
   * `{@link module:xduce.transduce|transduce}`, `{@link module:xduce.asArray|asArray}`, etc.).
   *
   * For example, here are transducers operating directly on collections.
   *
   * ```
   * const collection = [1, 2, 3, 4, 5];
   *
   * let result = map(collection, x => x + 1);
   * // result = [2, 3, 4, 5, 6]
   *
   * result = filter(collection, x => x < 3);
   * // result = [1, 2]
   * ```
   *
   * Here are transducers producing transducer functions, which are then used by
   * `{@link module:xduce.sequence|sequence}` to perform the same transformations.
   *
   * ```
   * const collection = [1, 2, 3, 4, 5];
   *
   * let result = sequence(collection, map(x => x + 1));
   * // result = [2, 3, 4, 5, 6]
   *
   * result = sequence(collection, filter(x => x < 3));
   * ```
   *
   * The shortcut form, the one that takes a collection, is extremely convenient but limited. It cannot, for example,
   * transform one type of collection into another type (turning an array of numbers into a string of numbers, for
   * instance). Shortcuts also cannot be composed. Here are examples of both of these, showing how they're done by
   * using transducers to create transducer functions (which are then passed to `{@link module:xduce.asArray|asArray}`
   * and `{@link module:xduce.compose|compose}` in these cases).
   *
   * ```
   * const collection = [1, 2, 3, 4, 5];
   *
   * let result = asString(collection, map(x => x + 1));
   * // result = '23456'
   *
   * result = sequence(collection, compose(filter(x => x < 3), map(x => x + 1)));
   * // result = [2, 3]
   * ```
   *
   * @memberof module:xduce
   * @static
   * @namespace transducers
   * @type {object}
   */
  transducers: {
    chunk: chunk,
    chunkBy: chunkBy,
    identity: identity,
    flatten: flatten,
    repeat: repeat,
    distinct: distinct,
    distinctBy: distinctBy,
    distinctWith: distinctWith,
    drop: drop,
    dropWhile: dropWhile,
    filter: filter,
    reject: reject,
    compact: compact,
    map: map,
    flatMap: flatMap,
    take: take,
    takeWhile: takeWhile,
    takeNth: takeNth,
    unique: unique,
    uniqueBy: uniqueBy,
    uniqueWith: uniqueWith
  }
};

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _symbol = __webpack_require__(24);

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers related to breaking input elements into groups.
 *
 * @module chunk
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(13),
    ensureUncompleted = _require3.ensureUncompleted;

var _require4 = __webpack_require__(0),
    isFunction = _require4.isFunction,
    isNumber = _require4.isNumber;

var _require5 = __webpack_require__(14),
    sameValueZero = _require5.sameValueZero;

var p = protocols;

/**
 * A constant indicating no value at all.
 *
 * @private
 * @type {symbol}
 */
var NO_VALUE = (0, _symbol2.default)('NO_VALUE');

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.chunk|chunk}` transducer.
 *
 * @private
 *
 * @param {number} n The number of elements that should be in each chunk.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function chunkTransducer(n, xform) {
  var _ref;

  var count = 0;
  var part = [];

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    part[count++] = input;
    if (count === n) {
      var out = part.slice(0, n);
      part = [];
      count = 0;
      return xform[p.step](acc, out);
    }
    return acc;
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    if (count > 0) {
      return ensureUncompleted(xform[p.step](value, part.slice(0, count)));
    }
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Groups the elements of the input collection into arrays of length `n` in the output collection.**
 *
 * Whatever the type of input collection, the groups inside the output collection will always be arrays (the output
 * collection itself will still be definable as normal). Because of this, `chunk` doesn't do anything meaningful to
 * collection types that cannot contain arrays (strings and objects, for instance).
 *
 * If there are not enough remaining elements in the input collection to create a chunk of the proper size in the output
 * collection, the last chunk in the output will only be large enough to contain those remaining elements.
 *
 * `chunk` works on iterators (it returns a new iterator whose values are arrays), but because of technical reasons,
 * the function has no way of knowing when the end of an iterator comes unless it happens to be at the same place as the
 * last element of a chunk. For example, if an iterator has six values and it gets `chunk`ed into groups of three, the
 * function will terminate correctly (because the last value of the iterator coincides with the last element of one of
 * the chunks). However, if the same iterator had only five values, `chunk` would not terminate properly. It would
 * return `[1, 2, 3]` for the first chunk, `[4, 5]` for the second chunk, and then `[4, 5]` over and over ad infinitum.
 *
 * A workaround is to compose `chunk` with a previous `{@link module:xduce.transducers.take|take}` with the same `n` as
 * the length of the iterator. Since `{@link module:xduce.transducers.take|take}` knows when it's reached the right
 * number of elements, it can communicate that to `chunk`.
 *
 * Another is to check the length of the chunk after each call to `next` on the iterator. If it's less than the size of
 * the chunk, then it must be the last one.
 *
 * `chunk` works as expected on infinite iterators.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = chunk([1, 2, 3, 4, 5], 3);
 * // result = [[1, 2, 3], [4, 5]]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {number} n The number of elements that should be in each array in the output collection.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection chunked. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function chunk(collection, n) {
  var _ref2 = isNumber(collection) ? [null, collection] : [collection, n],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      num = _ref3[1];

  return col ? sequence(col, chunk(num)) : function (xform) {
    return chunkTransducer(num, xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.chunkBy|chunkBy}` transducer.
 *
 * @private
 *
 * @param {function} fn The function that defines when a chunk ends and the next chunk begins.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function chunkByTransducer(fn, xform) {
  var _ref4;

  var part = [];
  var last = NO_VALUE;

  return _ref4 = {}, (0, _defineProperty3.default)(_ref4, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref4, p.step, function (acc, input) {
    var current = fn(input);
    var result = acc;
    if (last === NO_VALUE || sameValueZero(current, last)) {
      part.push(input);
    } else {
      result = xform[p.step](result, part);
      part = [input];
    }
    last = current;
    return result;
  }), (0, _defineProperty3.default)(_ref4, p.result, function (value) {
    var count = part.length;
    if (count > 0) {
      return ensureUncompleted(xform[p.step](value, part.slice(0, count)));
    }
    return xform[p.result](value);
  }), _ref4;
}

/**
 * **Breaks the elements of an input collection into arrays of consecutive elements that return the same value from a
 * predicate function.**
 *
 * Whatever the type of input collection, the groups inside the output collection will always be arrays (the output
 * collection itself will still be of the same type as the input collection). Because of this, `chunkBy` doesn't do
 * anything meaningful to collection types that cannot contain arrays (strings and objects, for instance).
 *
 * Unlike `{@link module:xduce.transducers.chunk|chunk}`, this function does not know how many elements will be in each
 * array until the first one that turns out to be part of the next array. Therefore, for the same reasons as in
 * `{@link module:xduce.transducers.chunk|chunk}` above, an iterator result is never terminated. This works fine for
 * infinite iterators, but finite iterators should be treated with care. The same
 * `{@link module:xduce.transducers.chunk|chunk}` workaround with `{@link module:xduce.transducers.take|take}` works
 * with `chunkBy` as well.
 *
 * ```
 * const result = chunkBy([0, 1, 1, 2, 3, 5, 8, 13, 21, 34], x => x % 2 === 0);
 * // result = [[0], [1, 1], [2], [3, 5], [8], [13, 21], [34]]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn The function that defines when a chunk ends and the next chunk begins.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection chunked. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function chunkBy(collection, fn, ctx) {
  var _ref5 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref6 = (0, _slicedToArray3.default)(_ref5, 2),
      col = _ref6[0],
      func = _ref6[1];

  return col ? sequence(col, chunkBy(func)) : function (xform) {
    return chunkByTransducer(func, xform);
  };
}

module.exports = {
  chunk: chunk,
  chunkBy: chunkBy
};

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _symbol = __webpack_require__(24);

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for rejecting repeated consecutive elements in a collection.
 *
 * @module distinct
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(0),
    isFunction = _require3.isFunction;

var _require4 = __webpack_require__(14),
    sameValueZero = _require4.sameValueZero;

var p = protocols;

var NO_VALUE = (0, _symbol2.default)('NO_VALUE');

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.distinct|distinct}`,
 * `{@link module:xduce.transducers.distinctBy|distinctBy}`, and
 * `{@link module:xduce.transducers.distinctWith|distinctWith}` transducers.
 *
 * @private
 *
 * @param {function} fn The two-argument comparator function that defines when two values are equal.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function distinctTransducer(fn, xform) {
  var _ref;

  var last = NO_VALUE;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    if (last !== NO_VALUE && fn(input, last)) {
      return acc;
    }
    last = input;
    return xform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Applies a comparator function to consecutive elements of a collection and removes the second if the comparator
 * indicates they're equal.**
 *
 * Comparisons are made by passing each pair of elements to the function, which must take two parameters and return a
 * boolean indicating whether or not the values are equal. As an example, the
 * `{@link module:xduce.transducers.distinct|distinct}` transducer could be regarded as the same as this transformer,
 * with a {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero} function serving as the
 * comparator.
 *
 * This is different from `{@link module:xduce.transducers.uniqueWith|uniqueWith}` in that this transform only
 * eliminates consecutive duplicate elements, not all duplicate elements.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * // magnitude returns the number of digits in a number
 * function magnitude(x) {
 *   return Math.floor(Math.log(x) / Math.LN10 + 0.000000001);
 * }
 * function comparator(a, b) {
 *   return magnitude(a) === magnitude(b);
 * }
 *
 * let result = distinctWith([1, 10, 100, 42, 56, 893, 1111, 1000], comparator);
 * // result = [1, 10, 100, 42, 893, 1111]
 *
 * // Compare to uniueqWith with the same parameters
 * result = uniqueWith([1, 10, 100, 42, 56, 893, 1111, 1000], comparator);
 * // result = [1, 10, 100, 1111]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A comparator function. This takes two arguments and returns `true` if they're to be regarded as
 *     equal.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function distinctWith(collection, fn, ctx) {
  var _ref2 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      func = _ref3[1];

  return col ? sequence(col, distinctWith(func)) : function (xform) {
    return distinctTransducer(func, xform);
  };
}

/**
 * **Applies a function each element of a collection and removes consecutive elements that create duplicate return
 * values.**
 *
 * Once the function is applied to the collection elements, a comparison is made using
 * {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero}. If a comparison indicates that
 * the return value from the function for one element is the same as the return value for the element that comes right
 * before it, only the first element is retained in the output collection.
 *
 * Also note that even though the function can cause a completely different value to be compared, the *element* (not the
 * return value of the function) is what is added to the output collection.
 *
 * A very common use for `distinctBy` is to refer to a particular property in an array of objects. Another is to do a
 * case-insensitive comparison by passing a function that turns every letter in a string to the same case. However, it
 * can be used in any number of different ways, depending on the function used.
 *
 * This is different from `{@link module:xduce.transducers.uniqueBy|uniqueBy}` in that this transform only eliminates
 * consecutive duplicate elements, not all duplicate elements.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const array = [{x: 1}, {x: 1}, {x: 2}, {x: 3}, {x: 3}, {x: 3},
 *                {x: 4}, {x: 5}, {x: 3}, {x: 1}, {x: 5}];
 *
 * let result = distinctBy(array, obj => obj.x);
 * // result = [{x: 1}, {x: 2}, {x: 3}, {x: 4}, {x: 5}, {x: 3}, {x: 1}, {x: 5}]
 *
 * // Compare to uniqueBy for the same parameters
 * result = uniqueBy(array, obj => obj.x);
 * // result = [{x: 1}, {x: 2}, {x: 3}, {x: 4}, {x: 5}]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A function of one parameter applied to each element in the input collection before testing the
 *     results for uniqueness.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function distinctBy(collection, fn, ctx) {
  var _ref4 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
      col = _ref5[0],
      func = _ref5[1];

  return distinctWith(col, function (a, b) {
    return sameValueZero(func(a), func(b));
  });
}

/**
 * **Removes consecutive duplicate elements from a collection.**
 *
 * This differs from `{@link module:xduce.transducers.unique|unique}` in that an element is removed only if it equals
 * the element *immediately preceeding* it. Comparisons between elements are done with
 * {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero}.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * let result = distinct([1, 1, 2, 3, 3, 3, 4, 5, 3, 1, 5]);
 * // result = [1, 2, 3, 4, 5, 3, 1, 5];
 *
 * // Compare to unique with the same input
 * result = unique([1, 1, 2, 3, 3, 3, 4, 5, 3, 1, 5]);
 * // result = [1, 2, 3, 4, 5];
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function distinct(collection) {
  return distinctWith(collection, sameValueZero);
}

module.exports = {
  distinct: distinct,
  distinctBy: distinctBy,
  distinctWith: distinctWith
};

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for dropping some number of elements at the beginning of a collection.
 *
 * @module drop
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(0),
    isNumber = _require3.isNumber,
    isFunction = _require3.isFunction;

var p = protocols;

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.drop|drop}` transducer.
 *
 * @private
 *
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function dropTransducer(n, xform) {
  var _ref;

  var i = 0;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    return i++ < n ? acc : xform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Creates a new collection consisting of all of the elements of the input collection *except* for the first `n`
 * elements.**
 *
 * While this could be considered an opposite of `{@link module:xduce.transducers.take|take}`, there is one difference:
 * `drop` cannot return a finite collection when provided an infinite one.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = drop([1, 2, 3, 4, 5], 3);
 * // result = [4, 5]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {number} n The number of elements at the beginning of the input collection that should be discarded in the
 *     output collection.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type without its first `n` elements. If no collection is supplied, a transducer function,
 *     suitable for passing to `{@link module:xduce.sequence|sequence}`, `{@link module:xduce.into|into}`, etc. is
 *     returned.
 */
function drop(collection, n) {
  var _ref2 = isNumber(collection) ? [null, collection] : [collection, n],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      num = _ref3[1];

  return col ? sequence(col, drop(num)) : function (xform) {
    return dropTransducer(num, xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.dropWhile|dropWhile}` transducer.
 *
 * @private
 *
 * @param {function} fn A single-parameter predicate function that determines which is the first element to be included
 *     in the output collection.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function dropWhileTransducer(fn, xform) {
  var _ref4;

  var dropping = true;

  return _ref4 = {}, (0, _defineProperty3.default)(_ref4, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref4, p.step, function (acc, input) {
    if (dropping) {
      if (fn(input)) {
        return acc;
      }
      dropping = false;
    }
    return xform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref4, p.result, function (value) {
    return xform[p.result](value);
  }), _ref4;
}

/**
 * **Creates a new collection containing the elements of the input collection including the first one that causes a
 * predicate function to return `false` and all elements thereafter.**
 *
 * This is rather the opposite of `{@link module:xduce.transducers.takeWhile|takeWhile}`, though unlike that function,
 * this one cannot return a finite collection when given an infinite one. It's also related to
 * `{@link module:xduce.transducers.reject|reject}`, except that once the first element is not rejected, every element
 * after that is also not rejected (even if they would make the predicate return `true`).
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const array = [2, 4, 6, 8, 1, 3, 5, 7, 9, 10];
 * const even = x => x % 2 === 0;
 *
 * let result = dropWhile(array, even);
 * // result = [1, 3, 5, 7, 9, 10];
 *
 * // This shows the difference between `dropWhile` and `reject` with the same parameters
 * result = reject(array, even);
 * // result = [1, 3, 5, 7, 9];
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A predicate function. This takes each element of the input collection and returns `true` or
 *     `false` based on that element. The first one to return `false` is the first element of the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with some of the elements of the input collection dropped. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function dropWhile(collection, fn, ctx) {
  var _ref5 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref6 = (0, _slicedToArray3.default)(_ref5, 2),
      col = _ref6[0],
      func = _ref6[1];

  return col ? sequence(col, dropWhile(func)) : function (xform) {
    return dropWhileTransducer(func, xform);
  };
}

module.exports = {
  drop: drop,
  dropWhile: dropWhile
};

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for removing or retaining certain elements based on their properties.
 *
 * @module filter
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(0),
    isFunction = _require3.isFunction,
    complement = _require3.complement;

var p = protocols;

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.filter|filter}`,
 * `{@link module:xduce.transducers.reject|reject}`, and `{@link module:xduce.transducers.compact|compact}` transducers.
 *
 * @private
 *
 * @param {function} fn A single-parameter predicate function that determines which elements should be retained in the
 *     output collection.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function filterTransducer(fn, xform) {
  var _ref;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    return fn(input) ? xform[p.step](acc, input) : acc;
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Creates a collection containing only the elements from the input collection that pass a predicate function.**
 *
 * The elements are not in any way modified. Quite simply, if the predicate returns `true` for an element, it's included
 * in the output collection, and if it returns `false`, that element is not included.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const even = x => x % 2 === 0; *
 * const result = filter([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], even);
 * // result = [2, 4, 6, 8, 10]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A predicate function. This takes each element of the input collection and returns `true` or
 *     `false` based on that element. Each that returns `true` will be included in the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing only the elements that pass the predicate function. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function filter(collection, fn, ctx) {
  var _ref2 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      func = _ref3[1];

  return col ? sequence(col, filter(func)) : function (xform) {
    return filterTransducer(func, xform);
  };
}

/**
 * **Creates a collection containing only the elements from the input collection that do not pass a predicate
 * function.**
 *
 * This is the opposite of `{@link module:xduce.transducers.filter|filter}`. None of the elements of the input
 * collection are modified, and only those for which the predicate returns `false` are included in the output
 * collection.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const even = x => x % 2 === 0;
 * const result = reject([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], even);
 * // result = [1, 3, 5, 7, 9]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A predicate function. This takes each element of the input collection and returns `true` or
 *     `false` based on that element. Each that returns `false` will be included in the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing only the elements that fail the predicate function. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function reject(collection, fn, ctx) {
  var _ref4 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
      col = _ref5[0],
      func = _ref5[1];

  return filter(col, complement(func));
}

/**
 * **Removes any 'falsey' elements from the collection.**
 *
 * 'Falsey' means any value in JavaScript that is considered to be false. These values are `false`, `null`, `undefined`,
 * the empty string, and `0`. This function is good for removing empy elements from a collection.
 *
 * If the semantics don't suit - for example, if you want to remove empty elements but retain `0`s - then use an
 * appropriate function with either `{@link module:xduce.transducers.filter|filter}` or
 * `{@link module:xduce.transducers.reject|reject}`.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = compact([1, 0, 2, null, 3, undefined, 4, '', 5]);
 * // result = [1, 2, 3, 4, 5]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the falsey elements of that collection removed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function compact(collection) {
  return filter(collection, function (x) {
    return !!x;
  });
}

module.exports = {
  filter: filter,
  reject: reject,
  compact: compact
};

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for using functions to determine new values of collection elements.
 *
 * @module map
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence,
    compose = _require2.compose;

var _require3 = __webpack_require__(0),
    isFunction = _require3.isFunction;

var _require4 = __webpack_require__(14),
    flatten = _require4.flatten;

var p = protocols;

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.map|map}` transducer.
 *
 * @private
 *
 * @param {function} fn A single-parameter function which is supplied each input collection element in turn. The return
 *     values of these calls become the elements of the output collection.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function mapTransducer(fn, xform) {
  var _ref;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    return xform[p.step](acc, fn(input));
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Creates a new collection whose values are the results of mapping input collection elements over a function.**
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = map([1, 2, 3, 4, 5], x => x * x);
 * // result = [1, 4, 9, 16, 25]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A function that is supplied each input collection element in turn. The return values of this
 *     function become the elements of the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing the return values of `fn` when passed those elements. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function map(collection, fn, ctx) {
  var _ref2 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      func = _ref3[1];

  return col ? sequence(col, map(func)) : function (xform) {
    return mapTransducer(func, xform);
  };
}

/**
 * **A map function that flattens any collections among the return values.**
 *
 * This is a composition of `{@link module:xduce.transducers.map|map}` and
 * `{@link module:xduce.transducers.flatten|flatten}`. In fact it could be defined by the user by using those two
 * functions with `{@link module:xduce.compose|compose}`, but the concept of a flatmap is so fundamental that it's
 * included separately.
 *
 * Because the map is followed by flattening, there are the same notes as with
 * `{@link module:xduce.transducers.flatten|flatten}`; this function doesn't make a lot of sense with functions that
 * return objects, strings, or iterators.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const duplicate = x => [x, x];
 *
 * let result = flatMap([1, 2, 3, 4, 5], duplicate);
 * // result = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
 *
 * // The following is equivalent
 * const fn = compose(map(duplicate), flatten());
 * result = sequence([1, 2, 3, 4, 5], fn);
 * // result = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]
 *
 * // To illustrate the difference from `map`, here's what `map` would do with
 * // the same parameters
 * result = map([1, 2, 3, 4, 5], duplicate);
 * // result = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A function that is supplied each input collection element in turn. The return values of this
 *     function are flattened to become the elements of the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing those elements, mapped and flattened. If no collection is supplied, a
 *     transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function flatMap(collection, fn, ctx) {
  var _ref4 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
      col = _ref5[0],
      func = _ref5[1];

  return col ? sequence(col, compose(map(func), flatten())) : compose(map(func), flatten());
}

module.exports = {
  map: map,
  flatMap: flatMap
};

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for dropping some number of elements at the end of a collection.
 *
 * @module take
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(13),
    ensureCompleted = _require2.ensureCompleted;

var _require3 = __webpack_require__(4),
    sequence = _require3.sequence;

var _require4 = __webpack_require__(0),
    isNumber = _require4.isNumber,
    isFunction = _require4.isFunction;

var p = protocols;

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.take|take}` transducer.
 *
 * @private
 *
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function takeTransducer(n, xform) {
  var _ref;

  var i = 0;

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    var result = acc;

    if (i < n) {
      result = xform[p.step](acc, input);
      if (i === n - 1) {
        result = ensureCompleted(result);
      }
    }
    i++;
    return result;
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Creates a new collection containing only the first `n` elements of the input collection.**
 *
 * Note that this is an excellent way to turn an 'infinite' collection - one that doesn't have a well-defined end, like
 * a stream, channel, or infinite generator - into a finite collection.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * // An iterator that will return every positive integer, one at a time per next() call
 * function* naturals() {
 *   let x = 1;
 *   while (true) {
 *     yield x++;
 *   }
 * }
 *
 * const result = take(naturals(), 3);
 * // result is now an iterator that has only three values in it
 * result.next().value === 1;  // true
 * result.next().value === 2;  // true
 * result.next().value === 3;  // true
 * result.next().done;         // true
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {number} n The number of elements at the beginning of the input collection that should be kept in the
 *     output collection.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing only the first `n` elements. If no collection is supplied, a transducer
 *     function, suitable for passing to `{@link module:xduce.sequence|sequence}`, `{@link module:xduce.into|into}`,
 *     etc. is returned.
 */
function take(collection, n) {
  var _ref2 = isNumber(collection) ? [null, collection] : [collection, n],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      num = _ref3[1];

  return col ? sequence(col, take(num)) : function (xform) {
    return takeTransducer(num, xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.takeWhile|takeWhile}` transducer.
 *
 * @private
 *
 * @param {function} fn A single-parameter predicate function that determines which is the first element to be rejected
 *     in the output collection.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function takeWhileTransducer(fn, xform) {
  var _ref4;

  return _ref4 = {}, (0, _defineProperty3.default)(_ref4, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref4, p.step, function (acc, input) {
    return fn(input) ? xform[p.step](acc, input) : ensureCompleted(acc);
  }), (0, _defineProperty3.default)(_ref4, p.result, function (value) {
    return xform[p.result](value);
  }), _ref4;
}

/**
 * **Creates a new collection containing the elements of the input collection up until the first one that causes a
 * predicate function to return `false`.**
 *
 * While this is similar to `{@link module:xduce.transducers.filter|filter}`, there is one key difference. `takeWhile`
 * will not add any further elements to a collection once the first fails the predicate, including later elements that
 * might pass the predicate. `{@link module:xduce.transducers.filter|filter}`, on the other hand, will continue to add
 * those later elements. Therefore `takeWhile` will convert an infinite collection to a finite one while
 * `{@link module:xduce.transducers.filter|filter}` cannot.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const array = [2, 4, 6, 8, 1, 3, 5, 7, 9, 10];
 * const even = x => x % 2 === 0;
 *
 * let result = takeWhile(array, even);
 * // result = [2, 4, 6, 8];
 *
 * // This shows the difference between takeWhile and filter with the same parameters
 * result = filter(array, even);
 * // result = [2, 4, 6, 8, 10];
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A predicate function. This takes each element of the input collection and returns `true` or
 *     `false` based on that element. The first one to return `false` is the first element of the input collection that
 *     does *not* appear in the output collection.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with some of the elements of the input collection dropped. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function takeWhile(collection, fn, ctx) {
  var _ref5 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref6 = (0, _slicedToArray3.default)(_ref5, 2),
      col = _ref6[0],
      func = _ref6[1];

  return col ? sequence(col, takeWhile(func)) : function (xform) {
    return takeWhileTransducer(func, xform);
  };
}

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.takeNth|takeNth}` transducer.
 *
 * @private
 *
 * @param {number} n The skip value, meaning that only every `n`th element is retained.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object, performing no transformation and chaining to the
 *     provided transducer object.
 */
function takeNthTransducer(n, xform) {
  var _ref7;

  var i = -1;

  return _ref7 = {}, (0, _defineProperty3.default)(_ref7, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref7, p.step, function (acc, input) {
    return ++i % n === 0 ? xform[p.step](acc, input) : acc;
  }), (0, _defineProperty3.default)(_ref7, p.result, function (value) {
    return xform[p.result](value);
  }), _ref7;
}

/**
 * **Creates a new collection consisting of the first element of the input collection, and then every `n`th element
 * after that.**
 *
 * Note that unlike `{@link module:xduce.transducers.take|take}` and
 * `{@link module:xduce.transducers.takeWhile|takeWhile}`, this function is not capable of returning a finite collection
 * when given an infinite collection.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * const result = takeNth([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
 * // result = [1, 4, 7, 10]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {number} n The skip value. Every `n`th element of the input collection, after the first, will be a part of
 *     the output collection.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type containing only every `n` elements. If no collection is supplied, a transducer
 *     function, suitable for passing to `{@link module:xduce.sequence|sequence}`, `{@link module:xduce.into|into}`,
 *     etc. is returned.
 */
function takeNth(collection, n) {
  var _ref8 = isNumber(collection) ? [null, collection] : [collection, n],
      _ref9 = (0, _slicedToArray3.default)(_ref8, 2),
      col = _ref9[0],
      num = _ref9[1];

  return col ? sequence(col, takeNth(num)) : function (xform) {
    return takeNthTransducer(num, xform);
  };
}

module.exports = {
  take: take,
  takeWhile: takeWhile,
  takeNth: takeNth
};

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _slicedToArray2 = __webpack_require__(5);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _defineProperty2 = __webpack_require__(3);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
 * Transducers for rejecting repeated elements in a collection.
 *
 * @module unique
 * @private
 */

var _require = __webpack_require__(1),
    protocols = _require.protocols;

var _require2 = __webpack_require__(4),
    sequence = _require2.sequence;

var _require3 = __webpack_require__(0),
    isFunction = _require3.isFunction;

var _require4 = __webpack_require__(14),
    sameValueZero = _require4.sameValueZero;

var p = protocols;

/**
 * A transducer function that is returned by the `{@link module:xduce.transducers.unique|unique}`,
 * `{@link module:xduce.transducers.uniqueBy|uniqueBy}`, and
 * `{@link module:xduce.transducers.uniqueWith|uniqueWith}` transducers.
 *
 * @private
 *
 * @param {function} fn The two-argument comparator function that defines when two values are equal.
 * @param {module:xduce~transducerObject} xform The transducer object that the new one should be chained to.
 * @return {module:xduce~transducerObject} A new transducer object chained to the provided transducer object.
 */
function uniqueTransducer(fn, xform) {
  var _ref;

  var uniques = [];

  return _ref = {}, (0, _defineProperty3.default)(_ref, p.init, function () {
    return xform[p.init]();
  }), (0, _defineProperty3.default)(_ref, p.step, function (acc, input) {
    if (uniques.some(function (u) {
      return fn(input, u);
    })) {
      return acc;
    }
    uniques.push(input);
    return xform[p.step](acc, input);
  }), (0, _defineProperty3.default)(_ref, p.result, function (value) {
    return xform[p.result](value);
  }), _ref;
}

/**
 * **Removes all duplicates from a collection, using a comparator function to determine what's unique.**
 *
 * Comparisons are made by passing each pair of elements to the function, which must take two parameters and return a
 * boolean indicating whether or not the values are equal. As an example, the
 * `{@link module:xduce.transducers.unique|unique}` transducer could be regarded as the same as this transducer, with a
 * {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero} function serving as the
 * comparator.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * Example:
 *
 * ```
 * // magnitude returns the number of digits in a number
 * function magnitude(x) {
 *   return Math.floor(Math.log(x) / Math.LN10 + 0.000000001);
 * }
 * function comparator(a, b) {
 *   return magnitude(a) === magnitude(b);
 * }
 *
 * // Returns only the first value of each magnitude
 * const result = uniqueWith([1, 10, 100, 42, 56, 893, 1111, 1000], comparator);
 * // result = [1, 10, 100, 1111]
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A comparator function. This takes two arguments and returns `true` if they're to be regarded as
 *     equal.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function uniqueWith(collection, fn, ctx) {
  var _ref2 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      col = _ref3[0],
      func = _ref3[1];

  return col ? sequence(col, uniqueWith(func)) : function (xform) {
    return uniqueTransducer(func, xform);
  };
}

/**
 * **Applies a function each element of a collection and removes elements that create duplicate return values.**
 *
 * Once the function is applied to the collection elements, a comparison is made using
 * {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero}. If a comparison indicates that
 * the return value from the function for one element is the same as the return value for another element, only the
 * first element is retained in the output collection.
 *
 * Also note that even though the function can cause a completely different value to be compared, the *element* (not
 * the return value of the function) is what is added to the output collection.
 *
 * A very common use for `uniqueBy` is to refer to a particular property in an array of objects. Another is to do a
 * case-insensitive comparison by passing a function that turns every letter in a string to the same case. However, it
 * can be used in any number of different ways, depending on the function used.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * var array = [{x: 1}, {x: 1}, {x: 2}, {x: 3}, {x: 3}, {x: 3},
 *              {x: 4}, {x: 5}, {x: 3}, {x: 1}, {x: 5}];
 *
 * var result = uniqueBy(array, obj => obj.x);
 * // result = [{x: 1}, {x: 2}, {x: 3}, {x: 4}, {x: 5}]
 *
 * // Comparison is case-insensitive, the duplicate letter retained is the first one that appears
 * // This is why 'N' is present in the output, not 'n', for example
 * result = uniqueBy('aNtidiseSTablIshmENtaRianiSM', x => x.toLowerCase());
 * // result = 'aNtidseblhmR'
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @param {function} fn A function of one parameter applied to each element in the input collection before testing the
 *     results for uniqueness.
 * @param {object} [ctx] An optional context object which is set to `this` for the function `fn`. This does not work if
 *     `fn` is an arrow function, as they cannot be bound to contexts.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function uniqueBy(collection, fn, ctx) {
  var _ref4 = isFunction(collection) ? [null, collection.bind(fn)] : [collection, fn.bind(ctx)],
      _ref5 = (0, _slicedToArray3.default)(_ref4, 2),
      col = _ref5[0],
      func = _ref5[1];

  return uniqueWith(col, function (a, b) {
    return sameValueZero(func(a), func(b));
  });
}

/**
 * **Removes all duplicates from a collection.**
 *
 * Once an element is added to the output collection, an equal element will never be added to the output collection
 * again. 'Equal' according to this transformer is a
 * {@link http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero|SameValueZero} comparison.
 *
 * If no collection is provided, a function is returned that can be passed to `{@link module:xduce.sequence|sequence}`,
 * et al.
 *
 * ```
 * var result = unique([1, 1, 2, 3, 3, 3, 4, 5, 3, 1, 5]);
 * // result = [1, 2, 3, 4, 5];
 * ```
 *
 * @memberof module:xduce.transducers
 *
 * @param {*} [collection] An optional input collection that is to be transduced.
 * @return {(*|module:xduce~transducerFunction)} If a collection is supplied, then the function returns a new
 *     collection of the same type with all of the elements of the input collection transformed. If no collection is
 *     supplied, a transducer function, suitable for passing to `{@link module:xduce.sequence|sequence}`,
 *     `{@link module:xduce.into|into}`, etc. is returned.
 */
function unique(collection) {
  return uniqueWith(collection, sameValueZero);
}

module.exports = {
  unique: unique,
  uniqueBy: uniqueBy,
  uniqueWith: uniqueWith
};

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(68), __esModule: true };

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(69), __esModule: true };

/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(70), __esModule: true };

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(71), __esModule: true };

/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(72), __esModule: true };

/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(73), __esModule: true };

/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(74), __esModule: true };

/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(76), __esModule: true };

/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(39);
__webpack_require__(38);
module.exports = __webpack_require__(97);

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(39);
__webpack_require__(38);
module.exports = __webpack_require__(98);

/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(100);
module.exports = __webpack_require__(2).Math.sign;

/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(101);
var $Object = __webpack_require__(2).Object;
module.exports = function defineProperty(it, key, desc){
  return $Object.defineProperty(it, key, desc);
};

/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(102);
module.exports = __webpack_require__(2).Object.getPrototypeOf;

/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(103);
module.exports = __webpack_require__(2).Object.keys;

/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(51);
module.exports = __webpack_require__(2).Symbol['for'];

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(51);
__webpack_require__(104);
__webpack_require__(105);
__webpack_require__(106);
module.exports = __webpack_require__(2).Symbol;

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(38);
__webpack_require__(39);
module.exports = __webpack_require__(37).f('iterator');

/***/ }),
/* 77 */
/***/ (function(module, exports) {

module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};

/***/ }),
/* 78 */
/***/ (function(module, exports) {

module.exports = function(){ /* empty */ };

/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

// false -> Array#indexOf
// true  -> Array#includes
var toIObject = __webpack_require__(11)
  , toLength  = __webpack_require__(95)
  , toIndex   = __webpack_require__(94);
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

// optional / simple context binding
var aFunction = __webpack_require__(77);
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};

/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

// all enumerable object keys, includes symbols
var getKeys = __webpack_require__(19)
  , gOPS    = __webpack_require__(46)
  , pIE     = __webpack_require__(29);
module.exports = function(it){
  var result     = getKeys(it)
    , getSymbols = gOPS.f;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = pIE.f
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))result.push(key);
  } return result;
};

/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(7).document && document.documentElement;

/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = __webpack_require__(25);
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};

/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {

// 7.2.2 IsArray(argument)
var cof = __webpack_require__(25);
module.exports = Array.isArray || function isArray(arg){
  return cof(arg) == 'Array';
};

/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var create         = __webpack_require__(44)
  , descriptor     = __webpack_require__(22)
  , setToStringTag = __webpack_require__(30)
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
__webpack_require__(12)(IteratorPrototype, __webpack_require__(6)('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};

/***/ }),
/* 86 */
/***/ (function(module, exports) {

module.exports = function(done, value){
  return {value: value, done: !!done};
};

/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

var getKeys   = __webpack_require__(19)
  , toIObject = __webpack_require__(11);
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};

/***/ }),
/* 88 */
/***/ (function(module, exports) {

// 20.2.2.28 Math.sign(x)
module.exports = Math.sign || function sign(x){
  return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
};

/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

var META     = __webpack_require__(23)('meta')
  , isObject = __webpack_require__(21)
  , has      = __webpack_require__(9)
  , setDesc  = __webpack_require__(10).f
  , id       = 0;
var isExtensible = Object.isExtensible || function(){
  return true;
};
var FREEZE = !__webpack_require__(17)(function(){
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function(it){
  setDesc(it, META, {value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  }});
};
var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add metadata
    if(!create)return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function(it, create){
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return true;
    // not necessary to add metadata
    if(!create)return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function(it){
  if(FREEZE && meta.NEED && isExtensible(it) && !has(it, META))setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY:      META,
  NEED:     false,
  fastKey:  fastKey,
  getWeak:  getWeak,
  onFreeze: onFreeze
};

/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

var dP       = __webpack_require__(10)
  , anObject = __webpack_require__(15)
  , getKeys  = __webpack_require__(19);

module.exports = __webpack_require__(8) ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

var pIE            = __webpack_require__(29)
  , createDesc     = __webpack_require__(22)
  , toIObject      = __webpack_require__(11)
  , toPrimitive    = __webpack_require__(35)
  , has            = __webpack_require__(9)
  , IE8_DOM_DEFINE = __webpack_require__(42)
  , gOPD           = Object.getOwnPropertyDescriptor;

exports.f = __webpack_require__(8) ? gOPD : function getOwnPropertyDescriptor(O, P){
  O = toIObject(O);
  P = toPrimitive(P, true);
  if(IE8_DOM_DEFINE)try {
    return gOPD(O, P);
  } catch(e){ /* empty */ }
  if(has(O, P))return createDesc(!pIE.f.call(O, P), O[P]);
};

/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = __webpack_require__(11)
  , gOPN      = __webpack_require__(45).f
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return gOPN(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it){
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};


/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(33)
  , defined   = __webpack_require__(26);
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(33)
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.15 ToLength
var toInteger = __webpack_require__(33)
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

var classof   = __webpack_require__(40)
  , ITERATOR  = __webpack_require__(6)('iterator')
  , Iterators = __webpack_require__(18);
module.exports = __webpack_require__(2).getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};

/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

var anObject = __webpack_require__(15)
  , get      = __webpack_require__(96);
module.exports = __webpack_require__(2).getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};

/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

var classof   = __webpack_require__(40)
  , ITERATOR  = __webpack_require__(6)('iterator')
  , Iterators = __webpack_require__(18);
module.exports = __webpack_require__(2).isIterable = function(it){
  var O = Object(it);
  return O[ITERATOR] !== undefined
    || '@@iterator' in O
    || Iterators.hasOwnProperty(classof(O));
};

/***/ }),
/* 99 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var addToUnscopables = __webpack_require__(78)
  , step             = __webpack_require__(86)
  , Iterators        = __webpack_require__(18)
  , toIObject        = __webpack_require__(11);

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = __webpack_require__(43)(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

/***/ }),
/* 100 */
/***/ (function(module, exports, __webpack_require__) {

// 20.2.2.28 Math.sign(x)
var $export = __webpack_require__(16);

$export($export.S, 'Math', {sign: __webpack_require__(88)});

/***/ }),
/* 101 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(16);
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !__webpack_require__(8), 'Object', {defineProperty: __webpack_require__(10).f});

/***/ }),
/* 102 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.9 Object.getPrototypeOf(O)
var toObject        = __webpack_require__(34)
  , $getPrototypeOf = __webpack_require__(47);

__webpack_require__(49)('getPrototypeOf', function(){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});

/***/ }),
/* 103 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.14 Object.keys(O)
var toObject = __webpack_require__(34)
  , $keys    = __webpack_require__(19);

__webpack_require__(49)('keys', function(){
  return function keys(it){
    return $keys(toObject(it));
  };
});

/***/ }),
/* 104 */
/***/ (function(module, exports) {



/***/ }),
/* 105 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(36)('asyncIterator');

/***/ }),
/* 106 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(36)('observable');

/***/ }),
/* 107 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(52);


/***/ })
/******/ ]);
});

/***/ }),
/* 11 */,
/* 12 */
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
 * @module cispy/promise/util
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
 * @namespace CispyPromiseUtil
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

const conversion = __webpack_require__(17);
const flow = __webpack_require__(18);
const timing = __webpack_require__(19);

module.exports = Object.assign({}, conversion, flow, timing);


/***/ }),
/* 13 */,
/* 14 */,
/* 15 */,
/* 16 */,
/* 17 */
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
 * @module cispy/promise/util/conversion
 * @private
 */

const { chan, close, CLOSED } = __webpack_require__(0);
const { putAsync } = __webpack_require__(1);
const { put, take } = __webpack_require__(5);

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
 * const {chan, put, take, close, util} = cispy;
 * const {reduce} = util;
 *
 * const input = chan();
 * const output = reduce((acc, value) => acc + value, input, 0);
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 *   await put(input, 3);
 *   close(input);
 * })();
 *
 * (async () => {
 *   const result = await take(output);
 *   console.log(output);                  // -> 6
 * })();
 *
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will ever appear on the output channel. The
 * closing of the channel is what signifies that the reduction should be completed.
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/promise/util~reducer} fn The reducer function responsible for turning the series of channel
 *     values into a single output value.
 * @param {module:cispy/core/channel~Channel} ch The channel whose values are being reduced into a single output value.
 * @param {*} init The initial value to feed into the reducer function for the first reduction step.
 * @return {module:cispy/core/channel~Channel} A channel that will, when the input channel closes, have the reduced
 *     value put into it. When this value is taken, the channel will automatically close.
 */
function reduce(fn, ch, init) {
  const output = chan();

  async function loop() {
    let acc = init;
    for (;;) {
      const value = await take(ch);
      if (value === CLOSED) {
        putAsync(output, acc, () => close(output));
        return;
      }
      acc = fn(acc, value);
    }
  }

  loop();
  return output;
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
 * const {chan, take, util} = cispy;
 * const {onto} = util;
 *
 * const input = [1, 2, 3];
 * const output = onto(input);
 *
 * (async () => {
 *   console.log(await take(output));     // -> 1
 *   console.log(await take(output));     // -> 2
 *   console.log(await take(output));     // -> 3
 *   console.log(output.closed);          // -> true
 * })();
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/core/channel~Channel} [ch] The channel onto which to put all of the array elements. If this is
 *     not present, a new channel will be created.
 * @param {Array} array The array of values to be put onto the channel.
 * @return {module:cispy/core/channel~Channel} the channel onto which the array elements are put. This is the same as
 *     the input channel, but if no input channel is specified, this will be a new channel. It will close when the final
 *     value is taken from it.
 */
function onto(ch, array) {
  const [chnl, arr] = Array.isArray(ch) ? [chan(ch.length), ch] : [ch, array];

  async function loop() {
    for (const item of arr) {
      await put(chnl, item);
    }
    close(chnl);
  }

  loop();
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
 * const {chan, put, take, close, util} = cispy;
 * const {into} = util;
 *
 * const input = chan();
 * const output = into(input);
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 *   await put(input, 3);
 *   close(input);
 * })();
 *
 * (async () => {
 *   const result = await take(output);
 *   console.log(result);                 // -> [1, 2, 3]
 * })();
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will ever appear on the output channel. The
 * closing of the channel is what signifies that all of the values needed to make the array are now available.
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
/* 18 */
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
 * @module cispy/promise/util/flow
 * @private
 */

const { chan, close, CLOSED } = __webpack_require__(0);
const { putAsync, takeAsync } = __webpack_require__(1);
const { put, take, alts } = __webpack_require__(5);

const protocols = {
  taps: Symbol('multitap/taps')
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
 * channel closing. The rest of those functions (aside from the special-case
 * `{@link module:cispy/promise/util~CispyPromiseUtil.tap}`) automatically close their destination channels when the
 * source channels close.
 *
 * ```
 * const {chan, put, take, close, util} = cispy;
 * const {pipe} = util;
 *
 * const input = chan();
 * const output = pipe(input, chan());
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 *   close(input);
 * })();
 *
 * (async () => {
 *   console.log(await take(output));      // -> 1
 *   console.log(await take(output));      // -> 2
 *   console.log(output.closed);           // -> true
 * })();
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/core/channel~Channel} src The source channel.
 * @param {module:cispy/core/channel~Channel} dest The destination channel.
 * @param {boolean} [keepOpen=false] A flag to indicate that the destination channel should be kept open after the
 *     source channel closes. By default the destination channel will close when the source channel closes.
 * @return {module:cispy/core/channel~Channel} The destination channel.
 */
function pipe(src, dest, keepOpen) {
  async function loop() {
    for (;;) {
      const value = await take(src);
      if (value === CLOSED) {
        if (!keepOpen) {
          close(dest);
        }
        break;
      }
      if (!await put(dest, value)) {
        break;
      }
    }
  }

  loop();
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
 * const {chan, put, take, util} = cispy;
 * const {partition} = util;
 *
 * const input = chan();
 * const [even, odd] = partition(x => x % 2 === 0, input);
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 *   await put(input, 3);
 *   await put(input, 4);
 * })();
 *
 * (async () => {
 *   console.log(await take(even));     // -> 2
 *   console.log(await take(even));     // -> 4
 * })();
 *
 * (async () => {
 *   console.log(await take(odd));      // -> 1
 *   console.log(await take(odd));      // -> 3
 * })();
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/promise/util~predicate} fn A predicate function used to test each value on the input channel.
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

  async function loop() {
    for (;;) {
      const value = await take(src);
      if (value === CLOSED) {
        close(tDest);
        close(fDest);
        break;
      }
      await put(fn(value) ? tDest : fDest, value);
    }
  }

  loop();
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
 * const {chan, put, take, util} = cispy;
 * const {merge} = util;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = merge([input1, input2, input3]);
 *
 * (async () => {
 *   // Because we're putting to all three channels in the same
 *   // process, we know the order in which the values will be
 *   // put on the output channel; in general, we won't know this
 *   await put(input1, 1);
 *   await put(input2, 2);
 *   await put(input3, 3);
 * })();
 *
 * (async () => {
 *   console.log(await take(output));      // -> 1
 *   console.log(await take(output));      // -> 2
 *   console.log(await take(output));      // -> 3
 * })();
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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

  async function loop() {
    for (;;) {
      if (inputs.length === 0) {
        break;
      }
      const { value, channel } = await alts(inputs);
      if (value === CLOSED) {
        const index = inputs.indexOf(channel);
        inputs.splice(index, 1);
        continue;
      }
      await put(dest, value);
    }
    close(dest);
  }

  loop();
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
 * const {chan, put, take, util} = cispy;
 * const {split} = util;
 *
 * const input = chan();
 * const outputs = split(input, 3);
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 *   await put(input, 3);
 * })();
 *
 * (async () => {
 *   for (const output of outputs) {       // Each output will happen 3 times
 *     console.log(await take(output));    // -> 1
 *     console.log(await take(output));    // -> 2
 *     console.log(await take(output));    // -> 3
 *   }
 * })();
 * ```
 *
 * This function moves its values to the output channels asynchronously. This means that even when using unbuffered
 * channels, it is not necessary for all output channels to be taken from before the next put to the input channel can
 * complete.
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
    const count = bs[0];
    bs = [];
    for (let i = 0; i < count; ++i) {
      bs.push(0);
    }
  }

  for (const b of bs) {
    dests.push(chan(b));
  }

  const done = chan();
  let count = 0;

  function cb() {
    if (--count === 0) {
      putAsync(done);
    }
  }

  async function loop() {
    for (;;) {
      const value = await take(src);
      if (value === CLOSED) {
        for (const dest of dests) {
          close(dest);
        }
        break;
      }

      count = dests.length;
      for (const dest of dests) {
        putAsync(dest, value, cb);
      }
      await take(done);
    }
  }

  loop();
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

  const done = chan();
  let count = 0;

  function cb() {
    if (--count === 0) {
      putAsync(done);
    }
  }

  async function loop() {
    for (;;) {
      const value = await take(src);
      if (value === CLOSED || src[protocols.taps].length === 0) {
        delete src[protocols.taps];
        break;
      }

      count = src[protocols.taps].length;
      for (const tap of src[protocols.taps]) {
        putAsync(tap, value, cb);
      }
      await take(done);
    }
  }

  loop();
}

/**
 * **Taps a channel, sending all of the values put onto it to the destination channel.**
 *
 * A source channel can be tapped multiple times, and all of the tapping (destination) channels receive each value put
 * onto the tapped (source) channel.
 *
 * This is different from `{@link module:cispy/promise/util~CispyPromiseUtil.split}` in that it's temporary. Channels
 * can tap a channel and then untap it, multiple times, as needed. If a source channel has all of its taps removed, then
 * it reverts to a normal channel, just as it was before it was tapped.
 *
 * Also unlike `{@link module:cispy/promise/util~CispyPromiseUtil.split}`, each call can only tap once. For multiple
 * channels to tap a source channel, `tap` has to be called multiple times.
 *
 * Closing either the source or any of the destination channels has no effect on any of the other channels.
 *
 * ```
 * const {chan, put, take, util} = cispy;
 * const {tap} = util;
 *
 * const input = chan();
 * const tapper = chan();
 * tap(input, tapper);
 *
 * (async () => {
 *   await put(input, 1);
 *   await put(input, 2);
 * })();
 *
 * (async () => {
 *   console.log(await take(tapper));   // -> 1
 *   console.log(await take(tapper));   // -> 2
 * })();
 *
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/core/channel~Channel} src The tapped channel.
 * @param {module:cispy/core/channel~Channel} dest The channel that is tapping the source channel that should no longer
 *     be tapping the source channel.
 */
function untap(src, dest) {
  const taps = src[protocols.taps];
  if (taps) {
    const index = taps.indexOf(dest);
    if (index !== -1) {
      taps.splice(index, 1);
      if (taps.length === 0) {
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
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
 * const {chan, put, take, close, util} = cispy;
 * const {map} = util;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = map((x, y, z) => x + y + z, [input1, input2, input3]);
 *
 * (async () => {
 *   await put(input1, 1);
 *   await put(input1, 2);
 *   await put(input1, 3);
 * })();
 *
 * (async () => {
 *   await put(input2, 10);
 *   await put(input2, 20);
 *   close(input2);
 * })();
 *
 * (async () => {
 *   await put(input3, 100);
 *   await put(input3, 200);
 *   await put(input3, 300);
 * })();
 *
 * (async () => {
 *   console.log(await take(output));     // -> 111
 *   console.log(await take(output));     // -> 222
 *   // Output closes now because input2 closes after 2 values
 *   console.log(output.closed);          // -> true
 * })();
 * ```
 *
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
 * @param {module:cispy/promise/util~mapper} fn The mapping function. This should have one parameter for each source
 *     channel and return a single value.
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

  async function loop() {
    for (;;) {
      count = srcLen;
      for (let i = 0; i < srcLen; ++i) {
        takeAsync(srcs[i], callbacks[i]);
      }
      const values = await take(temp);
      for (const value of values) {
        if (value === CLOSED) {
          close(dest);
          return;
        }
      }
      await put(dest, fn(...values));
    }
  }

  loop();
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
/* 19 */
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
 * @module cispy/promise/util/timing
 * @private
 */

const { chan, timeout, close, CLOSED } = __webpack_require__(0);
const { put, alts } = __webpack_require__(5);

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
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
  const defaults = { leading: false, trailing: true, maxDelay: 0, cancel: chan() };
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign(defaults, (isNumber(delay) ? options : delay) || {});

  const dest = chan(buf);
  const { leading, trailing, maxDelay, cancel } = opts;

  async function loop() {
    let timer = chan();
    let max = chan();
    let current = CLOSED;

    for (;;) {
      const { value, channel } = await alts([src, timer, max, cancel]);

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
            await put(dest, value);
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
          await put(dest, current);
          current = CLOSED;
        }
      }
    }
  }

  loop();
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
 * @memberOf module:cispy/promise/util~CispyPromiseUtil
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
  const defaults = { leading: true, trailing: true, cancel: chan() };
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign(defaults, (isNumber(delay) ? options : delay) || {});

  const dest = chan(buf);
  const { leading, trailing, cancel } = opts;

  async function loop() {
    let timer = chan();
    let current = CLOSED;

    for (;;) {
      const { value, channel } = await alts([src, timer, cancel]);

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
            await put(dest, value);
          } else if (trailing) {
            current = value;
          }
        } else if (trailing) {
          current = value;
        }
      } else if (trailing && current !== CLOSED) {
        timer = timeout(del);
        await put(dest, current);
        current = CLOSED;
      } else {
        timer = chan();
      }
    }
  }

  loop();
  return dest;
}

module.exports = {
  debounce,
  throttle
};


/***/ }),
/* 20 */,
/* 21 */
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
 * All of the external, promise-based CSP functions are gathered here and exported as a whole. This includes core CSP
 * functions for channels, but it also includes buffers, special values, and utility functions.
 *
 * Most of the promise-based implementation is shared with the generator-based implementation. The only things that
 * are different are:
 *
 * - There is a `go`, but it's purely a convenience function. Since async functions are controlled by the JS engine,
 *   there's no need for this library to control them the way it does processes. There is no need for `spawn` and for
 *   `goSafe` (errors are handled just as they are in any other promise chain), however.
 * - Channel operations return promises rather than internal control objects, meaning they can be used in `await`
 *   expressions instead of `yield` expressions (the `xAsync` versions of each operation remain the same)
 * - The utility functions use the promise-based implementation.
 *
 * @module cispy/promise
 */

const { fixed, sliding, dropping, EMPTY } = __webpack_require__(2);
const { chan, timeout, close, CLOSED, DEFAULT } = __webpack_require__(0);
const { putAsync, takeAsync, altsAsync } = __webpack_require__(1);
const { config, SET_IMMEDIATE, MESSAGE_CHANNEL, SET_TIMEOUT } = __webpack_require__(3);

const { put, take, takeOrThrow, alts, sleep, go } = __webpack_require__(5);

const util = __webpack_require__(12);

/**
 * The core namespace under which all of the main promise-based functions reside in the API. This includes **only** the
 * blocking channel functions and utility functions. All other functions included in this library are the same as the
 * ones in the generator-based library. They are listed here for convenience.
 *
 * - `{@link module:cispy~Cispy.chan|chan}`
 * - `{@link module:cispy~Cispy.timeout|timeout}`
 * - `{@link module:cispy~Cispy.close|close}`
 * - `{@link module:cispy~Cispy.putAsync|putAsync}`
 * - `{@link module:cispy~Cispy.takeAsync|takeAsync}`
 * - `{@link module:cispy~Cispy.altsAsync|altsAsync}`
 * - `{@link module:cispy~Cispy.config|config}`
 * - `{@link module:cispy~Cispy.fixedBuffer|fixedBuffer}`
 * - `{@link module:cispy~Cispy.slidingBuffer|slidingBuffer}`
 * - `{@link module:cispy~Cispy.droppingBuffer|droppingBuffer}`
 * - `{@link module:cispy~Cispy.CLOSED|CLOSED}`
 * - `{@link module:cispy~Cispy.DEFAULT|DEFAULT}`
 * - `{@link module:cispy~Cispy.EMPTY|EMPTY}`
 * - `{@link module:cispy~Cispy.SET_IMMEDIATE|SET_IMMEDIATE}`
 * - `{@link module:cispy~Cispy.MESSAGE_CHANNEL|MESSAGE_CHANNEL}`
 * - `{@link module:cispy~Cispy.SET_TIMEOUT|SET_TIMEOUT}`
 *
 * @namespace CispyPromise
 */

module.exports = {
  go,
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
   * This is a small 'standard library' of promise-based operations that are useful when working with channels.
   *
   * @type {module:cispy/promise/util~CispyPromiseUtil}
   * @memberOf module:cispy/promise~CispyPromise
   */
  util
};


/***/ })
/******/ ]);
});