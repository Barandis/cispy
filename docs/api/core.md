# Core Functions

[`alts`](#alts)
[`chan`](#chan)
[`config`](#config)
[`go`](#go)
[`put`](#put)
[`putAsync`](#put-async)
[`raise`](#raise)
[`sleep`](#sleep)
[`spawn`](#spawn)
[`take`](#take)
[`takeAsync`](#take-async)
[`timeout`](#timeout)
[`CLOSED`](#closed)
[`DEFAULT`](#default)
[`EMPTY`](#empty)

These functions and objects are all available on the main `cispy` object (e.g., `cispy.go` or `cispy.CLOSED`).

Core functions are the functions involved in the creation of processes and channels and in communicating between processes via channels.

## Process and Channel Creation

### <a name="go"></a> `go(fn, params...)`

**Creates a new process from a generator function.**

The generator function (expressed literally as `function*() { ... }`) is run in a separate process under the control of the CSP engine, and any `yield` expressions within the generator function followed by the five process instructions ([`put`](#put), [`take`](#take), [`alts`](#alts), [`timeout`](#timeout), [`raise`](#raise)) are given their special meanings.

Really, this is a convenience function, but one that's convenient enough that it's used almost universally over its alternative. [`spawn`](#spawn) does the actual work, but it takes a generator instead of a generator function, and since there is no generator literal, `go` is easier to use. The generator function is invoked to create a generator for [`spawn`](#spawn), and when that happens, the remaining `go` parameters are applied to that generator function.

*Parameters*

- `fn` (*generator function*): a generator function to be run in a separate process.
- `params` (*any*): zero or more parameters that are sent to the generator function when it's invoked to create the process.

*Returns*

- A channel. This channel is given a single value when the process completes, and that is the return value of the generator function. This channel automatically closes when that value is taken from it.

### <a name="spawn"></a> `spawn(gen)`

**Creates a new process from a generator.**

This does exactly the same thing as [`go`](#go), but it takes a generator instead of a generator function and its parameters. Because a generator does not have a literal notation, [`go`](#go) is going to be used the vast majority of the time. However, if a generator has already been created by invoking its generator function, `spawn` is available to run it in a separate process.

*Parameters*

- `gen` (*generator*): a generator to be run in a separate process.

*Returns*

- A channel. This channel is given a single value when the process completes, and that is the return value of the generator. This channel automatically closes when that value is taken from it.

### <a name="chan"></a> `chan(buffer?, xform?, exHandler?)`

**Creates and returns a new channel.**

By default this channel will be a simple unbuffered, untransformed channel, but that can be changed through parameters to this function. A channel does not have any externally useful properties. It exists largely to be passed into [`put`](#put), [`take`](#take), [`alts`](#alts), [`putAsync`](#put-async), and [`takeAsync`](#take-async) calls.

If a buffer value is provided, it defines what buffer should back the channel. If this is `null`, `0`, or completely missing, the channel will be unbuffered. If it's a positive number, the channel will be buffered by a [`fixed`](buffers.md#fixed) buffer of that size. If it's a buffer object, that object will be used as the channel's buffer.

`chan` supports transducers by allowing a transformer function to be associated with it. This is passed as the second parameter and can only be used if the channel is buffered (otherwise an error is thrown). This transformer function must take another transformer as a parameter (allowing transformers to be chained), and it must return an object conforming to the transducer protocol. The transformer functions provided by several libraries (including my own xduce library) meet these requirements.

Errors in the transformation process can be handled by passing an error handler. This is a function that expects to receive an error object as a parameter and can return a value that is then put onto the channel. If this value is [`CLOSED`](special.md#closed), then no value will be put onto the channel upon handler completion.

*Parameters*

- `buffer` (*number or buffer*): the buffer object that should back this channel. If this is a positive number, a fixed buffer of that size will be created to back the channel. If it is `0` or `null` (or is just missing), the channel will be unbuffered.
- `xform` (*function*): an optional transformer function to run each value through before putting it onto the channel. This function should expect one parameter (another transformer that it's chained to) and return an object that conforms to the transducer protocol. Transformers from any JavaScript transducer library should work fine. If a transformer is provided on an unbuffered channel, an error will be thrown.
- `exHandler` (*function*): an optional error handler that is run whenever an error occurs inside a transformer function. If that happens, this function is called with one parameter, which is the error object. The value that the handler returns (if it is not [`CLOSED`](special.md#closed)) will be put onto the channel when the handler finishes running.

*Returns*

- A new channel.

### <a name="timeout"></a> `timeout(delay)`

**Creates a new unbuffered channel that closes after some amount of time.**

This channel is able to be used for putting and taking as normal, but it will close after the number of milliseconds in its `delay` parameter has passed. For that reason it's not really intended to be used for putting and taking. Its primary purpose is to be a channel passed to [`alts`](#alts) to place a time limit on how long its process will block.

*Parameters*

- `delay` (*number*): the number of milliseconds to keep the new channel open. After that much time passes, the channel will close automatically.

*Returns*

- A new channel that automatically closes after the delay completes.

## In-Process Instructions

### <a name="put"></a> `put(channel, value?)`

**Puts a value onto a channel, blocking the process until that value is taken from the channel by a different process (or until the channel closes).**

A value is always put onto the channel, but if that value isn't specified by the second parameter, it is `undefined`. Any value may be put on a channel, with the sole exception of the special value [`CLOSED`](special.md#closed).

This function *must* be called from within a process and as part of a `yield` expression.

When `put` is completed and its process unblocks, its `yield` expression evaluates to a status Boolean that indicates what caused the process to unblock. That value is `true` if the put value was successfully taken by another process, or `false` if the unblocking happened because the target channel closed.

*Parameters*

- `channel` (*channel*): the channel that the process is putting a value onto.
- `value` (*any*): the value being put onto the channel.

*Returns*

- The function itself returns an instruction object that guides the process in running the put. This is why `put` must be run in a process; the instruction object is meaningless otherwise. After the process unblocks, the `yield put` expression returns `true` if the put value was taken or `false` if the target channel closed.

### <a name="take"></a> `take(channel)`

**Takes a value from a channel, blocking the process until a value becomes available to be taken (or until the channel closes with no more values on it to be taken).**

This function *must* be called from within a process and as part of a `yield` expression.

When `take` is completed and its process unblocks, its `yield` expression evaluates to the actual value that was taken. If the target channel closed, then all of the values already placed onto it are resolved by `take` as normal, and once no more values are available, the special value [`CLOSED`](special.md#closed) is returned.

*Parameters*

- `channel` (*channel*): the channel that the process is taking a value from.

*Returns*

- The function itself returns an instruction object that guides the process in running the take. This is why `take` must be run in a process; the instruction object is meaningless otherwise. After the process unblocks, the `yield take` expression returns the value taken from the channel, or [`CLOSED`](special.md#closed) if the target channel has closed and no more values are available to be taken.

### <a name="alts"></a> `alts(operations, options?)`

**Completes the first operation among the provided operations that comes available, blocking the process until then.**

`operations` is an array whose elements must be channels or two-element sub-arrays of channels and values, in any combination. An operation that is a channel is a take operation on that channel. An operation that is a two-element array is a put operation on that channel using that value. Exactly one of these operations will complete, and it will be the first operation that unblocks.

This function *must* be called from within a process and as part of a `yield` expression.

When `alts` is completed and its process unblocks, its `yield` expression evaluates to an object of two properties. The `value` property becomes exactly what would have been returned by the equivalent `yield put` or `yield take` operation: a Boolean in the case of a put, or the taken value in the case of a take. The `channel` property is set to the channel where the operation actually took place. This will be equivalent to the channel in the `operations` array which completed first, allowing the process to unblock.

If there is more than one operation already available to complete when the call to `alts` is made, the operation with the highest priority will be the one to complete. Regularly, priority is non-deterministic (i.e., it's set randomly). However, if the options object has a `priority` value set to `true`, priority will be assigned in the order of the operations in the supplied array.

If all of the operations must block (i.e., there are no pending puts for take operations, or takes for put operations), a default value may be returned. This is only done if there is a `default` property in the options object, and the value of that property becomes the value returned by `yield alts`. The channel is set to the special value [`DEFAULT`](special.md#default).

*Parameters*

- ``operations`` (*array*): a collection of elements that correspond to take and put operations. A take operation is signified by an element that is a channel (which is the channel to be taken from). A put operation is specified by an element that is itself a two-element array, which has a channel followed by a value (which is the channel and value to be put).
- ``options`` (*object*): an optional object which can change the behavior of `alts` through two properties. If a `priority` property is present and evaluated to `true`, then the priority of operations to complete when more than one is immediately available changes from a random priority to priority according to position within the operations array (earlier positions have the higher priority). If a `default` property is set, and if none of the operations are immediately available, then the value of this `default` property will become the value of the `alts` expression (with none of the operations completing).

*Returns*

- The function itself returns an instruction object that guides the process in running the puts and takes. This is why `alts` must be run in a process; the instruction object is meaningless otherwise. After the process unblocks, the `yield alts` expression returns an object with two properties: `value` will have the value of the completed operation (the same value that would be returned if either a `put` or `take` function was called instead), and `channel` will have the channel object that completed the operation that allowed the `alts` process to unblock.

### <a name="sleep"></a> `sleep(delay)`

**Blocks the process for the specified time (in milliseconds) and then unblocks it.**

This implements a delay, but one that's superior to other kinds of delays (`setTimeout`, etc.) because it blocks the process and allows the dispatcher to allow other processes to run while this one waits. If the delay is set to `0` or is missing altogether, the process will relinquish control to the next process in the queue and immediately reschedule itself to be continued, rather than blocking.

This function *must* be called from within a process and as part of a `yield` expression.

When this function completes and its process unblocks, the `yield` expression doesn't take on any meaningful value. The purpose of this function is simply to delay, not to communicate any data.

*Parameters*

- `delay` (*number*): the number of milliseconds that the process will block for. At the end of that time, the process is again eligible to be run by the dispatcher again. If this is missing or set to `0`, the process will cede execution to the next one but immediately requeue itself to be run again.

*Returns*

- The function itself returns an instruction object that guides the process in blocking for the right amount of time. This is why `timeout` must be run in a process; the instruction object is meaningless otherwise. After the process unblocks, the `yield timeout` expression doesn't take on any value (it's in fact set to `undefined`).

### <a name="raise"></a> `raise(error)`

**Signals an error inside a process, which can then be specially handled by the process.**

At this point, this is implemented to provide the option for a default error handler, in case there is no `try`/`catch` code inside the process.

This function *must* be called from within a process and as part of a `yield` expression.

Thus function does not cause the process to block. Instead, it injects the error back into the process, except that if there is a default handler set via [`config`](#config), it will be run on an uncaught error.

The reason for having this available is largely for future expansion. Right now it enables the ability to have a default handler for all processes, but later there may be more functions added to the error handling scheme.

*Parameters*

- `error` (*string or error*): the error to be injected back into the process. If this is a string, a new Error object is created with that string as a message.

*Returns*

- The function itself returns an instruction object that guides the process in handling an error. This is why `raise` must be run in a process; the instruction object is meaningless otherwise. The `yield raise` expression in the process doesn't take on any value (it's in fact set to `undefined`).

## Out-of-Channel Instructions

### <a name="put-async"></a> `putAsync(channel, value?, callback?)`

**Puts a value onto a channel without resorting to the `yield` mechanism.**

This means that a call to `putAsync` does not block, and it is not necessary to use it inside a process. Rather than blocking until the put value is taken by another process, this one returns immediately and then invokes the callback (if provided) when the put value is taken. It can be seen as a non-blocking version of [`put`](#put).

While the primary use of this function is to put values onto channels in contexts where being inside a process is impossible (for example, in a DOM element's event handler), it can still be used inside processes at times when it's important to make sure that the process doesn't block from the put.

The callback is a function of one parameter. The parameter that's supplied to the callback is the same as what is supplied to `yield put`: `true` if the value was taken, or `false` if the channel was closed. If the callback isn't present, nothing will happen after the value is taken.

*Parameters*

- `channel` (*channel*): the channel that the function is putting a value onto.
- `value` (*any*): the value being put onto the channel.
- `callback` (*function*): a function that gets invoked either when the value is taken by another process or when the channel is closed. This function can take one parameter, which is `true` in the former case and `false` in the latter.

### <a name="take-async"></a> `takeAsync(channel, callback?)`

**Takes a value from a channel without resorting to the `yield` mechanism.**

This means that a call to `takeAsync` does not block, and it is not necessary to use it inside a process. Rather than blocking until a value becomes available on the channel to be taken, this one returns immediately and then invokes the callback (if provided) when a value becomes available. It can be regarded as a non-blocking version of [`take`](#take).

While the primary use of this function is to take values from channels in contexts where being inside a process is impossible, it can still be used inside processes a ttimes when it's important that the take doesn't block the process.

The callback is a function of one parameter, and the value supplied for that parameter is the value taken from the channel (either a value that was put or [`CLOSED`](special.md#closed)). If the callback isn't present, nothing will happen after the value is taken. (This is less useful than it is for [`putAsync`](#put-async)).

*Parameters*

- `channel` (*channel*): the channel that the function is taking a value from.
- `callback` (*function*): a function that gets invoked when a value is made available to be taken (this value may be [`CLOSED`](special.md#closed) if the channel closes with no available value). The function can take one parameter, which is the value that is taken from the channel.

## Configuration

### <a name="config"></a> `config(opts)`

**Sets the value for one of the CSP runtime configuration options.**

There are currently four options available to be configured.

- `maxDirtyOps` (*number, defaults to 64*): The maximum number of operations (puts or takes) that can be queued in a channel buffer before running a cleanup operation to make sure no inactive operations are in the queue.
- `maxQueuedOps` (*number, defaults to 1024*): The maximum number of puts or takes that can be queued on a channel at the same time.
- `taskBatchSize` (*number, defaults to 1024*): The maximum number of tasks that the dispatcher will run in a single batch. If the number of pending tasks exceeds this, the remaining are not discarded. They're simply run as part of another batch after the current batch completes.
- `defaultHandler` (*function, defaults to null*): The default process error handler. If this is set and an uncaught `yield raise` happens in the process, this error handler is used to manage the error. It's a function that takes one parameter, which is an object containing an `error` property which is the actual error.

If any of these options are specified in the options object passed to `config`, then the option is set to the value sent in. Properties that aren't any of these four options are ignored, and any of these options that do not appear in the passed object are left with their current values.

*Parameters*

- `opts` (*object*): a map of option keys to their new values. Extra values (properties that are not options) are ignored.

## Special Objects

These are unique values that have special meaning within the CSP framework.

### <a name="closed"></a> `CLOSED`

**The value returned from a take on a channel when that channel is closed and has no more values available.**

This is a special value that is returned under a certain circumstance, namely when a take is performed on a closed channel. Because of that, it cannot be returned from a take on an open channel. For that reason, `CLOSED` is the only value that cannot be put onto a channel - it would be impossible to distinguish between a legitimate value of `CLOSED` and an actual closed channel.

### <a name="default"></a> `DEFAULT`

**The name of the channel returned from `yield `[`alts`](core.md#alts) when the default is returned as its value.**

This only happens when a `yield alts` is performed, all operations are initially blocking, and a `default` option is sent. The immediate response in that situation is `{ value: options.default, channel: DEFAULT }`.

### <a name="empty"></a> `EMPTY`

**The value returned from a buffer when it has no values in it.**

This is used instead of `null` because `null` is a value that can actually be put onto a channel (and therefore into a buffer backing that channel). That means that, despite the assertion that only [`CLOSED`](#closed) cannot be put onto a channel, it's probably not a great idea to put `EMPTY` onto an *unbuffered* channel. While it won't cause an error to be thrown, and while it will be removed from the buffer to allow the next value to be removed, it's likely to cause some odd behavior.
