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
// channel.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// An implementation of channels, which is one of the two big parts of CSP (the other being processes). These channels
// are essentially queues that hold process instructions waiting for the next available process to process them. They
// can be buffered, which is accomplished using the buffers implemented in buffer.js.
//
// Channels do not interact with JS tasks or the dispatcher in any meaningful way. They're just here to hold tasks
// (represented by handlers from process.js) which may themselves then cause new JS tasks to be created via the
// dispatcher.
//
// Channels may have transducers associated with them. The transducers are expected to follow the same conventions as
// any of the popular transducer libraries. Explicit support is required because channels wouldn't play well with the
// normal way of making an object support transduction, for two different reasons.
//
// * Transducers require the ability to create a new, empty collection of the same type as the input collection. In
//   this case, that would mean creating a new channel, meaning that the output channel (where the transformed values
//   are taken from) would be different than the input channel (where values are put).
// * If we somehow get over that requirement and keep all action on the same channel, we can't take values from the
//   channel, transform them, and put them back. This would potentially change the order of values in the channel since
//   we are dealing with asynchronous processes.
//
// The explicit support means a transformer is directly associated with a channel. When a value is put onto the
// channel, it's first run through the transformer and the transformed value is the one actually put into the channel's
// buffer. This avoids both of the problems noted above.

import { queue, fixed, EMPTY } from './buffers';
import { dispatch } from './dispatcher';
import { protocols as p } from './protocol';
import { options } from './options';

// This is a unique value used to indicate for certain that an object is indeed a box. Since there is no access to this
// object outside of the library, there is no way to emulate a box in a value that might be on a channel.
const BOX = Symbol();

// A symbol returned when a take is attempted in a closed channel. This is the only value that is not legal to be put
// onto a channel.
export const CLOSED = Symbol('CLOSED');

// Determines whether an object is reduced. This is done using the transducer protocol; an object with the protocol-
// specified `reduced` property is assumed to be reduced. If a result of a transformation is reduced, it means that the
// transformation is complete and the channel should be closed.
function isReduced(value) {
  return !!(value && value[p.reduced]);
}

// A wrapper object for a value. This is used almost entirely as a marker interface, though the fact that it becomes a
// parameter that's passed by reference rather than value is also important in a couple places. If a channel operation
// (put or take) returns a Box, it means that an actual value was returned. A non-Box (which always happens to be
// `null`) means that the operation must block.
export function box(value) {
  return {
    value,
    box: BOX
  };
}

// A box used to wrap a value being put onto a channel. This one's used internally only by this file so it isn't
// exported.
function putBox(handler, value) {
  return {
    handler,
    value,
    box: BOX
  };
}

// Determines whether a value is boxed.
export function isBox(value) {
  return value && value.box === BOX;
}

// A channel, used by processes to communicate with one another. This is one of the two core objects of the library,
// along with Process.
//
// For each operation, the channel first tests to see if there's a corresponding operation already queued (i.e., if
// we're doing a put that there's a queued take and vice versa). If there is, that corresponding operation is unblocked
// and both operations complete. If not, the operation is queued to wait for a corresponding operation. The process
// that created the operation then blocks.
//
// The channel can be backed by a buffer, though it is not by default. If a buffer is in place, and that buffer is not
// full, then the process that created an operation that has to be queued is NOT blocked.
//
// This channel object supports transformations, like those supplied by my xduce transducers library. The support must
// be explicitly created because the normal method of making an object support transformations won't work here. This
// method is to create a new object and add the transformed values to it - but for a channel, we need to replace the
// values on the channel with their transformed values, in the same order even in a multi-process environment. Thus
// transformations happen in place.
//
// Transformations are applied before the value is queued, so even if there is a corresponding operation ready to go,
// the transformation still happens. Also, transformations require that the channel be buffered (this buffer is what is
// sent to the transformer's reduction step function); trying to create a channel with a transformer but without a
// buffer will result in an error being thrown.
export function channel(takes, puts, buffer, xform, timeout) {
  return Object.assign({
    takes,
    puts,
    buffer,
    xform,
    dirtyTakes: 0,
    dirtyPuts: 0,
    _closed: false,

    get closed() {
      return this._closed;
    },

    get buffered() {
      return !!buffer;
    },

    get timeout() {
      return !!timeout;
    }
  }, { put: putImpl, take: takeImpl, close: closeImpl });
}

