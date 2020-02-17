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
 * A set of channel utilities for converting channels into other kinds of data,
 * and vice versa.
 *
 * @module cispy/utils/conversion
 * @private
 */

import { chan, CLOSED } from "modules/channel";

/**
 * **Creates a single value from a channel by running its values through a
 * reducing function.**
 *
 * For every value put onto the input channel, the reducing function is called
 * with two parameters: the accumulator that holds the result of the reduction
 * so far, and the new input value. The initial value of the accumulator is the
 * third parameter to `reduce`. The reduction is not complete until the input
 * channel closes.
 *
 * This function returns a channel. When the final reduced value is produced, it
 * is put onto this channel, and when that value is taken from it, the channel
 * is closed.
 *
 * ```
 * const { go, chan, close, utils } = cispy;
 * const { reduce } = utils;
 *
 * const input = chan();
 * const output = reduce((acc, value) => acc + value, input, 0);
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 *   await input.put(3);
 *   input.close();
 * });
 *
 * go(async () => {
 *   const result = await output.take();
 *   console.log(output);                  // -> 6
 * });
 *
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will
 * ever appear on the output channel. The closing of the channel is what
 * signifies that the reduction should be completed.
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/utils~reducer} fn The reducer function responsible for
 *     turning the series of channel values into a single output value.
 * @param {module:cispy/channel~Channel} ch The channel whose values are being
 * reduced into a single output value.
 * @param {*} init The initial value to feed into the reducer function for the
 * first reduction step.
 * @return {module:cispy/channel~Channel} A channel that will, when the input
 *     channel closes, have the reduced value put into it. When this value is
 *     taken, the channel will automatically close.
 */
export function reduce(fn, ch, init) {
  const output = chan();

  async function loop() {
    let acc = init;
    for (;;) {
      const value = await ch.take();
      if (value === CLOSED) {
        output.putAsync(acc, () => output.close());
        return;
      }
      acc = fn(acc, value);
    }
  }

  loop();
  return output;
}

/**
 * **Sends all values from an array onto the supplied channel.**
 *
 * If no channel is passed to this function, a new channel is created. In
 * effect, this directly converts an array into a channel with the same values
 * on it.
 *
 * The channel is closed after the final array value is sent to it.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { onto } = utils;
 *
 * const input = [1, 2, 3];
 * const output = onto(input);
 *
 * go(async () => {
 *   console.log(await output.take());     // -> 1
 *   console.log(await output.take());     // -> 2
 *   console.log(await output.take());     // -> 3
 *   console.log(output.closed);           // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/util~CispyUtils
 * @param {module:cispy/channel~Channel} [ch] The channel onto which to put all
 *     of the array elements. If this is not present, a new channel will be
 *     created.
 * @param {Array} array The array of values to be put onto the channel.
 * @return {module:cispy/channel~Channel} the channel onto which the array
 *     elements are put. This is the same as the input channel, but if no input
 *     channel is specified, this will be a new channel. It will close when the
 *     final value is taken from it.
 */
export function onto(ch, array) {
  const [chnl, arr] = Array.isArray(ch) ? [chan(ch.length), ch] : [ch, array];

  async function loop() {
    for (const item of arr) {
      await chnl.put(item);
    }
    chnl.close();
  }

  loop();
  return chnl;
}

/**
 * **Receives all of the values from a channel and pushes them into an array.**
 *
 * If no array is passed to this function, a new (empty) one is created. In
 * effect, this directly converts a channel into an array with the same values.
 * Either way, this operation cannot complete until the input channel is closed.
 *
 * This function returns a channel. When the final array is produced, it is sent
 * to this channel, and when that value is received from it, the channel is
 * closed.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { into } = utils;
 *
 * const input = chan();
 * const output = into(input);
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 *   await input.put(3);
 *   input.close();
 * });
 *
 * go(async () => {
 *   const result = await output.take();
 *   console.log(result);                     // -> [1, 2, 3]
 * });
 * ```
 *
 * Note that the input channel *must* be closed at some point, or no value will
 * ever appear on the output channel. The closing of the channel is what
 * signifies that all of the values needed to make the array are now available.
 *
 * @memberOf module:cispy/util~CispyUtils
 * @param {Array} [array] The array to put the channel values into. If this is
 *     not present, a new, empty array will be created.
 * @param {module:cispy/channel~Channel} ch The channel from which values are
 * taken to put into the array.
 * @return {module:cispy/channel~Channel} A channel that will, when the input
 *     channel closes, have the array of channel values put onto it. When this
 *     array is taken, the channel will automatically close.
 */
export function into(array, ch) {
  const [arr, chnl] = Array.isArray(array) ? [array, ch] : [[], array];
  const init = arr.slice();

  return reduce(
    (acc, input) => {
      acc.push(input);
      return acc;
    },
    chnl,
    init,
  );
}
