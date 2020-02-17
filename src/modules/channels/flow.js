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
 * A set of channel utilities for routing channels to other channels in
 * different ways.
 *
 * **In every one of these functions** the source channel will not be available
 * to be taken from, as all of the source channels will have their values taken
 * by the processes within these functions. The lone exception is `tap`, where
 * the regular function of the source channel will be restored if all taps are
 * removed. Even so, while at least one tap is in place, the source channel
 * cannot be taken from.
 *
 * @module cispy/utils/flow
 * @private
 */

import { chan, CLOSED } from "modules/channel";
import { select } from "modules/channels";

const protocols = {
  taps: Symbol("multitap/taps"),
};

function isNumber(x) {
  return Object.prototype.toString.call(x) === "[object Number]" && isFinite(x);
}

/**
 * **Pipes the values from one channel onto another channel.**
 *
 * This ties two channels together so that puts on the source channel can be
 * taken off the destination channel. This does not duplicate values in any way
 * - if another process takes a value off the source channel, it will never
 *   appear on the destination channel. In most cases you will not want to take
 *   values off a channel once it's piped to another channel, since it's
 *   difficult to know which values will go to which channel.
 *
 * Closing either channel will break the connection between the two. If the
 * source channel is closed, the destination channel will by default also be
 * closed. However, passing `true` as the third parameter will cause the
 * destination channel to remain open even when the source channel is closed
 * (the connection is still broken however).
 *
 * Because of the ability to leave the destination channel open, a possible use
 * case for this function is to wrap the destination channel(s) of one of the
 * other flow control functions below to have a channel that survives the source
 * channel closing. The rest of those functions (aside from the special-case
 * `{@link module:cispy/util~CispyUtils.tap|tap}`) automatically close their
 * destination channels when the source channels close.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { pipe } = utils;
 *
 * const input = chan();
 * const output = pipe(input, chan());
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 *   input.close();
 * });
 *
 * go(async () => {
 *   console.log(await output.take());      // -> 1
 *   console.log(await output.take());      // -> 2
 *   console.log(output.closed);            // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/channel~Channel} src The source channel.
 * @param {module:cispy/channel~Channel} dest The destination channel.
 * @param {boolean} [keepOpen=false] A flag to indicate that the destination
 *     channel should be kept open after the source channel closes. By default
 *     the destination channel will close when the source channel closes.
 * @return {module:cispy/channel~Channel} The destination channel.
 */
export function pipe(src, dest, keepOpen) {
  async function loop() {
    for (;;) {
      const value = await src.take();
      if (value === CLOSED) {
        if (!keepOpen) {
          dest.close();
        }
        break;
      }
      if (!(await dest.put(value))) {
        break;
      }
    }
  }

  loop();
  return dest;
}

/**
 * **Creates two new channels and routes values from a source channel to them
 * according to a predicate function.**
 *
 * The supplied function is invoked with every value that is put onto the source
 * channel. Those that return `true` are routed to the first destination
 * channel; those that return `false` are routed to the second.
 *
 * The new channels are created by the function based on the buffer values
 * passed as the third and fourth parameters. If one or both of these are
 * missing, `null`, or `0`, the corresponding destination channel is unbuffered.
 * If one is a positive integer, the corresponding channel is buffered by a
 * fixed buffer of that size. If the parameter for a channel is a buffer, then
 * that buffer is used to buffer the new channel.
 *
 * Both new channels are closed when the source channel is closed.
 *
 *
 * ```
 * const { go, utils } = cispy;
 * const { partition } = utils;
 *
 * const input = chan();
 * const [even, odd] = partition(x => x % 2 === 0, input);
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 *   await input.put(3);
 *   await input.put(4);
 * });
 *
 * go(async () => {
 *   console.log(await even.take());     // -> 2
 *   console.log(await even.take());     // -> 4
 * });
 *
 * go(async () => {
 *   console.log(await odd.take());      // -> 1
 *   console.log(await odd.take());      // -> 3
 * });
 * ```
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/utils~predicate} fn A predicate function used to test
 * each value on the input channel.
 * @param {module:cispy/channel~Channel} src The source channel.
 * @param {(number|module:cispy/buffers~Buffer)} [tBuffer=0] A buffer used to
 *     create the destination channel which receives all values that passed the
 *     predicate. If this is a number, a
 *     {@link module:cispy/buffers~FixedBuffer} of that size will be used. If
 *     this is `0` or not present, the channel will be unbuffered.
 * @param {(number|module:cispy/buffers~Buffer)} [fBuffer=0] A buffer used to
 *     create the destination channel which receives all values that did not
 *     pass the predicate. If this is a number, a
 *     {@link module:cispy/buffers~FixedBuffer} of that size will be used. If
 *     this is `0` or not present, the channel will be unbuffered.
 * @return {module:cispy/core~Channel[]} An array of two channels. The first is
 *     the destination channel with all of the values that passed the predicate,
 *     the second is the destination channel with all of the values that did not
 *     pass the predicate.
 */
