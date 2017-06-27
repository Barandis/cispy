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
// options.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Tracks and allows the setting of a few runtime-configurable options.

const options = {
  // The maximum number of operations (puts or takes) that can be queued in a channel buffer before running a cleanup
  // operation to make sure no inactive operations are in the queue.
  maxDirtyOps:    64,
  // The maximum number of puts or takes that can be queued on a channel at the same time.
  maxQueuedOps:   1024,
  // The maximum number of tasks that the dispatcher will run in a single batch. If the number of pending tasks exceeds
  // this, the remaining are not discarded. They're simply run as part of another batch after the current batch
  // completes. Setting this to a reasonable number makes sure that control can pass back to the event loop every now
  // and then, even if there are thousands of tasks in the queue.
  taskBatchSize:  1024,
  // The default process error handler. If this is set and an uncaught `yield raise` happens in the process, this error
  // handler is used to manage the error. It's a function that takes one parameter, which is an object containing an
  // `error` property which is the actual error. (This is to allow future expansion of the library's error-handling
  // capabilities.)
  dispatchMethod: 'setImmediate'
};

// Sets the values of one or more configurable options. This function takes an object for a parameter, and if any of
// that object's property's names match one of those of the options object, its value becomes the new value of that
// option. Properties that don't exist as options are ignored, and options that are not present in the parameter are
// left unchanged.
function config(opts) {
  const { setDispatcher } = require('./dispatcher');
  for (const key in options) {
    if (opts.hasOwnProperty(key)) {
      options[key] = opts[key];

      if (key === 'dispatchMethod') {
        setDispatcher();
      }
    }
  }
}

module.exports = {
  options,
  config
};
