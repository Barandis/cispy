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

/* global MessageChannel */

/**
 * This is the place where the new JS tasks are actually created. A queue is maintained for them, and as each batch of
 * processes are completed, the next ones run. As each CSP process runs, it adds tasks to be run to the queue, which
 * are each run in their own JS task.
 *
 * The function that spawns the new JS task depends on environment. The `setImmediate` function is preferred as it's the
 * fastest, not waiting for event queues to empty before spawning the new process. However, it is not JS standard and
 * currently only works in IE and node.js. If `setImmediate` isn't available, an attempt is made to use
 * `MessageChannel`'s `onMessage` is tried next. If that is also not available, then `setTimeout` with `0` delay is
 * used, which is available everywhere but which is the least performant of all of the solutions.
 *
 * There are other possibilities for creating processes, but they were rejected as obsolete (`process.nextTick` and
 * `onreadystatechange`) or unnecessary (`window.postMessage`, which works like `MessageChannel` but doesn't work in Web
 * Workers).
 *
 * It is notable and important that we act as good citizens here. This dispatcher is capable of taking control of the
 * JavaScript engine until thousands, millions, or more tasks are handled. But that could cause the system event loop
 * to have to wait an unacceptable amount of time. So we limit ourselves to a batch of tasks at a time, and if there
 * are still more to be run, we let the event loop run before that next batch is processed.
 *
 * The dispatcher is **global**. There is a single instance that runs for all channels and processes. This is the only
 * element of the system that works like this.
 *
 * @module cispy/core/dispatcher
 * @private
 */

const buffers = require('./buffers');

const queue = buffers.queue();
const EMPTY = buffers.EMPTY;

/**
 * Indicates that `setImmediate` should be used to dispatch tasks, if available. If it's not available, then
 * `MessageChannel` will be tried, and if that's not available then `setTimeout` will be used.
 * @type {number}
 * @private
 */
const SET_IMMEDIATE = 0;

/**
 * Indicates that `MessageChannel` should be used to dispatch tasks, if available. If it's not available, then
 * `setTimeout` will be used.
 * @type {number}
 * @private
 */
const MESSAGE_CHANNEL = 1;

/**
 * Indicates that `setTimeout` should be used to dispatch tasks.
 * @type {number}
 * @private
 */
const SET_TIMEOUT = 2;

const options = {
  batchSize: 1024,
  dispatchMethod: SET_IMMEDIATE
};

let dispatcher = createDispatcher();

/**
 * Sets the values of one or more configurable options. This function takes an object for a parameter, and if any of
 * that object's property's names match one of those of the options object, its value becomes the new value of that
 * option. Properties that don't exist as options are ignored, and options that are not present in the parameter are
 * left unchanged.
 *
 * @param {number} opts.batchSize The number of dispatched tasks that are run in a single batch before giving up the
 *     process queue to other processes.
 * @param {number} opts.dispatchMethod One of {@link SET_IMMEDIATE}, {@link MESSAGE_CHANNEL}, or {@link SET_TIMEOUT},
 *     used to indicate how tasks should be dispatched.
 * @private
 */
function config(opts) {
  for (const key in options) {
    if (opts.hasOwnProperty(key)) {
      options[key] = opts[key];

      if (key === 'dispatchMethod') {
        setDispatcher();
      }
    }
  }
}

let running = false;
let queued = false;

/**
 * Uses a combination of available methods and the dispatchMethod option to determine which of hte three dispatch
 * methods should be used. This is what provides fallback; e.g., {@link SET_IMMEDIATE} being specified but `setTimeout`
 * being used if `setImmediate` isn't available in the environment.
 *
 * @return {number} One of {@link SET_IMMEDIATE}, {@link MESSAGE_CHANNEL}, or {@link SET_TIMEOUT}, which should be used
 *     as the ultimate dispatch method based on environment.
 * @private
 */
function getDispatchMethod() {
  switch (options.dispatchMethod) {
    case MESSAGE_CHANNEL:
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;

    case SET_TIMEOUT:
      return SET_TIMEOUT;

    default:
      if (typeof setImmediate !== 'undefined') {
        return SET_IMMEDIATE;
      }
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;
  }
}

/**
 * Creates a dispatcher function based on the currently selected dispatch method.
 *
 * @return {function} The function run to dispatch a set of queued tasks.
 * @private
 */
function createDispatcher() {
  switch (getDispatchMethod()) {
    // We prefer setImmediate if it's available.
    case SET_IMMEDIATE:
      return () => {
        if (!(queued && running)) {
          queued = true;
          setImmediate(processTasks);
        }
      };

    // Most modern browsers implement MessageChannel. This is basically a last-ditch effort to avoid using setTimeout,
    // since that's always the slowest way to do it. This was chosen over postMessage because postMessage doesn't work
    // in Web workers, where MessageChannel does.
    case MESSAGE_CHANNEL: {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => processTasks();
      return () => {
        if (!(queued && running)) {
          queued = true;
          channel.port2.postMessage(0);
        }
      };
    }

    // If all else fails, just use setTimeout. It may be a few milliseconds slower than the others over the long haul,
    // but it works everywhere.
    case SET_TIMEOUT:
      return () => {
        if (!(queued && running)) {
          queued = true;
          setTimeout(processTasks, 0);
        }
      };
  }
}

/**
 * Creates and integrates a new dispatcher function based on the current dispatch method settings. Nothing is returned;
 * the global dispatch function just becomes the newly created dispatch function.
 *
 * This is called external to this module when a new dispatch method is configured.
 *
 * @private
 */
function setDispatcher() {
  dispatcher = createDispatcher();
}

// Processes a batch of tasks one at a time. The reason for limiting this function to a batch size is because we need
// to give up control to the system's process queue occasionally, or else the system event loop would never run. We
// limit ourselves to running a batch at a time, and if there are still more tasks remaining, we put another call onto
// the system process queue to be run after the event loop cycles once more.
/**
 * Processes a batch of tasks one at a time. The reason for limiting this function to a batch size is because we need
 * to give up control to the system's process queue occasionally, or else the system event loop would never run. We
 * limit ourselves to running a batch at a time, and if there are still more tasks remaining, we put another call onto
 * the system process queue to be run after the event loop cycles once more.
 *
 * @private
 */
function processTasks() {
  running = true;
  queued = false;
  let count = 0;

  for (;;) {
    const task = queue.dequeue();
    if (task === EMPTY) {
      break;
    }

    task();

    if (count >= options.taskBatchSize) {
      break;
    }
    count++;
  }

  running = false;
  if (queue.length) {
    dispatcher();
  }
}

/**
 * Adds a task to the queue and dispatches it.
 *
 * @param {function} task The new function to be queued into the dispatcher.
 * @private
 */
function dispatch(task) {
  queue.enqueue(task);
  dispatcher();
}

module.exports = {
  config,
  dispatch,
  SET_IMMEDIATE,
  MESSAGE_CHANNEL,
  SET_TIMEOUT
};
