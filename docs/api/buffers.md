# Buffers (`cispy.buffers`)

[`dropping`](#dropping)
[`fixed`](#fixed)
[`sliding`](#sliding)

Buffering of channels is implemented by using three different kinds of buffers with slightly different functionality. These are made available on the `cispy.buffers` object, so for example, a fixed buffer is instantiated with the `cispy.buffers.fixed`.

There is no need to use any of the API of the buffers; just passing a buffer to the [`chan`](core.md#chan) function call is enough to make buffers work as they should. However, there's nothing preventing their use in other contexts even without channels, so the API that's available is presented here.

## Common API

These functions are available on all three kinds of buffer objects.

[`add`](#add)
[`count`](#count)
[`isFull`](#is-full)
[`remove`](#remove)

### <a name="is-full"></a> `isFull()`

**Determined whether a buffer has reached its storage capacity.**

Dropping and sliding buffers are never regarded as full, because if an item is added to a full buffer of one of those types, they can always be accommodated by dropping something. A fixed buffer is full if it has as many items stored as its capacity, but being full doesn't prevent more items from being added to it. This function will simply return `true` until enough items have been removed to get it back below capacity.

*Returns*

- `false` if called on a sliding or dropping buffer, or on a fixed buffer if there are less items stored in it than its capacity. Otherwise, `true`.

### <a name="count"></a> `count()`

**Returns the number of items currently in the buffer.**

This is the true number of items in the buffer. In other words, if a fixed buffer is over-full, this function will still return the actual number of items stored, not the capacity.

*Returns*

- The number of items currently stored in the buffer.

### <a name="add"></a> `add(item)`

**Adds a new item to the buffer.**

What actually happens depends on the type of buffer. A fixed buffer will simply add the item to the buffer, as will a dropping or sliding buffer if the buffer is not already full.

If a sliding buffer is full, adding an item will mean that the oldest item already in the buffer will be removed before the new item is added. If a dropping buffer is full, the new item will simply be dropped.

*Parameters*

- `item` (*any*): the item to add to the buffer.

### <a name="remove"></a> `remove()`

**Removes the oldest item from the buffer and returns it.**

This has identical behavior in all three buffer types. To be noted is that an over-filled buffer will still return `true` from [`isFull`](#is-full) if removing an item still results in it having more items stored than its capacity.

*Returns*

- The value removed from the buffer, which is the oldest value in it.

## Buffer Functions

### <a name="fixed"></a> `fixed(capacity)`

**Returns a fixed buffer of the specified capacity.**

A fixed buffer is a 'normal' buffer, one that stores and returns items on demand. While it is capable of being over-filled (see the API above), that ability is not used in Cispy. A buffer that is full will cause the next put to its channel to block until at least one item is removed from the buffer.

*Parameters*

- `capacity` (*integer*): the number of items that the buffer can hold before it's full.

*Returns*

- A fixed buffer of the specified capacity.

### <a name="sliding"></a> `sliding(capacity)`

**Returns a sliding buffer of the specified capacity.**

A sliding buffer drops the first-added (oldest) item already in the buffer if a new item is added when the buffer is already at capacity. Since it's always capable of having items added to it, it's never considered full, and therefore a put to a channel buffered by a sliding buffer never blocks.

*Parameters*

- `capacity` (*integer*): the number of items that the buffer can hold before the oldest items begin to drop on an add.

*Returns*

- A sliding buffer of the specified capacity.

### <a name="dropping"></a> `dropping(capacity)`

**Returns a dropping buffer of the specified capacity.**

A dropping buffer silently drops the item being added if the buffer is already at capacity. Since adding a new item will always 'succeed' (even if it succeeds by just ignoring the add), it is never considered full and therefore a put to a channel buffered by a dropping buffer never blocks.

*Parameters*

- `capacity` (*integer*): the number of items that the buffer can hold before adds begin to be ignored.

*Returns*

- A dropping buffer of the specified capacity.
