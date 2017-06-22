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
// generator by its `yield` expressions. By  passing special values out of those expressions (in the form of
// instruction objects), the process can control when and how the generator is restarted.

import { chan, box, isBox } from './channel';
import { run as dispatch } from './dispatcher';

// Names of the actual instructions that are used within a CSP process. These are the five operations that are
// explicitly supported by the Process object itself. Other instructions like putAsync and takeAsync are handled
// outside of the process and do not have process instructions.

const TAKE  = 'take';
const PUT   = 'put';
const ALTS  = 'alts';
const SLEEP = 'sleep';

// A unique value used to tag an object as an instruction. Since there's no access to this value outside of this module,
// there's no way to emulate (accidentally or on purpose) an instruction in the process queue.
const INSTRUCTION = Symbol();

// Used to represent the default channel in an alts call where a default is provided. If that default is returned, the
// default value is returned as the value of the `value` property while this is returned as the value of the `channel`
// property.

export const DEFAULT = Symbol('DEFAULT');

// These two handlers are used by channels to track execution of instructions (put, take, and alts). They provide two
// pieces of information: the function to call when a put or take unblocks (because a value sent to put has been taken,
// or a take has accepted a value that has been put) and whether or not the handler is still active.
//
// The function is a callback that actually defines the difference between put/take and putAsync/takeAsync: while the
// async calls use the callback passed to the function, put and take simply continue the process where it left off.
// (This is why put and take only work inside go functions, because otherwise there's no process to continue.) The alts
// instruction always continues the process upon completion; there is no async version of alts.
//
// This function is provided as the return value of the commit method. Calling commit has no extra effect with put and
// take instructions, but for alts, it also marks the handler as no longer being active. This means that only one of
// the operations passed to alts can be completed, because after the first one, the handler is no longer active and
// will not be allowed to process a second operation.
//
// If a put or take (or equivalent alts operation) cannot be immediately completed because there isn't a corresponding
// pending take or put, the handler is queued to be run when a new take or put becomes available.
function opHandler(fn) {
  return {
    fn,

    get active() {
      return true;
    },

    commit() {
      return this.fn;
    }
  };
}

function altsHandler(active, fn) {
  return {
    a: active,
    fn,

    get active() {
      return this.a.value;
    },

    commit() {
      this.a.value = false;
      return this.fn;
    }
  };
}

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

