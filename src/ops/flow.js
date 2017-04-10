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
// flow.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// The functions in this file route channels to other channels in different ways.
//
// IN EVERY ONE OF THESE FUNCTIONS the source channel will not be available to be taken from, as all of the source
// channels will have their values taken by the processes within these functions. The lone exception is `tap`, where
// the regular function of the source channel will be restored if all taps are removed. Even so, while at least one tap
// is in place, the source channel cannot be taken from.

import {
  chan,
  go,
  put,
  take,
  alts,
  putAsync,
  takeAsync,
  CLOSED
} from '../core';

const protocols = {
  taps: '@@multitap/taps'
};

const toString = Object.prototype.toString;

function isNumber(x) {
  return x::toString() === '[object Number]' && isFinite(x);
}

// Takes the values off one channel and, in the same order, puts them onto a different channel. Both channels must be
// provided, and the piping continues until the source channel is closed. At that point the destination channel is also
// closed, though by setting keep-open to `true`, the destination channel closing is prevented.
//
// Because of the option to keep the destination channel open after the source channel closes, pipe can be used to
// convert an automatically-closing channel into one that remains open.
export function pipe(src, dest, keepOpen) {
  go(function* () {
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

// Partitions the values from one channel into two new channels. Which channel each value is put onto depends on
// whether it returns `true` or `false` when passed through a supplied predicate function. Both output channels are
// created and returned, and both are closed when the source channel closes.
export function partition(fn, src, tBuffer = 0, fBuffer = 0) {
  const tDest = chan(tBuffer);
  const fDest = chan(fBuffer);

  go(function* () {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED) {
        tDest.close();
        fDest.close();
        break;
      }
      yield put(fn(value) ? tDest : fDest, value);
    }
  });
  return [tDest, fDest];
}

// Merges the values from two or more source channels into a single channel. The ordering of the values on the new
// channel is indeterminate; it cannot be assumed that each source channel will be cycled through in order. As each
// source channel is closed, it stops providing values to be merged; only when all source channels are closed will the
// new channel close.
export function merge(srcs, buffer = 0) {
  const dest = chan(buffer);
  const inputs = srcs.slice();

  go(function* () {
    for (;;) {
      if (inputs.length === 0) {
        break;
      }
      const {value, channel} = yield alts(inputs);
      if (value === CLOSED) {
        const index = inputs.indexOf(channel);
        inputs.splice(index, 1);
        continue;
      }
      yield put(dest, value);
    }
    dest.close();
  });
  return dest;
}

// Splits a channel into an arbitrary number of other channels, all of which will contain whatever values are put on
// the source channel. Essentially this creates some number of copies of the source channel. All of the new channels
// are closed when the source channel is closed.
export function split(src, ...buffers) {
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

  go(function* () {
    for (;;) {
      const value = yield take(src);
      if (value === CLOSED) {
        for (const dest of dests) {
          dest.close();
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

// Utility function to add the ability to be tapped to a channel that is being tapped. This will add a single property
// to that channel only (named '@@multitap/taps' so as to decrease the chance of collision), but the tapping
// functionality itself is provided outside the channel object. This new property is an array of the channels tapping
// this channel, and it will be removed if all taps are removed.
function tapped(src) {
  src[protocols.taps] = [];

  const doneCh = chan();
  let doneCount = 0;
  function done() {
    if (--doneCount === 0) {
      putAsync(doneCh);
    }
  }

  go(function* () {
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

// Taps a source channel with a destination channel to which the source's values will be redirected. Any number of taps
// can be created on a source channel, by calling this function multiple times with the same source and different
// destinations. In that manner this function acts like `split` above in that all of the values put onto the source
// channel will be copied to each tapping channel. There are three major differences from `split` though: the tapping
// channels are -not- closed if the source channel is closed; new destination channels do not have to be created
// (channels that already exist can be passed as destinations); and when all taps are removed, the tapped channel
// reverts to its former behavior (i.e., it becomes a normal channel that can both be put onto and taken from).
//
// In essence, this is intended to be a temporary tap of one already existing channel into another, and when the tap is
// removed, the channels are just as they were before.
export function tap(src, dest = chan()) {
  if (!src[protocols.taps]) {
    tapped(src);
  }
  if (!~src[protocols.taps].indexOf(dest)) {
    src[protocols.taps].push(dest);
  }
  return dest;
}

// Removes the tap from the destination channel into the source channel. If the destination channel wasn't tapping the
// source channel to begin with, then nothing will happen. If this function removes the last tap from a source channel,
// that channel will revert to being a normal untapped channel.
export function untap(src, dest) {
  if (src[protocols.taps]) {
    const index = src[protocols.taps].indexOf(dest);
    if (index !== -1) {
      src[protocols.taps].splice(index, 1);
      if (src[protocols.taps].length === 0) {
        // We have to do this because a tapped channel sits waiting in a while loop for a take to happen, and it wil be
        // waiting when we untap the last channel. Still nervous about it though.
        putAsync(src);
      }
    }
  }
}

// Removes all taps from a source channel. Every tapping channel that's removed and the tapped source channel revert to
// being normal channels.
export function untapAll(src) {
  if (src[protocols.taps]) {
    src[protocols.taps] = [];
    putAsync(src);
  }
}

// Merges the values from two or more source channels together by passing them as parameters to a mapping function,
// whose output fills the new merged channel. This is different from a map transducer in that the transducer can only
// handle one input channel; this can handle an arbitrary number of source channels. (Consequently, it is not
// composable like a map transducer.)
//
// The returned channel will contain values as long as ALL of the source channels provide values. As soon as one source
// channel is closed, the mapping is complete and the returned channel is also closed.
export function map(fn, srcs, buffer = 0) {
  const dest = chan(buffer);
  const srcLen = srcs.length;
  const values = [];
  const callbacks = [];
  const temp = chan();
  let count;

  for (let i = 0; i < srcLen; ++i) {
    callbacks[i] = ((index) => {
      return (value) => {
        values[index] = value;
        if (--count === 0) {
          putAsync(temp, values.slice());
        }
      };
    })(i);
  }

  go(function* () {
    for (;;) {
      count = srcLen;
      for (let i = 0; i < srcLen; ++i) {
        takeAsync(srcs[i], callbacks[i]);
      }
      const values = yield take(temp);
      for (const value of values) {
        if (value === CLOSED) {
          dest.close();
          return;
        }
      }
      yield put(dest, fn(...values));
    }
  });
  return dest;
}