// Puts a value on the channel. The specified handler is used to control whether the put is active and what to do after
// the put completes. A put can become inactive if it was part of an `alts` call and some other operation specified in
// that call has already completed.
//
// This value is given to a take handler immediately if there's one waiting. Otherwise the value and handler are queued
// together to wait for a take.
function putImpl(value, handler) {
  if (value === CLOSED) {
    throw Error('Cannot put CLOSED on a channel');
  }

  if (this.closed) {
    handler.commit();
    return box(false);
  }

  let taker, callback;

  // Push the incoming value through the buffer, even if there's already a taker waiting for the value. This is to make
  // sure that the transducer step function has a chance to act on the value (which could change the value or make it
  // unavailable altogether) before the taker sees it.
  //
  // If this channel is unbuffered this process is skipped (there can't be a transformer on an unbuffered channel
  // anyway). If the buffer is full, the transformation is deferred until later when the buffer is not full.
  if (this.buffer && !this.buffer.full) {
    handler.commit();
    const done = isReduced(this.xform[p.step](this.buffer, value));

    for (;;) {
      if (this.buffer.count === 0) {
        break;
      }
      taker = this.takes.dequeue();
      if (taker === EMPTY) {
        break;
      }
      if (taker.active) {
        callback = taker.commit();
        const val = this.buffer.remove();
        if (callback) {
          dispatch(() => callback(val));
        }
      }
    }

    if (done) {
      this.close();
    }
    return box(true);
  }

  // This next loop happens if the channel is unbuffered and there is at least one pending take. It processes the next
  // pending take immediately. (Buffered channels break out of the loop immediately, because in order for a buffered
  // channel to reach this point, its buffer must have been full. This means there are no pending takes and the first
  // one pulled will be EMPTY.)
  for (;;) {
    taker = this.takes.dequeue();
    if (taker === EMPTY) {
      break;
    }
    if (taker.active) {
      handler.commit();
      callback = taker.commit();
      if (callback) {
        dispatch(() => callback(value));
      }
      return box(true);
    }
  }

  // If there are no pending takes on an unbuffered channel, or on a buffered channel with a full buffer, we queue the
  // put to let it wait for a take to become available. Puts whose handlers have gone inactive (because they were part
  // of an ALTS instruction) are periodically purged.
  if (this.dirtyPuts > options.maxDirtyOps) {
    this.puts.filter((putter) => putter.handler.active);
    this.dirtyPuts = 0;
  } else {
    this.dirtyPuts++;
  }

  if (this.puts.count >= options.maxQueuedOps) {
    throw Error(`No more than ${options.maxQueuedOps} pending puts are allowed on a single channel`);
  }
  this.puts.enqueue(putBox(handler, value));

  return null;
}

function takeImpl(handler) {
  let putter, putHandler, callback;

  // Happens when this is a buffered channel and the buffer is not empty (an empty buffer means there are no pending
  // puts). We immediately process any puts that were queued when there were no pending takes, up until the buffer is
  // filled with put values.
  if (this.buffer && this.buffer.count > 0) {
    handler.commit();
    const value = this.buffer.remove();

    for (;;) {
      if (this.buffer.full) {
        break;
      }
      putter = this.puts.dequeue();
      if (putter === EMPTY) {
        break;
      }

      putHandler = putter.handler;
      if (putHandler.active) {
        callback = putHandler.commit();
        if (callback) {
          dispatch(() => callback(true));
        }
        if (isReduced(this.xform[p.step](this.buffer, putter.value))) {
          this.close();
        }
      }
    }
    return box(value);
  }

  // This loop runs on an unbuffered channel if there are any pending puts. It processes the next pending put
  // immediately. (Buffered channels skip this section because in order to have come this far, the channel's buffer
  // must have been empty. This means there are no pending puts, so the first pending put pulled will be EMPTY.)
  for (;;) {
    putter = this.puts.dequeue();
    if (putter === EMPTY) {
      break;
    }
    putHandler = putter.handler;
    if (putHandler.active) {
      callback = putHandler.commit();
      if (callback) {
        dispatch(() => callback(true));
      }
      return box(putter.value);
    }
  }

  // If we've exhausted all of our pending puts and the channel is marked closed, we can finally return the fact that
  // the channel is closed. This ensures that any puts that were already pending on the channel are still processed
  // before closure, even if the channel was closed before that could happen.
  if (this.closed) {
    handler.commit();
    return box(CLOSED);
  }

  // If an unbuffered channel or a buffered channel with an empty buffer has no pending puts, and if the channel is
  // still open, the take is queued to be processed when a put is available. Takes whose handlers have gone inactive as
  // the result of alts processing are periodically purged.
  if (this.dirtyTakes > options.maxDirtyOps) {
    this.takes.filter((taker) => taker.active);
    this.dirtyTakes = 0;
  } else {
    this.dirtyTakes++;
  }

  if (this.takes.count >= options.maxQueuedOps) {
    throw Error(`No more than ${options.maxQueuedOps} pending takes are allowed on a single channel`);
  }
  this.takes.enqueue(handler);

  return null;
}

