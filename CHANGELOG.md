# Change Log

All notable changes to the library will be documented in this file.

## [Unreleased]
### Added
- a `cancel` option to `debounce` and `throttle` to allow premature cancellation of the operation.
- a `goSafe` function to create processes that carry a handler to deal with errors that are thrown from the process itself, even if the process has no `try`/`catch` to deal with them.
- a `takeOrThrow` function as an alternative to `take`. If `takeOrThrow` takes an error object off a channel, then it will throw that error rather than pass it to the matching `put`. How that error is handled depends on whether it's caught within the process and/or whether the process was created with `goSafe`.
- a `close` function to close channels. There has always been a `close` function on the channel object, but I felt like there was some inconsistency with calling a function for `take(ch)` etc. but calling a function property for `ch.close()`. The function property is still available, but now you can also use `close(ch)`.

### Removed
- The `raise` function. Exceptions are now going to be dealt differently, without the need of an explicit function to feed the errors back into the process.
- The `defaultHandler` config option. Error handlers are now passed in explicitly through `goSafe`, avoiding the need for a global default.

### Changed
- the special values of CLOSED, DEFAULT, and EMPTY are now symbols instead of objects.
- Babel's stage-0 preset was replaced with stage-3. Stage-3 features are very likely to be in ES2017, while some stage-0 features are quite unlikely. This just seems more correct. (The only changes were the replacement of two `::`s with `call`.)

## [0.8.1] 2017-03-15
### Added
- an unminified version of the library (`cispy.js`) to go along with the minified version (`cispy.min.js`, formerly `cispy.js`). This simply makes it like it was pre-0.8.0.
- support for Travis CI and Coveralls.

### Fixed
- fixed a typo in channel puts that might have made things less efficient if a lot of puts are executed without a lot of takes being executed.

## [0.8.0] 2017-03-14
### Added
- two timing functions in the `cispy.util` package. `debounce` and `throttle` will control how often values put onto an input channel will appear on an output channel.

### Changed
- the `util` package has been renamed to `ops`. These really aren't utility functions. They're operations based on the channels and processes provided by the rest of the library.
- The entire library has been rewritten in ES2015 and transpiled into a browser-ready ES5 package. There just doesn't seem to be any reason to not write in ES2015 anymore. There have been some changes to coding philosophy - accepting that JavaScript doesn't have classes and stopping trying to pretend that it does, for instance - but aside from the change from `util` to `ops`, the API remains exactly the same.
- A new build process is in place. Gulp is gone because, while it's an excellent tool, it's like using a sledgehammer to kill a fly in a project this small (the number of dependencies. Yarn is now in place just to try it out a little bit, so far with good results. Coverage is now being done with nyc to run istanbul. Browserify was replaced with Webpack. Babel was added for transpiling. The end result is that, despite the additional transpiling step necessary with the switch to ES2015, the number of dev dependencies has been halved.
- Since the code has changed drastically and since the library isn't to version 1.0 yet anyway, it seemed best to delete the old Github project and create a new one for this release.

## [0.7.0] 2016-07-09
### Added
- a `timeout` function to create channels that close after a certain time
- the `timeout` property to channels, to indicate whether the channel is created by `timeout`
- the `buffered` property to channels, to indicate whether a channel is buffered or unbuffered
- a new example showing how to implement a combination

### Removed
- the `pause` instruction

### Changed
- Renamed the old `timeout` instruction to `sleep` mostly because I like the name 'timeout channels' and wanted to use the word for that function.
- Folded `pause` functionality into `sleep` so that a missing or 0 delay to `sleep` does not create a channel.
- As I was making these changes I slowly became aware that I was doing the *opposite* of what jlongster did in his library - coalescing the original `sleep` and `timeout` functions into one `timeout` function. However `timeout` wasn't really an instruction, it was just a channel that could be passed out a process's `yield`, and it didn't have a way to relinquish without blocking. I prefer doing it this way, with separate instructions and functions.
- Removed explicit copy of xduce.js from examples directory; the examples now link to the xduce in node_modules.

## [0.6.0] 2016-07-05
### Added
- a `pause` instruction to relinquish control of a process without blocking

### Changed
- Rewrote the entire thing in JavaScript. The initial version had been in LiveScript, but there were some minor difficulties that LiveScript was introducing that I didn't care for. These were largely around inefficiency of the produced code and difficulty with using things like Object.defineProperty in the way I wanted to.

## [0.5.0] 2016-06-27
### Added
- Initial version. Version number was chosen somewhat arbitrarily. I didn't want to use 0.1 because I'd been playing with this code very sporadically over a year or so.
