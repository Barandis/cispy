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
 * All of the externalCSP functions are gathered here and exported as a whole.
 * This includes core CSP functions for channels and processes, but it also
 * includes buffers, special values, and utility functions.
 *
 * @module cispy
 */

export { EMPTY } from "modules/buffers";
export { chan, CLOSED, DEFAULT } from "modules/channel";
export { sleep, go } from "modules/process";
export {
  config,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT,
} from "modules/dispatcher";

import { fixed, sliding, dropping } from "modules/buffers";
import * as c from "modules/channels";

export const Buffer = {
  fixed,
  sliding,
  dropping,
};

/**
 * **A set of utility functions for working with channels.**
 *
 * This is a small 'standard library' of promise-based operations that are
 * useful when working with channels.
 *
 * @type {module:cispy/util~CispyUtils}
 * @memberOf module:cispy~Cispy
 */
export const Channel = c;

/**
 * The core namespace under which all of the main functions reside in the API.
 * Everything in this namespace is accessible as a member of the main `cispy`
 * object that is required, imported, or accessed as a global object.
 *
 * @namespace Cispy
 */

/**
 * An error handling function. This is used to handle exceptions thrown in
 * processes and transducers. The return value of an exception handler is
 * typically put onto a channel; if the exception happened within a process, it
 * will be put to that process's output channel, and if the exception happened
 * in a transducer, it will be put to the channel to which the transducer is
 * attached.
 *
 * @callback exceptionHandler
 * @param {Object} err The error object that was thrown to cause the error being
 * handled.
 * @return {*} A value that will be put onto a channel..
 */

/**
 * A callback run when a non-blocking channel operation completes. The value
 * that this function receives is identical to what is returned by a blocking
 * call: the value being taken from the channel for a `take`, or `true` or
 * `false` depending on the channel status for a `put`. It need not return
 * anything; any return value is ignored.
 *
 * @callback nbCallback
 * @param {*} value Either the value taken from the channel, or whether or not a
 * value was successfully put.
 */

/**
 * A callback run when a non-blocking alts operation completes. Th evalue that
 * this function recieves is an object with two properties: the value that the
 * alts operation completed with (either the value taken from the channel in a
 * take operation, or `true` or `false` in a puts operation), along with the
 * channel where the operation actually took place. This function need not
 * return anything; any return value is ignored.
 *
 * @callback altsCallback
 * @param {Object} data The value returned from the alts operation.
 * @param {*} data.value The value of the completed operation. If the operation
 *     was a take, this is the value that was taken from the channel (or
 *     `{@link module:cispy~CLOSED|CLOSED}` if the channel was closed without a
 *     value being taken). If the operation was a put, this is `true` if the put
 *     value was taken and `false` if the channel was closed before that value
 *     could be taken.
 * @param {module:cispy/channel~Channel} data.channel The channel on which the
 * operation that was completed acted.
 */

/**
 * A function that transforms data and can be chained to other transducers. This
 * is handled by separate libraries; the only involvement of this library is as
 * a consumer of transducers. A transducer is stepped through each time a value
 * is taken from a channel.
 *
 * Transducers work by having step functions that are known via protocol, and it
 * is these step functions that take the data to be transformed as arguments.
 * The arguments to the transducers themselves are other transducers that are
 * then composed into a single transducer, which is then returned. These values
 * should not be a concern of a user of this library; just pass a transducer to
 * {@link module:cispy~chan|chan} and everything else will be handled.
 *
 * @callback transducer
 * @param {module:cispy~transducer} xform A transducer to chain this transducer
 * to.
 * @return {module:cispy~transducer} A new transducer chaining this one to
 * `xform`.
 */
