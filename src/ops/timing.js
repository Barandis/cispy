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
// timing.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions change the timing of inputs being put onto the input channel.

import {
  chan,
  go,
  put,
  alts,
  timeout,
  CLOSED
} from '../core';

function isNumber(x) {
  return x::toString() === '[object Number]' && isFinite(x);
}

// Ensures that only one value is put onto the input channel in a given delay interval.
//
// By default, the value will not appear on the output channel until the delay expires. If a new value is put onto the
// input channel before that delay expires, the delay timer will restart, and that new value will be put onto the output
// channel after the delay timer expires. There will be no output until no input has happened in
// the delay time.
//
// By passing { immediate: true } as options, the behavior changes. Then the first input is passed to the output
// immediately, but no other output will happen until the delay timer passes without any new input.
//
// Another option, { maxDelay: <number> }, limits how long a debounce operation can last. Regularly, it can go on
// indefinitely as long as input regularly comes before the delay expires. Setting a maxDelay will cause the delay to
// forcefully end after there has been no output in that number of milliseconds.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the debouncing to immediately cease, the output channel to be closed, and any remaining values that had been waiting
// to be output after the debounce timer to instead be discarded.
export function debounce(src, buffer, delay, options) {
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign({leading: false, trailing: true, maxDelay: 0, cancel: chan()},
                             (isNumber(delay) ? options : delay) || {});

  const dest = chan(buf);
  const {leading, trailing, maxDelay, cancel} = opts;

  go(function* () {
    let timer = chan();
    let max = chan();
    let current = CLOSED;

    for (;;) {
      const {value, channel} = yield alts([src, timer, max, cancel]);

      if (channel === cancel) {
        dest.close();
        break;
      }
      if (channel === src) {
        if (value === CLOSED) {
          dest.close();
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

// Ensures that a value cannot be taken off the output channel more often than a certain interval.
//
// If a number of values are put onto the input channel during the delay, then only the last one will appear after the
// delay has elapsed. The rest will be discarded. In this way, a value appears on the output channel only as often as
// specified by the delay.
//
// By default, the first value (the one that triggers the throttle timer) will appear on the output channel immediately.
// The last value put onto the input channel is then put onto the output channel when the timer elapses, and the delay
// is then restarted. Any values that appear during that subsequent delay will also cause the last value to appear on
// the output channel when the next delay elapses, restarting the delay again, and so on.
//
// By setting the `leading` option to `false`, that initial value will not immediately appear on the output channel.
// Instead, it will appear after the delay elapses, unless another value being put onto the input channel in the
// meantime overwrites it.
//
// By setting the `trailing` option to `false`, no value will be put onto the output channel when the timer elapses.
// Any value that had been put onto the input channel during that delay will be silently dropped. After the delay
// elapses, the next input value will appear on the output channel, and so on.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the throttling to immediately cease, the output channel to be closed, and all remaining throttled values that had
// not yet been put onto the channel to be discarded.
export function throttle(src, buffer, delay, options) {
  const buf = isNumber(delay) ? buffer : 0;
  const del = isNumber(delay) ? delay : buffer;
  const opts = Object.assign({leading: true, trailing: true, cancel: chan()},
                             (isNumber(delay) ? options : delay) || {});

  const dest = chan(buf);
  const {leading, trailing, cancel} = opts;

  go(function* () {
    let timer = chan();
    let current = CLOSED;

    for (;;) {
      const {value, channel} = yield alts([src, timer, cancel]);

      if (channel === cancel) {
        dest.close();
        break;
      } else if (channel === src) {
        if (value === CLOSED) {
          dest.close();
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
