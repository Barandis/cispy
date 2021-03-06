/*
 * Copyright (c) 2017-2018 Thomas Otterson
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

/**
 * Provides several types of buffers usable in buffered channels. These are all built on a small, efficient queue (also
 * provided) which is in turn backed by a JavaScript array.
 *
 * @module cispy/buffers
 */

/**
 * **The value returned from a buffer when it has no values in it.**
 *
 * This is used instead of `null` because `null` is a value that can actually be put onto a channel (and therefore
 * into a buffer backing that channel). That means that, despite the assertion that only
 * `{@link module:cispy~Cispy.CLOSED|CLOSED}` cannot be put onto a channel, it's probably not a great idea to put
 * `EMPTY` onto an *unbuffered* channel. While it won't cause an error to be thrown, and while it will be removed from
 * the buffer to allow the next value to be removed, it's likely to cause some odd behavior.
 *
 * @type {Symbol}
 * @memberOf module:cispy~Cispy
 */
const EMPTY = Symbol('EMPTY');

/**
 * A general purpose, highly efficient JavaScript queue. It is backed by a JavaScript array, but it does not
 * use `unshift` to take elements off the array because unshift causes elements to be copied every time it's used.
 * Instead, a pointer is maintained that keeps track of the location of the next element to be dequeued, and when that
 * dequeue happens, the pointer simply moves. When the empty space at the head of the array gets large enough, it's
 * removed by a single slice operation.
 *
 * Putting elements into the queue is just done with a basic `push`, which *is* highly efficient.
 *
 * This type of queue is possible in JavaScript because JS arrays are resizable. In languages with fixed-size arrays,
 * a resizing operation would have to be run each time the queue fills.
 *
 * @namespace Queue
 */

/**
 * Creates a new queue. This queue is created empty, with a backing array of length 0.
 *
 * @returns {module:cispy/buffers~Queue} a new, empty queue
 * @private
 */
function queue() {
  const obj = {
    store: [],
    pointer: 0,

    /**
     * Returns the number of elements stored in the queue. This may or may not equal the length of the backing store.
     *
     * @name count
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @type {number}
     * @readonly
     */
    get count() {
      return this.store.length - this.pointer;
    },

    /**
     * Returns `true` if the queue is empty.
     *
     * @name empty
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @type {boolean}
     * @readonly
     */
    get empty() {
      return this.store.length === 0;
    },

    /**
     * Adds an item to the queue.
     *
     * @function enqueue
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @param {*} item The value being added to the queue.
     */
    enqueue(item) {
      this.store.push(item);
    },

    /**
     * Removes an item from the queue and returns that item. If the removal causes the amount of empty space at the
     * head of the backing store to exceed a threshold, that empty space is removed.
     *
     * @function dequeue
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @return {*} The oldest stored item in the queue.
     */
    dequeue() {
      if (this.empty) {
        return EMPTY;
      }

      const item = this.store[this.pointer];
      // Removes the items in the backing array before the current pointer, if there is enough empty space before the
      // pointer to justify it.
      if (++this.pointer * 2 >= this.store.length) {
        this.store = this.store.slice(this.pointer);
        this.pointer = 0;
      }
      return item;
    },

    /**
     * Returns the next item in the queue without removing it.
     *
     * @function peek
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @return {*} The oldest item stored in the queue.
     */
    peek() {
      return this.empty ? EMPTY : this.store[this.pointer];
    },

    /**
     * Filters out any item in the queue that does not cause the supplied predicate function to return `true` when
     * passed that item. This is not exactly a general purpose queue operation, but we need it with channels that will
     * occasionally want to get rid of inactive handlers.
     *
     * @function filter
     * @memberOf module:cispy/buffers~Queue
     * @instance
     * @param {Function} fn The predicate function that determines whether an element remains in the queue.
     */
    filter(fn) {
      for (let i = 0, { count } = this; i < count; ++i) {
        const item = this.dequeue();
        if (fn(item)) {
          this.enqueue(item);
        }
      }
    }
  };

  return obj;
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

/**
 * The base for buffer classes, containing the common functionality between all of them. The only properties that
 * actually vary between buffer types are `full` (whether or not the buffer is full) and `add` (because different
 * buffers have different behavior when something is added to a full buffer).
 *
 * These buffers are each backed by a {@link Queue}.
 *
 * @namespace Buffer
 */

/**
 * Creates a base buffer of the given size.
 *
 * @param  {number} size the maximum number of items that the new buffer can hold.
 * @return {module:cispy/buffers~Buffer} the new buffer.
 * @private
 */
function base(size) {
  const q = queue();

  return {
    /**
     * The queue that backs this buffer.
     *
     * @name queue
     * @memberOf module:cispy/buffers~Buffer
     * @instance
     * @type {module:cispy/buffers~Queue}
     * @readonly
     */
    get queue() {
      return q;
    },

    /**
     * The size of the buffer.
     *
     * This is *not* the number of elements in the buffer; it is the number of items that can be stored without the
     * buffer overflowing. It is static and is set at creation time.
     *
     * @name size
     * @memberOf module:cispy/buffers~Buffer
     * @instance
     * @type {number}
     * @readonly
     */
    get size() {
      return size;
    },

    /**
     * The number of items currently being stored by the buffer.
     *
     * @name count
     * @memberOf module:cispy/buffers~Buffer
     * @instance
     * @type {number}
     * @readonly
     */
    get count() {
      return this.queue.count;
    },

    /**
     * Removes and returns the oldest item in the buffer.
     *
     * @function remove
     * @memberOf module:cispy/buffers~Buffer
     * @instance
     * @return {*} The oldest item in the buffer.
     */
    remove() {
      return this.queue.dequeue();
    }
  };
}

/**
 * **Creates a fixed buffer of the specified capacity.**
 *
 * A fixed buffer is a 'normal' buffer, one that stores and returns items on demand. While it is capable of being
 * over-filled, that ability is not used in Cispy. A buffer that is full will cause the next put to its channel to
 * block until at least one item is removed from the buffer.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function fixedBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before it's full.
 * @return {module:cispy/buffers~FixedBuffer} A new fixed buffer of the specified capacity.
 */
function fixed(size) {
  /**
   * A buffer implementation that never discards buffered items when a new item is added.
   *
   * This buffer has a concept of *full*, but it's a soft limit. If the size of the buffer is exceeded, added items are
   * still stored. {@link module:cispy/buffers~FixedBuffer#full|full} returns `true` any time that the size is
   * reached or exceeded, so it's entirely possible to call {@link module:cispy/buffers~Buffer#remove|remove} on a
   * full buffer and have it still be full.
   *
   * @namespace FixedBuffer
   * @augments {module:cispy/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      // Object.assign doesn't handle getters and setters properly, so we add this getter as a property descriptor
      // in the second argument of Object.create instead.
      full: {
        /**
         * Whether or not the buffer has as many or more items stored as its
         * {@link module:cispy/buffers~Buffer#size|size}.
         *
         * @name full
         * @memberOf module:cispy/buffers~FixedBuffer
         * @instance
         * @type {number}
         * @readonly
         */
        get() {
          return this.queue.count >= this.size;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. These items will be added even if the buffer is full.
       *
       * @function add
       * @memberOf module:cispy/buffers~FixedBuffer
       * @instance
       * @param {...*} items The items to be added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          this.queue.enqueue(item);
        }
      }
    }
  );
}