export function partition(fn, src, tBuffer = 0, fBuffer = 0) {
  const tDest = chan(tBuffer);
  const fDest = chan(fBuffer);

  async function loop() {
    for (;;) {
      const value = await src.take();
      if (value === CLOSED) {
        tDest.close();
        fDest.close();
        break;
      }
      await (fn(value) ? tDest : fDest).put(value);
    }
  }

  loop();
  return [tDest, fDest];
}

/**
 * **Merges one or more channels into a single destination channel.**
 *
 * Values are given to the destination channel as they are sent to the source
 * channels. If `merge` is called when there are already values on multiple
 * source channels, the order that they're put onto the destination channel is
 * random.
 *
 * The destination channel is created by the function based on the buffer value
 * passed as the second parameter. If this is missing, `null`, or `0`, the
 * destination channel will be unbuffered. If it's a positive integer, the
 * destination channel is buffered by a fixed buffer of that size. If the
 * parameter is a buffer, then that buffer is used to buffer the destination
 * channel.
 *
 * As each source channel closes, it is removed from the merge, leaving the
 * channels that are still open to continue merging. When *all* of the source
 * channels close, then the destination channel is closed.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { merge } = utils;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = merge([input1, input2, input3]);
 *
 * go(async () => {
 *   // Because we're sending to all three channels in the same
 *   // process, we know the order in which the values will be
 *   // sent to the output channel; in general, we won't know this
 *   await input1.put(1);
 *   await input2.put(2);
 *   await input3.put(3);
 * });
 *
 * go(async () => {
 *   console.log(await output.take());      // -> 1
 *   console.log(await output.take());      // -> 2
 *   console.log(await output.take());      // -> 3
 * });
 * ```
 *
 * @memberOf module:cispy/utils~CispyPUtils
 * @param {module:cispy/channel~Channel[]} srcs An array of source channels.
 * @param {(number|module:cispy/buffers~Buffer)} [buffer=0] A buffer used to
 *     create the destination channel. If this is a number, a
 *     {@link module:cispy/buffers~FixedBuffer} of that size will be used. If
 *     this is `0` or not present, the channel will be unbuffered.
 * @return {module:cispy/channel~Channel} The destination channel, which will
 *     receive all values put onto every source channel.
 */
export function merge(srcs, buffer = 0) {
  const dest = chan(buffer);
  const inputs = srcs.slice();

  async function loop() {
    for (;;) {
      if (inputs.length === 0) {
        break;
      }
      const { value, channel } = await select(inputs);
      if (value === CLOSED) {
        const index = inputs.indexOf(channel);
        inputs.splice(index, 1);
        continue;
      }
      await dest.put(value);
    }
    dest.close();
  }

  loop();
  return dest;
}