// Puts a value of any onto a channel. When the value is successfully taken off the channel by another process or when
// the channel closes, the callback fires if it exists.
export function putAsync(channel, value, callback) {
  const result = channel.put(value, opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

// Takes a value off a channel. When the value becomes available, it is passed to the callback.
export function takeAsync(channel, callback) {
  const result = channel.take(opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

// Creates an array of values from 0 to n - 1, shuffled randomly. Used to randomly determine the priority of operations
// in an alts call.
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

// Processes the operations in an alts function call. This works in the same way as `takeAsync` and `putAsync` except
// that each operation (each of which can be either a put or a take on any channel) is queued in a random order onto
// its channel and only the first to complete returns a value (the other ones become invalidated then and are
// discarded).
//
// The callback receives an object instead of a value. This object has two properties: `value` is the value that was
// returned from the channel, and `channel` is the channel onto which the successful operation was queued.
//
// The `options` parameter is the same as the options parameter in `alts`, discussed below.
function processAlts(ops, callback, options) {
  const count = ops.length;
  if (count === 0) {
    throw Error('Alts called with no operations');
  }

  const priority = !!options.priority;
  const indices = priority ? [] : randomArray(count);

  const active = box(true);

  function createAltsHandler(channel) {
    return altsHandler(active, (value) => {
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
export function process(gen, exh, onFinish) {
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
            const {channel, value} = item.data;
            putAsync(channel, value, (status) => this.continue(status));
            break;
          }

          case TAKE: {
            const {channel, except} = item.data;
            takeAsync(channel, (value) => this.continue(value, except));
            break;
          }

          case ALTS: {
            const {ops, options} = item.data;
            processAlts(ops, (result) => this.continue(result), options);
            break;
          }

          case SLEEP: {
            const {delay} = item.data;
            if (delay === 0) {
              setTimeout(() => this.continue(), 0);
            } else {
              const ch = chan();
              setTimeout(() => ch.close(), delay);
              takeAsync(ch, (value) => this.continue(value));
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

// Takes the first available value off the specified channel. If there is no value currently available, this will block
// until either the channel closes or a put is made onto the channel. If there are multiple takes (or take operations
// from `alts`) queued on the channel and waiting, they will be provided values in order as the values are put onto the
// channel.
//
// The return value of this function is a TAKE instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a value is returned from the channel. The process is then
// restarted, with the returned value from the channel becoming the value of the `yield` expression. If the unblocking
// was the result of the channel closing, then the value of that `yield` expression will be CLOSED.
export function take(channel) {
  return instruction(TAKE, {channel, except: false});
}

// Works exactly like `take`, except that if the value that is taken off the channel is an `Error` object, that error
// is thrown back into the process. At that point it acts exactly like any other thrown error.
export function takeOrThrow(channel) {
  return instruction(TAKE, {channel, except: true});
}

// Puts the value onto the specified channel. If there is no process ready to take this value, this function will block
// until either the channel closes or a taker becomes available. If there are multiple puts (or put operations from
// `alts`) queued on the channel and waiting, they will be processed in order as take requests happen.
//
// The return value of this function is a PUT instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a take is called on the channel or until the channel
// closes. The process is then restarted, and either `true` (if there was a take) or `false` (if the channel was
// closed) will become the value of the `yield` expression.
export function put(channel, value) {
  return instruction(PUT, {channel, value});
}

// Processes an arbitrary number of puts and takes (represented by the operations array). When the first operation
// successfully completes, the rest are discarded.
//
// Each element of the operations array is one operation. If that element is a channel, then the operation is a take on
// that channel. If the element is a two-element array, the operation is a put operation. These operations are queued
// on their respective channels in a random order. In this case, the first element of the sub-array should be the
// channel to put on, and the second value the value to put on that channel.
//
// As with put and take, the return value of this function is an instruction (ALTS), which is only useful in that a
// process knows how to use it to restart itself with the correct value being applied as the result of the `yield`
// expression that caused the process to pause in the first place.
//
// Operations are processed in a random order. The first one to come back without blocking, or if they all block, the
// first one to come unblocked, will be the operation that is run. Other operations will be discarded. The successful
// operation will cause an object to become the value of the `yield` expression in the process. This object has two
// properties: `value` is the return value of the operation (the same as the return value for either a put or a take),
// and `channel` is the channel on which the operation was executed. This way the process has the ability to know which
// channel was used to provide the value.
//
// This function takes an optional object that provides options to the execution. There are two legal options:
// `priority` causes the operations to be queued in the order of the operations array, rather than randomly; `default`
// causes its value to become the return value (with a channel of DEFAULT) if all operations block before completing.
// In this case all of the operations are discarded.
export function alts(ops, options = {}) {
  return instruction(ALTS, {ops, options});
}

// Blocks the process until some amount of time has elapsed. This is done by creating a local channel that isn't
// exposed to the outside and setting it to close after the required delay. The process then becomes unblocked because
// blocking stops when a channel closes. Since the channel is private, there's no way to prematurely unblock the
// process.
//
// If no delay is passed, or if that delay is 0, then a new channel won't be created. Instead, the process will simply
// relinquish its control and cause itself to be immediately queued back up to be run after all of the other processes
// (and the event loop) have a chance to run.
//
// The return value of this function is a SLEEP instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a the required amount of time has passed. The process is
// then restarted automatically.
export function sleep(delay = 0) {
  return instruction(SLEEP, {delay});
}