// Closes the channel, if it isn't already closed. This immediately returns any buffered values to pending takes. If
// there are no buffered values (or if they've already been taken by other takes), then all of the rest of the takes
// are completed with the value of `CLOSED`. Any pending puts are completed with the value of `false`.
//
// Note that the buffer is not emptied if there are still values remaining after all of the pending takes have been
// handled. The channel will still provide those values to any future takes, though no new values may be added to the
// channel. Once the buffer is depleted, any future take will return CLOSED.
function closeImpl() {
  if (this._closed) {
    return;
  }
  this._closed = true;

  let taker, putter, callback;

  // If there is a buffer and it has at least one value in it, send those values to any pending takes that might be
  // queued.
  if (this.buffer) {
    this.xform[p.result](this.buffer);
    for (;;) {
      if (this.buffer.count === 0) {
        break;
      }
      taker = this.takes.dequeue();
      if (taker === EMPTY) {
        break;
      }
      if (taker.active) {
        callback = taker.commit();
        const value = this.buffer.remove();
        if (callback) {
          dispatch(() => callback(value));
        }
      }
    }
  }

  // Once the buffer is empty (or if there never was a buffer), send CLOSED to all remaining queued takes.
  for (;;) {
    taker = this.takes.dequeue();
    if (taker === EMPTY) {
      break;
    }
    if (taker.active) {
      callback = taker.commit();
      if (callback) {
        dispatch(() => callback(CLOSED));
      }
    }
  }

  // Send `false` to any remaining queued puts.
  for (;;) {
    putter = this.puts.dequeue();
    if (putter === EMPTY) {
      break;
    }
    if (putter.handler.active) {
      callback = putter.handler.commit();
      if (callback) {
        dispatch(() => callback(false));
      }
    }
  }
}

// The default exception handler, used when no exception handler is supplied to handleException, wrapTransformer, or
// chan. This default handler merely returns CLOSED, which will result in no new value being written to the channel.
const DEFAULT_HANDLER = () => CLOSED;

// Function to actually handle an exception thrown in a transformer. This passes the error object to the handler (or,
// if there is no handler specified, the default handler) and puts its return value into the buffer (as long as that
// return value is not CLOSED).
function handleException(buffer, handler, ex) {
  const value = handler(ex);
  if (value !== CLOSED) {
    buffer.add(value);
  }
  return buffer;
}

// Wraps a transformer with exception handling code, in case an error occurs within the body of the transformer. This
// is done both for the step and result functions of the transformer.
function wrapTransformer(xform, handler = DEFAULT_HANDLER) {
  return {
    [p.step](buffer, input) {
      try {
        return xform[p.step](buffer, input);
      } catch (ex) {
        return handleException(buffer, handler, ex);
      }
    },

    [p.result](buffer) {
      try {
        return xform[p.result](buffer);
      } catch (ex) {
        return handleException(buffer, handler, ex);
      }
    }
  };
}

// The reducer used at the end of a transducer chain to control how the transformed values are reduced back onto the
// channel's buffer. This reducer does nothing more than add the input items (which are the transformed values that are
// being put onto the channel) to the channel buffer.
const bufferReducer = {
  [p.init]() {
    throw Error('init not available');
  },

  [p.step](buffer, input) {
    buffer.add(input);
    return buffer;
  },

  [p.result](buffer) {
    return buffer;
  }
};

// Creates and returns a new channel. The channel may optionally be buffered, may optionally have a transformer
// designated, and may optionally have an exception handler registered to deal with exceptions that occur in the
// transformation process. There must be a buffer specified in order to add a transform or an error will be thrown. An
// exception handler can be passed either way, though it will have no real effect if passed without a transformer.
export function chan(buffer, xform, handler) {
  const buf = buffer === 0 ? null : buffer;
  const b = typeof buf === 'number' ? fixed(buf) : buf;

  if (xform && !b) {
    throw Error('Only buffered channels can use transformers');
  }
  const xf = wrapTransformer(xform ? xform(bufferReducer) : bufferReducer, handler);

  return channel(queue(), queue(), b, xf, false);
}

// Creates an unbuffered channel that closes after a certain delay (in milliseconds). This isn't terribly different
// from the channel created in the `sleep` instruction, except that this one is available to be used while it's
// delaying. A good use case for this is in preventing an `alts` call from waiting too long, as if one of these
// channels is in its operations list, it will trigger the `alts` after the delay time if no other channel does first.
export function timeout(delay) {
  const ch = channel(queue(), queue(), null, wrapTransformer(bufferReducer), true);
  setTimeout(() => close(ch), delay);
  return ch;
}

// Closes a channel. After a channel is closed, no further values can be put on it (`put` will return `false` and no
// new value will be in the channel). If the channel is buffered, the values that are already there when the channel is
// closed remain there, ready to be taken. If the channel is unbuffered or if it is buffered but empty, each `take`
// will result in `CLOSED`. If there are pending takes on the channel when it is closed, those takes will immediately
// return with `CLOSED`.
//
// Channels are perfectly capable of being closed with `channel.close()` without this function at all. However, that is
// the only function that is regularly called on the channel object, and it is more consistent to do `close` the same
// way we do `put`, `take`, etc.
export function close(channel) {
  channel.close();
}
