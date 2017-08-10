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
// operations.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const { process, instruction, TAKE, PUT, ALTS, SLEEP } = require('./process');
const { fixed } = require('../core/buffers');
const { chan, close, CLOSED } = require('../core/channel');
const { putAsync } = require('../core/operations');

// Takes the first available value off the specified channel. If there is no value currently available, this will block
// until either the channel closes or a put is made onto the channel. If there are multiple takes (or take operations
// from `alts`) queued on the channel and waiting, they will be provided values in order as the values are put onto the
// channel.
//
// The return value of this function is a TAKE instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a value is returned from the channel. The process is then
// restarted, with the returned value from the channel becoming the value of the `yield` expression. If the unblocking
// was the result of the channel closing, then the value of that `yield` expression will be CLOSED.
function take(channel) {
  return instruction(TAKE, { channel, except: false });
}

// Works exactly like `take`, except that if the value that is taken off the channel is an `Error` object, that error
// is thrown back into the process. At that point it acts exactly like any other thrown error.
function takeOrThrow(channel) {
  return instruction(TAKE, { channel, except: true });
}

// Puts the value onto the specified channel. If there is no process ready to take this value, this function will block
// until either the channel closes or a taker becomes available. If there are multiple puts (or put operations from
// `alts`) queued on the channel and waiting, they will be processed in order as take requests happen.
//
// The return value of this function is a PUT instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a take is called on the channel or until the channel
// closes. The process is then restarted, and either `true` (if there was a take) or `false` (if the channel was
// closed) will become the value of the `yield` expression.
function put(channel, value) {
  return instruction(PUT, { channel, value });
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
function alts(ops, options = {}) {
  return instruction(ALTS, { ops, options });
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
function sleep(delay = 0) {
  return instruction(SLEEP, { delay });
}

// Creates a process from a generator (not a generator function) and runs it. The process is then left to its own
// devices until it returns. This function creates and returns a channel, though that channel can only ever have one
// value: the return value of the generator (the channel closes after this value is taken).
//
// If a second argument is passed and it's a function, then that function will be called when an exception is thrown
// within the process code itself. The handler receives the error object as an argument.
//
// Since this requires a generator and not a generator function, it isn't used nearly as much as `go`.
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

// Creates a process from a generator function (not a generator) and runs it. What this really does is create a
// generator from the generator function and its optional arguments, and then pass that off to `spawn`. But since
// generator functions have a literal form (`function* ()`) while generators themselves do not, this is going to be the
// much more commonly used function of the two.
function go(fn, ...args) {
  return spawn(fn(...args));
}

// Creates a process from a generator function just like `go`, except this one also accepts an exception handling
// function. This function is called any time an error is caught within the process itself. It receives the error object
// as an argument. The process is then considered finished, and the value placed into its return channel is the value
// returned from the exception handler.
function goSafe(fn, exh, ...args) {
  return spawn(fn(...args), exh);
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