/**
 * **Creates a dropping buffer of the specified capacity.**
 *
 * A dropping buffer silently drops the item being added if the buffer is already at capacity. Since adding a new
 * item will always 'succeed' (even if it succeeds by just ignoring the add), it is never considered full and
 * therefore a put to a channel buffered by a dropping buffer never blocks.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function droppingBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before newest items are dropped on add.
 * @return {module:cispy/buffers~DroppingBuffer} A new dropping buffer of the specified capacity.
 */
function dropping(size) {
  /**
   * A buffer implementation that drops newly added items when the buffer is full.
   *
   * This dropping behavior is silent: the new item is simply not added to the queue. Note that this buffer is never
   * `full` because it can always be added to wiehtout exceeding the size, even if that 'adding' doesn't result in a new
   * item actually appearing in the buffer.
   *
   * @namespace DroppingBuffer
   * @extends {module:cispy/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      full: {
        /**
         * Whether or not the buffer is full. As a {@link module:cispy/buffers~DroppingBuffer|DroppingBuffer} is
         * never considered full, this will always return `false`.
         *
         * @name full
         * @memberOf module:cispy/buffers~DroppingBuffer
         * @instance
         * @type {number}
         * @readonly
         */
        get() {
          return false;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. If the buffer has already reached its capacity, then the item is silently
       * dropped instead.
       *
       * @function add
       * @memberOf module:cispy/buffers~DroppingBuffer
       * @instance
       * @param {...*} items the items added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          if (this.queue.count < this.size) {
            this.queue.enqueue(item);
          }
        }
      }
    }
  );
}

/**
 * **Creates a sliding buffer of the specified capacity.**
 *
 * A sliding buffer drops the first-added (oldest) item already in the buffer if a new item is added when the buffer
 * is already at capacity. Since it's always capable of having items added to it, it's never considered full, and
 * therefore a put to a channel buffered by a sliding buffer never blocks.
 *
 * This buffer is able to be passed to `{@link module:cispy~Cispy.chan|chan}` to create a buffered channel.
 *
 * @function slidingBuffer
 * @memberOf module:cispy~Cispy
 * @param {number} size The number of items that the new buffer can hold before oldest items are dropped on add.
 * @return {module:cispy/buffers~SlidingBuffer} A new sliding buffer of the specified capacity.
 */
function sliding(size) {
  /**
   * A buffer implementation that drops the oldest item when an item is added to a full buffer.
   *
   * This is very similar to {@link module:cispy/buffers~DroppingBuffer|DroppingBuffer}; the only difference is in
   * what happens when an item is added. In this buffer, the new item is indeed added to the buffer, but in order to
   * keep the count of the buffer at or below its size, the oldest item in the buffer is silently dropped.
   *
   * @namespace SlidingBuffer
   * @extends {module:cispy/buffers~Buffer}
   */
  return Object.assign(
    Object.create(base(size), {
      /**
       * Whether or not the buffer is full. As a {@link module:cispy/buffers~SlidingBuffer|SlidingBuffer} is
       * never considered full, this will always return `false`.
       *
       * @name full
       * @memberOf module:cispy/buffers~SlidingBuffer
       * @instance
       * @type {number}
       * @readonly
       */
      full: {
        get() {
          return false;
        }
      }
    }),
    {
      /**
       * Adds one or more items to the buffer. If the buffer has already reached its capacity, then the oldest items in
       * the buffer are dropped to make way for the new items.
       *
       * @function add
       * @memberOf module:cispy/buffers~SlidingBuffer
       * @instance
       * @param {...*} items The items to be added to the buffer.
       */
      add(...items) {
        for (const item of items) {
          if (this.queue.count === this.size) {
            this.queue.dequeue();
          }
          this.queue.enqueue(item);
        }
      }
    }
  );
}

module.exports = {
  EMPTY,
  queue,
  fixed,
  dropping,
  sliding
};