/**
 * **Splits a single channel into multiple destination channels, with each
 * destination channel receiving every value sent to the source channel.**
 *
 * Every parameter after the first represents the buffer from a single
 * destination channel. Each `0` or `null` will produce an unbuffered channel,
 * while each positive integer will produce a channel buffered by a fixed buffer
 * of that size. Each buffer will produce a buffered channel backed by that
 * buffer. If there are no parameters after the first, then two unbuffered
 * channels will be produced as a default.
 *
 * When the source channel is closed, all destination channels will also be
 * closed. However, if destination channels are closed, they do nothing to the
 * source channel.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { split } = util;
 *
 * const input = chan();
 * const outputs = split(input, 3);
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 *   await input.put(3);
 * });
 *
 * go(async () => {
 *   for (const output of outputs) {        // Each will happen 3 times
 *     console.log(await output.take());    // -> 1
 *     console.log(await output.take());    // -> 2
 *     console.log(await output.take());    // -> 3
 *   }
 * });
 * ```
 *
 * This function moves its values to the output channels asynchronously. This
 * means that even when using unbuffered channels, it is not necessary for all
 * output channels to be received from before the next send to the input channel
 * can complete.
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param  {module:cispy/channel~Channel} src The source channel.
 * @param  {...(number|module:cispy/buffers~Buffer)} [buffers=2] The buffers
 *     used to create the destination channels. Each entry is treated
 *     separately. If one is a number, then a
 *     {@link module:cispy/buffers~FixedBuffer|FixedBuffer} of that size will be
 *     used. If one is a `0`, then the corresponding channel will be unbuffered.
 *     **Exception:** if a single number is passed, then that number of
 *     unbuferred channels will be created. This means that the default is to
 *     create two unbuffered channels. To create a single channel with a fixed
 *     buffer, use `{@link cispy~Cispy.fixedBuffer|fixedBuffer}` explicitly.
 * @return {module:cispy/channel~Channel[]} An array of destination channels.
 */
export function split(src, ...buffers) {
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
      done.putAsync();
    }
  }

  async function loop() {
    for (;;) {
      const value = await src.take();
      if (value === CLOSED) {
        for (const dest of dests) {
          dest.close();
        }
        break;
      }

      count = dests.length;
      for (const dest of dests) {
        dest.putAsync(value, cb);
      }
      await done.take();
    }
  }

  loop();
  return dests;
}

/**
 * Utility function to add the ability to be tapped to a channel that is being
 * tapped. This will add a single property to that channel only (named
 * '@@multitap/taps' so as to decrease the chance of collision), but the tapping
 * functionality itself is provided outside the channel object. This new
 * property is an array of the channels tapping this channel, and it will be
 * removed if all taps are removed.
 *
 * @param {module:cispy/channel~Channel} src The source channel to be tapped.
 * @private
 */
function tapped(src) {
  // Make the new property non-enumerable
  Object.defineProperty(src, protocols.taps, {
    configurable: true,
    writable: true,
    value: [],
  });

  const done = chan();
  let count = 0;

  function cb() {
    if (--count === 0) {
      done.putAsync();
    }
  }

  async function loop() {
    for (;;) {
      const value = await src.take();
      if (value === CLOSED || src[protocols.taps].length === 0) {
        delete src[protocols.taps];
        break;
      }

      count = src[protocols.taps].length;
      for (const tap of src[protocols.taps]) {
        tap.putAsync(value, cb);
      }
      await done.take();
    }
  }

  loop();
}

/**
 * **Taps a channel, sending all of the values sent to it to the destination
 * channel.**
 *
 * A source channel can be tapped multiple times, and all of the tapping
 * (destination) channels receive each value sent to the tapped (source)
 * channel.
 *
 * This is different from `{@link module:cispy/utils~CispyUtils.split|split}` in
 * that it's temporary. Channels can tap a channel and then untap it, multiple
 * times, as needed. If a source channel has all of its taps removed, then it
 * reverts to a normal channel, just as it was before it was tapped.
 *
 * Also unlike `{@link module:cispy/utils~CispyUtils.split|split}`, each call
 * can only tap once. For multiple channels to tap a source channel, `tap` has
 * to be called multiple times.
 *
 * Closing either the source or any of the destination channels has no effect on
 * any of the other channels.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { tap } = utils;
 *
 * const input = chan();
 * const tapper = chan();
 * tap(input, tapper);
 *
 * go(async () => {
 *   await input.put(1);
 *   await input.put(2);
 * });
 *
 * go(async () => {
 *   console.log(await tapper.take());   // -> 1
 *   console.log(await tapper.take());   // -> 2
 * });
 *
 * ```
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/channel~Channel} src The channel to be tapped.
 * @param {module:cispy/channel~Channel} [dest] The channel tapping the source
 *     channel. If this is not present, a new unbuffered channel will be
 *     created.
 * @return {module:cispy/channel~Channel} The destination channel. This is the
 *     same as the second argument, if present; otherwise it is the
 *     newly-created channel tapping the source channel.
 */
