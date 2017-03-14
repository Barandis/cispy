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

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// core.js
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All of the CSP functions are pulled together into this file and exported. The process-related functions (put, take, 
// alts, putAsync, takeAsync, raise, sleep) and some others are just passed along, but a number of other functions are 
// defined here (go, spawn, chan). All three types of buffers are also supplied, along with the special values CLOSED. 
// EMPTY, and DEFAULT.

import * as buffers from './modules/buffers';
import * as channel from './modules/channel';
import * as process from './modules/process';

// Creates a process from a generator (not a generator function) and runs it. The process is then left to its own 
// devices until it returns. This function creates and returns a channel, though that channel can only ever have one
// value: the return value of the generator (the channel closes after this value is taken).
//
// Since this requires a generator and not a generator function, it isn't used nearly as much as `go`.
export function spawn(gen) {
  const ch = channel.chan(buffers.fixed(1));
  process.process(gen, (value) => {
    if (value === channel.CLOSED) {
      ch.close();
    }
    else {
      process.putAsync(ch, value, () => ch.close());
    }
  }).run();
  return ch;
}

// Creates a process from a generator function (not a generator) and runs it. What this really does is create a 
// generator from the generator function and its optional arguments, and then pass that off to `spawn`. But since
// generator functions have a literal form (function*()) while generators themselves do not, this is going to be the 
// much more commonly used function of the two.
export function go(fn, ...args) {
  return spawn(fn(...args));
}

// Creates a new channel. By default (all parameters are optional), this is an unbuffered channel without any 
// transformation functions. By supplying different values to the parameters, we can create buffered channels that 
// might transform the values put onto them before allowing them to be taken.
export function chan(buffer, xform, handler) {
  const buf = buffer === 0 ? null : buffer;
  const b = typeof buf === 'number' ? buffers.fixed(buf) : buf;
  return channel.chan(b, xform, handler);
}

// Creates an unbuffered channel that closes after a certain delay (in milliseconds). This isn't terribly different
// from the channel created in the `yield sleep` instruction, except that this one is available to be used while it's
// delaying. A good use case for this is in preventing an `alts` call from waiting too long, as if one of these
// channels is in its operations list, it will trigger the `alts` after the delay time if no other channel does first.
export function timeout(delay) {
  const ch = channel.chan(null, null, null, true);
  setTimeout((() => ch.close()), delay);
  return ch;
}

const b = {
  fixed: buffers.fixed,
  dropping: buffers.dropping,
  sliding: buffers.sliding
};
export { b as buffers };

export { put, take, alts, sleep, raise, putAsync, takeAsync, DEFAULT } from './modules/process';
export { CLOSED } from './modules/channel';
export { EMPTY } from './modules/buffers';
export { config } from './modules/options';
