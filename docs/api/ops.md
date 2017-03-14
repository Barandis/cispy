# Channel Operations (`cispy.ops`)

[`debounce`](#debounce)
[`into`](#into)
[`map`](#map)
[`merge`](#merge)
[`onto`](#onto)
[`partition`](#partition)
[`pipe`](#pipe)
[`reduce`](#reduce)
[`split`](#split)
[`tap`](#tap)
[`throttle`](#throttle)
[`untap`](#untap)
[`untapAll`](#untap-all)

This is a set of functions that create processes to operate on channels. It's therefore a consumer of the processes and channels that are defined throughout the rest of the library.

There are two broad classes of functions in `cispy.util`: flow control functions and conversion functions. The first group transfers values from a channel (or channels) to another channel (or channels) in different ways. The second converts channels to other kinds of objects, or vice versa.

While these functions are all transformations in some way, they cannot be replicated by transducers. Transducers operate on a single channel and cannot convert channels to other kinds of objects. All of these either use multiple channels or create a different kind of object. Even [`map`](#map), which has the same name and similar function as a very common transducer library function, operates in a different way than the transducer does.

## Flow Control Functions

### <a name="pipe"></a> `pipe(src, dest, keepOpen?)`

**Pipes the values from one channel onto another channel.**

This ties two channels together so that puts on the source channel can be taken off the destination channel. This does not duplicate values in any way - if another process takes a value off the source channel, it will never appear on the destination channel. In most cases you will not want to take values off a channel once it's piped to another channel, since it's difficult to know which values will go to which channel.

Closing either channel will break the connection between the two. If the source channel is closed, the destination channel will by default also be closed. However, passing `true` as the third parameter will cause the destination channel to remain open even when the source channel is closed (the connection is still broken however).

Because of the ability to leave the destination channel open, a possible use case for this function is to wrap the destination channel(s) of one of the other flow control functions below to have a channel that survives the source channel closing. The rest of those functions (aside from the special-case [`tap`](#tap)) automatically close their destination channels when the source channels close.

*Parameters*

- `src` (*channel*): the source channel where values are being put.
- `dest` (*channel*): the destination channel where values from the source channel are piped.
- `keepOpen` (*boolean*): instructs the destination channel to remain open if set to `true` (default is `false`).

*Returns*

- The destination channel.

### <a name="partition"></a> `partition(fn, src, tBuffer?, fBuffer?)`

**Creates two new channels and routes values from a source channel to them according to a predicate function.**

The supplied function is invoked with every value that is put onto the source channel. Those that return `true` are routed to the first destination channel; those that return `false` are routed to the second.

The new channels are created by the function based on the buffer values passed as the third and fourth parameters. If one or both of these are missing, `null`, or `0`, the corresponding destination channel is unbuffered. If one is a positive integer, the corresponding channel is buffered by a fixed buffer of that size. If the parameter for a channel is a buffer, then that buffer is used to buffer the new channel.

Both new channels are closed when the source channel is closed.

*Parameters*

- `fn` (*function*): a predicate function that determines which new channel receives each value on the source channel. This is done by passing each value through this function, and the return value determines the destination.
- `src` (*channel*): the source channel where values are being put.
- `tBuffer` (*number or buffer*): the buffer used to back the new channel that will receive values that return `true` from the predicate function. By default, the channel will be unbuffered.
- `fBuffer` (*number or buffer*): the buffer used to back the new channel that will receive values that return `false` from the predicate function. By default, the channel will be unbuffered.

*Returns*

- A two element array. The first element of the array is the channel to which values that return `true` from the predicate function, and the second element is the channel receiving values that return `false`.

### <a name="merge"></a> `merge(srcs, buffer?)`

**Merges one or more channels into a single destination channel.**

Values are given to the destination channel as they are put onto the source channels. If `merge` is called when there are already values on multiple source channels, the order that they're put onto the destination channel is random.

The destination channel is created by the function based on the buffer value passed as the second parameter. If this is missing, `null`, or `0`, the destination channel will be unbuffered. If it's a positive integer, the destination channel is buffered by a fixed buffer of that size. If the parameter is a buffer, then that buffer is used to buffer the destination channel.

As each source channel closes, it is removed from the merge, leaving the channels that are still open to continue merging. When *all* of the source channels close, then the destination channel is closed.

*Parameters*

- `srcs` (*array*): an array of channels whose values are merged into the destination channel.
- `buffer` (*number or buffer*): the buffer used to back the destination channel. By default, that channel will be unbuffered.

*Returns*

- The newly-created destination channel.

### <a name="split"></a> `split(src, buffers...)`

**Splits a single channel into multiple destination channels, with each destination channel receiving every value put onto the source channel.**

Every parameter after the first represents the buffer from a single destination channel. Each `0` or `null` will produce an unbuffered channel, while each positive integer will produce a channel buffered by a fixed buffer of that size. Each buffer will produce a buffered channel backed by that buffer. If there are no parameters after the first, then two unbuffered channels will be produced as a default.

When the source channel is closed, all destination channels will also be closed. However, if destination channels are closed, they do nothing to the source channel.

*Parameters*

- `src` (*channel*): the source channel where values are being put.
- `buffers` (*numbers or buffers*): zero or more buffers used to back new destination channels. By default, two unbuffered channels will be produced.

*Returns*

- An array containing all of the newly-created destination channels.

### <a name="map"></a> `map(fn, srcs, buffer?)`

**Maps the values from one or more source channels through a function, putting the results on a new channel.**

The mapping function is given one value from each source channel, after at least one value becomes available on every source channel. The output value from the function is then put onto the destination channel.

The destination channel is created by the function based on the buffer value passed as the third parameter. If this is missing, `null`, or `0`, the destination channel will be unbuffered. If it's a positive integer, the destination channel is buffered by a fixed buffer of that size. If the parameter is a buffer, then that buffer is used to buffer the destination channel.

Once *any* source channel is closed, the mapping ceases and the destination channel is also closed.

This is obviously similar to a map transducer, but unlike a transducer, this function works with multiple input channels. This is something that a transducer on a single channel is unable to do.

*Parameters*

- `fn` (*function*): the mapping function run over values from each source channel. This function should accept one parameter per source channel and return the value that should be put onto the destination channel.
- `srcs` (*array*): an array of channels whose values are mapped to the destination channel.
- `buffer` (*number or buffer*): the buffer used to back the destination channel. By default, that channel will be unbuffered.

### <a name="tap"></a> `tap(src, dest?)`

**Taps a channel, sending all of the values put onto it to the destination channel.**

A source channel can be tapped multiple times, and all of the tapping (destination) channels receive each value put onto the tapped (source) channel.

This is different from [`split`](#split) in that it's temporary. Channels can tap a channel and then untap it, multiple times, as needed. If a source channel has all of its taps removed, then it reverts to a normal channel, just as it was before it was tapped.

Also unlike [`split`](#split), each call can only tap once. For multiple channels to tap a source channel, `tap` has to be called multiple times.

Closing either the source or any of the destination channels has no effect on any of the other channels.

*Parameters*

- `src` (*channel*): the source channel to be tapped.
- `dest` (*channel*): the destination channel doing the tapping. If no destination channel is supplied, a new unbuffered channel will be created.

*Returns*

- The destination channel.

### <a name="untap"></a> `untap(src, dest)`

**Untaps a previously tapping destination channel from its source channel.**

This removes a previously created tap. The destination (tapping) channel will stop receiving the values put onto the source channel.

If the destination channel was not, in fact, tapping the source channel, this function will do nothing. If all taps are removed, the source channel reverts to normal (i.e., it no longer has the tapping code applied to it and can be taken from as normal).

*Parameters*

- `src` (*channel*): the tapped source channel.
- `dest` (*channel*): the tapping destination channel whose tap is being removed.

### <a name="untap-all"></a> `untapAll(src)`

**Removes all taps from a source channel.**

The previously-tapped channel reverts to a normal channel, while any channels that might have been tapping it no longer receive values from the source channel. If the source channel had no taps, this function does nothing.

*Parameters*

- `src` (*channel*): the source channel to remove all taps from.

## Conversion Functions

### <a name="reduce"></a> `reduce(fn, channel, init)`

**Creates a single value from a channel by running its values through a reducing function.**

For every value put onto the input channel, the reducing function is called with two parameters: the accumulator that holds the result of the reduction so far, and the new input value. The initial value of the accumulator is the third parameter to `reduce`. The reduction is not complete until the input channel closes.

This function returns a channel. When the final reduced value is produced, it is put onto this channel, and when that value is taken from it, the channel is closed.

*Parameters*

- `fn` (*function*): the reducing function. This is a function of two parameters that is fed the accumulated value so far as its first parameter and the new value put onto the input channel as the second parameter. It is expected to return a new accumulator.
- `channel` (*channel*): the channel whose values are being reduced.
- `init` (*any*): the initial value of the accumulator, passed to the reduction function on its first invocation.

*Returns*

- A channel onto which the reduced value is put once the reduction completes. When this value is taken off the channel, the channel is closed.

### <a name="onto"></a> `onto(channel?, array)`

**Puts all values from an array onto the supplied channel.**

If no channel is passed to this function, a new channel is created. In effect, this directly converts an array into a channel with the same values on it.

The channel is closed after the final array value is put onto it.

*Parameters*

- `channel` (*channel*): the channel onto which the values from the input array are put. If this is not supplied, a new unbuffered channel is created.
- `array` (*array*): the array of values to put onto the provided channel (or a new channel).

*Returns*

- The channel receiving the array values.

### <a name="into"></a> `into(array?, channel)`

**Takes all of the values from a channel and pushes them into an array.**

If no array is passed to this function, a new (empty) one is created. In effect, this directly converts a channel into an array with the same values. Either way, this operation cannot complete until the input channel is closed.

This function returns a channel. When the final array is produced, it is put onto this channel, and when that value is taken from it, the channel is closed.

*Parameters*

- `array` (*array*): the array onto which channel values will be pushed. If this isn't supplied, a new array is created and used instead.
- `channel` (*channel*): the input channel whose values are being pushed onto the array.

*Returns*

- A channel onto which the array is put once the input channel closes. When this value is taken off the channel, the channel is closed.

## Timing Functions

These are a couple functions that control how rapidly an input value can appear on an output channel. There is often some confusion between the concepts of debouncing and throttling; if you can forgive the background of the page, [Ben Alman](http://benalman.com/projects/jquery-throttle-debounce-plugin/) does a good job of visually explaining the difference between the two.

### <a name="debounce"></a> `debounce(src, buffer?, delay, options?)`

**Debounces an input channel.**

Debouncing is the act of turning several input values into one. For example, debouncing a channel driven by a `mousemove` event would cause only the final `mousemove` event to be put onto the channel, dropping all of the other ones. This can be desirable because `mousemove` events come in bunches, being produced continually while the mouse is moving, and often all that we really care about is to learn where the mouse ended up.

This function does this by controlling which values that have been put onto the source channel are made available on the destination channel, and when.

The `delay` parameter determines the debounce threshold. Once the first value is put onto the source channel, debouncing is in effect until the number of milliseconds in `delay` passes without any other value being put onto that channel. In other words, the delay will be refreshed if another value is put onto the source channel before the delay elapses. After a full delay interval passes without a value being placed on the source channel, the last value put becomes available on the destination channel.

This behavior can be modified through three options.

- `leading` (default: `false`): instead of making a value available on the destination channel after the delay passes, the first value put onto the source channel is made available *before* the delay begins. No value is available on the destination channel after the delay has elapsed (unless `trailing` is also `true`).
- `trailing` (default: `true`): the default behavior, where a value is not made available on the destination channel until the entire delay passes without a new value being put on the source channel.
- `maxDelay` (default: `0`): debouncing can, in theory, go on forever as long as new input values continue to be put onto the source channel before the delay expires. Setting this option to a positive number sets the maximum number of milliseconds that debouncing can go on before it's forced to end, even if in the middle of a debouncing delay. Having debouncing end through the max delay operates exactly as if it had ended because of lack of input; the last input is made available on the destination channel (if `trailing` is `true`), and the next input will trigger another debounce operation.

If both `leading` and `trailing` are `true`, values will not be duplicated. The first value put onto the source channel will be put onto the destination channel immediately (per `leading`) and the delay will begin, but a value will only be made available on the destination channel at the end of the delay (per `trailing`) if *another* input value was put onto the source channel before the delay expired.

*Parameters*

- `src` (*channel*): the source channel where values are being put.
- `buffer` (*number or buffer*): the buffer used to back the destination channel. By default, that channel will be unbuffered.
- `delay` (*number*): the debouncing delay, in milliseconds.
- `options` (*object*): an optional set of options, as described above.

*Returns*

- The newly-created destination channel.

### <a name="throttle"></a> `throttle(src, buffer?, delay, options?)`

**Throttles an input channel.**

Throttling is the act of ensuring that something only happens once per time interval. In this case, it means that a value put onto the source channel is only made available to the destination channel once per a given number of milliseconds. An example usage would be with window scroll events; these events are nearly continuous as scrolling is happening, and perhaps we don't want to call an expensive UI updating function every time a scroll event is fired. We can throttle the input channel and make it only offer up the scroll events once every 100 milliseconds, for instance.

Throttling is effected by creating a new channel as a throttled destination for values put onto the source channel. Values will only appear on that destination channel once per delay interval; other values that are put onto the source channel in the meantime are discarded.

The `delay` parameter controls how often a value can become available on the destination channel. When the first value is put onto the source channel, it is immediately put onto the destination channel as well and the delay begins. Any further values put onto the source channel during that delay are *not* passed through; only when the delay expires is the last input value made available on the destination channel. The delay then begins again, so that further inputs are squelched until *that* delay passes. Throttling continues, only allowing one value through per interval, until an entire interval passes without input.

This behavior can be modified by two options.

- `leading` (default: `true`): makes the value that triggered the throttling immediately available on the destination channel before beginning the delay. If this is `false`, the first value will not be put onto the destination channel until a full delay interval passes.
- `trailing` (default: `true`): makes the last value put onto the source channel available on the destination channel when the delay expires. If this is `false`, any inputs that come in during the delay are ignored, and the next value is not put onto the destination channel until the first input *after* the delay expires.

If both `leading` and `trailing` are `true`, values will not be duplicated. The first value put onto the source channel will be put onto the destination channel immediately (per `leading`) and the delay will begin, but a value will only be made available on the destination channel at the end of the delay (per `trailing`) if *another* input value was put onto the source channel before the delay expired.

*Parameters*

- `src` (*channel*): the source channel where values are being put.
- `buffer` (*number or buffer*): the buffer used to back the destination channel. By default, that channel will be unbuffered.
- `delay` (*number*): the throttling delay, in milliseconds.
- `options` (*object*): an optional set of options, as described above.

*Returns*

- The newly-created destination channel.