export function tap(src, dest = chan()) {
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
 * This removes a previously created tap. The destination (tapping) channel will
 * stop receiving the values sent to the source channel.
 *
 * If the destination channel was not, in fact, tapping the source channel, this
 * function will do nothing. If all taps are removed, the source channel reverts
 * to normal (i.e., it no longer has the tapping code applied to it and can be
 * taken from as normal).
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/channel~Channel} src The tapped channel.
 * @param {module:cispy/channel~Channel} dest The channel that is tapping the
 *     source channel that should no longer be tapping the source channel.
 */
export function untap(src, dest) {
  const taps = src[protocols.taps];
  if (taps) {
    const index = taps.indexOf(dest);
    if (index !== -1) {
      taps.splice(index, 1);
      if (taps.length === 0) {
        src.putAsync();
      }
    }
  }
}

/**
 * **Removes all taps from a source channel.**
 *
 * The previously-tapped channel reverts to a normal channel, while any channels
 * that might have been tapping it no longer receive values from the source
 * channel. If the source channel had no taps, this function does nothing.
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/channel~Channel} src The tapped channel. All taps will
 * be removed from this channel.
 */
export function untapAll(src) {
  if (src[protocols.taps]) {
    src[protocols.taps] = [];
    src.putAsync();
  }
}

/**
 * **Maps the values from one or more source channels through a function,
 * sending the results to a new channel.**
 *
 * The mapping function is given one value from each source channel, after at
 * least one value becomes available on every source channel. The output value
 * from the function is then sent to the destination channel.
 *
 * The destination channel is created by the function based on the buffer value
 * passed as the third parameter. If this is missing, `null`, or `0`, the
 * destination channel will be unbuffered. If it's a positive integer, the
 * destination channel is buffered by a fixed buffer of that size. If the
 * parameter is a buffer, then that buffer is used to buffer the destination
 * channel.
 *
 * Once *any* source channel is closed, the mapping ceases and the destination
 * channel is also closed.
 *
 * This is obviously similar to a map transducer, but unlike a transducer, this
 * function works with multiple input channels. This is something that a
 * transducer on a single channel is unable to do.
 *
 * ```
 * const { go, chan, utils } = cispy;
 * const { map } = utils;
 *
 * const input1 = chan();
 * const input2 = chan();
 * const input3 = chan();
 * const output = map((x, y, z) => x + y + z, [input1, input2, input3]);
 *
 * go(async () => {
 *   await input1.put(1);
 *   await input1.put(2);
 *   await input1.put(3);
 * });
 *
 * go(async () => {
 *   await input2.put(10);
 *   await input2.put(20);
 *   input2.close();
 * });
 *
 * go(async () => {
 *   await input3.put(100);
 *   await input3.put(200);
 *   await input3.put(300);
 * });
 *
 * go(async () => {
 *   console.log(await output.take());     // -> 111
 *   console.log(await output.take());     // -> 222
 *   // Output closes now because input2 closes after 2 values
 *   console.log(output.closed);           // -> true
 * });
 * ```
 *
 * @memberOf module:cispy/utils~CispyUtils
 * @param {module:cispy/utils~mapper} fn The mapping function. This should have
 *     one parameter for each source channel and return a single value.
 * @param {module:cispy/channel~Channel[]} srcs The source channels.
 * @param {(number|module:cispy/buffers~Buffer)} [buffer=0] A buffer used to
 *     create the destination channel. If this is a number, a
 *     {@link module:cispy/buffers~FixedBuffer} of that size will be used. If
 *     this is `0` or not present, the channel will be unbuffered.
 * @return {module:cispy/channel~Channel} The destination channel.
 */
export function map(fn, srcs, buffer = 0) {
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
          temp.putAsync(values.slice());
        }
      };
    })(i);
  }

  async function loop() {
    for (;;) {
      count = srcLen;
      for (let i = 0; i < srcLen; ++i) {
        srcs[i].takeAsync(callbacks[i]);
      }
      const values = await temp.take();
      for (const value of values) {
        if (value === CLOSED) {
          dest.close();
          return;
        }
      }
      await dest.put(fn(...values));
    }
  }

  loop();
  return dest;
}
