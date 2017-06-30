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
// conversion.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages. These
// functions specifically use async functions rather than processes.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions convert channels into other kinds of data, or vice versa.

const { chan, close, CLOSED } = require('../../core/channel');
const { putAsync } = require('../../core/operations');
const { put, take } = require('../operations');

// Reduces all of the values in the supplied channel by running them through a reduction function. An initial value for
// the reduction function can also be supplied. A channel is returned; that channel receives exactly one value, which
// is the reduced result, and it closes after that value is taken.
//
// This could be implemented as an async function returning a promise that resolves to the reduced result, but that
// would be different from the semantics of the generator-based function. Also, there is some question as to whether
// it's a good idea for a process to communicate through any other means than via a channel.
//
// This is different from transducer reduction, as transducers always reduce to a collection (or channel). This reduce
// can result in a single scalar value.
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

// Puts all of the values in the input array onto the supplied channel. If no channel is supplied (if only an array is
// passed), then a new buffered channel of the same length of the array is created. Either way, the channel is returned
// and will close when the last array value has been taken.
//
// This is NOT an async function. It returns a channel, and a channel-returning function can immediately return a
// channel even if the channel doesn't have all of the results on it yet. (In fact, unless it's a buffered channel, it
// *cannot* have all values on it until some are taken.)
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

// Moves all of the values on a channel into the supplied array. If no array is supplied (if the only parameter passed
// is a channel), then a new and empty array is created to contain the values. A channel is returned that will have the
// array put onto it when the input channel closes; this output channel closes automatically when the array is taken
// from it.
function into(array, ch) {
  const [arr, chnl] = Array.isArray(array) ? [array, ch] : [[], array];
  const init = arr.slice();

  return reduce((acc, input) => {
    acc.push(input);
    return acc;
  }, chnl, init);
}

module.exports = {
  reduce,
  onto,
  into
};
