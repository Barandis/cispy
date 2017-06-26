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
// buffers.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Provides several types of buffers usable for buffered channels. These are all built on a small, efficient queue
// (also provided) which is in turn backed by a JavaScript array.

// A symbol returned whenever an attempt is made to get an item from an empty buffer.
export const EMPTY = Symbol('EMPTY');

// A general purpose, highly efficient JavaScript queue. It is backed by a JavaScript array, but it does not use
// unshift to take elements off the array because unshift causes elements to be copied down every time it's used.
// Instead, a pointer is maintained that keeps track of the location of the next element to be dequeued, and when that
// dequeue happens, the pointer simply moves. When there gets to be enough empty space at the head of the array, it's
// all removed by a single slice execution.
//
// Putting elements into the queue is just done with a basic array push, which -is- highly efficient.
//
// This type of queue is possible because JavaScript arrays are infinitely resizable. In languages with fixed-size
// arrays, a resizing operation would have to run each time the queue fills. This involves a pretty inefficient copy of
// data from one array to a new and bigger array, so it's good that we don't have to resort to that here.
export function queue() {
  return {
    store: [],
    pointer: 0,

    // Returns the number of elements stored in the queue. This may or may not equal the length of the backing store.
    get count() {
      return this.store.length - this.pointer;
    },

    // Returns `true` if the queue is empty.
    get empty() {
      return this.store.length === 0;
    },

    // Adds an item to the queue.
    enqueue(item) {
      this.store.push(item);
    },

    // Removes an item from the queue and returns that item. If the removal causes the amount of empty space at the
    // head of the backing store to exceed a threshold, that empty space is wiped out.
    dequeue() {
      if (this.empty) {
        return EMPTY;
      }

      const item = this.store[this.pointer];
      if (++this.pointer * 2 >= this.store.length) {
        this.store = this.store.slice(this.pointer);
        this.pointer = 0;
      }
      return item;
    },

    // Returns the next item in the queue without removing it.
    peek() {
      return this.empty ? EMPTY : this.store[this.pointer];
    },

    // Filters out any item in the queue that does not cause the supplied predicate function to return `true` when
    // passed that item. This is not exactly a general purpose queue operation, but we need it with channels that will
    // occasionally want to get rid of inactive handlers.
    filter(fn) {
      for (let i = 0, {count} = this; i < count; ++i) {
        const item = this.dequeue();
        if (fn(item)) {
          this.enqueue(item);
        }
      }
    }
  };
}

// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Buffer implementations
//
// Each of the three buffers has the same three properties and two operations. The difference between them is the
// behavior of the `full` property and of the `add` operation.
//
// size: the largest number of items that can be in the buffer at once.
// count: the actual number of items in the buffer.
// full: whether or not the buffer is full.
// add: adds an item to the buffer.
// remove: removes an item from the buffer (and returns it).
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function base(size) {
  const q = queue();

  return {
    get queue() {
      return q;
    },

    get size() {
      return size;
    },

    get count() {
      return this.queue.count;
    },

    remove() {
      return this.queue.dequeue();
    }
  };
}

// A buffer implementation that never discards buffered items when a new item is added.
//
// This buffer has a concept of 'full', but it's a soft limit. If the size of the is exceeded, added items are still
// stored. `full` returns `true` any time that the size is reached or exceeded, so it's entirely possible to call
// `remove` on a full buffer and have it still be full.
export function fixed(size) {
  return Object.assign(Object.create(base(size), {
    full: {
      get() {
        return this.queue.count >= this.size;
      }
    }
  }), {
    add(...items) {
      for (const item of items) {
        this.queue.enqueue(item);
      }
    }
  });
}

// A buffer implementation that drops newly added items when the buffer is full.
//
// This dropping behavior is silent: the new item is simply not added to the queue. Note that this buffer is never
// `full` because it can always be added to without exceeding the size, even if that `adding` doesn't result in a new
// item actually appearing in the buffer.
export function dropping(size) {
  return Object.assign(Object.create(base(size), {
    full: {
      get() {
        return false;
      }
    }
  }), {
    add(...items) {
      for (const item of items) {
        if (this.queue.count < this.size) {
          this.queue.enqueue(item);
        }
      }
    }
  });
}

// A buffer implementation that drops the oldest item when an item is added to a full buffer.
//
// This is very similar to the DroppingBuffer above; the only difference is in what happens when an item is added. In
// this buffer, the new item is indeed added to the buffer, but in order to keep the count of the buffer at or below
// the size, the oldest item in the buffer is silently dropped if the buffer is full when added to. `full` is always
// `false`.
export function sliding(size) {
  return Object.assign(Object.create(base(size), {
    full: {
      get() {
        return false;
      }
    }
  }), {
    add(...items) {
      for (const item of items) {
        if (this.queue.count === this.size) {
          this.queue.dequeue();
        }
        this.queue.enqueue(item);
      }
    }
  });
}
