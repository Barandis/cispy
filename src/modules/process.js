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
 * Provides basic channel operations for puts, takes, and alts. These operations
 * are not dependent upon the way channels are accessed; i.e., they are
 * independent of processes, generators, and promises. They require the use of
 * only the channel itself.
 *
 * @module cispy/ops
 * @private
 */

import { chan } from "modules/channel";

/**
 * **Blocks the process for the specified time (in milliseconds) and then
 * unblocks it.**
 *
 * This implements a delay, but one that's superior to other kinds of delays
 * (`setTimeout`, etc.) because it blocks the process and allows the dispatcher
 * to allow other processes to run while this one waits. The default delay is 0,
 * which will release the process to allow others to run and then immediately
 * re-queue it.
 *
 * This function *must* be called from within an `async` function and as part of
 * an `await` expression.
 *
 * When this function completes and its process unblocks, the `await` expression
 * doesn't take on any meaningful value. The purpose of this function is simply
 * to delay, not to communicate any data.
 *
 * @memberOf module:cispy~Cispy
 * @param {number} [delay=0] the number of milliseconds that the process will
 *     block for. At the end of that time, the process is again eligible to be
 *     run by the dispatcher again. If this is missing or set to `0`, the
 *     process will cede execution to the next one but immediately requeue
 *     itself to be run again.
 * @return {Promise} A promise that resolves with no meaningful result when the
 * time has elapsed.
 */
export function sleep(delay = 0) {
  return new Promise(resolve => {
    const ch = chan();
    setTimeout(() => ch.close(), delay);
    ch.takeAsync(resolve);
  });
}

/**
 * **Invokes an async function acting as a process.**
 *
 * This is purely a convenience function, driven by the fact that it's necessary
 * to use an IIFE to invoke an inline async function, and that's not very
 * aesthetically pleasing. It does no more than invoke the passed function, but
 * that at least releases us from the need to put the empty parentheses after
 * the function definition.
 *
 * @memberOf module:cispy~Cispy
 * @param {function} fn The async function being used as a process.
 * @param {...*} args Arguments that are sent to the async function when it's
 * invoked.
 * @return {Promise} The promise returned by the async function.
 */
export function go(fn, ...args) {
  return fn(...args);
}
