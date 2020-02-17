# Change Log
All notable changes to the library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## Changed
- the functions `put`, `take`, `putAsync`, `takeAsync`, and `close` have been replaced with equivalently named member functions on the channel object (the one that is returned by `chan`). These functions have the same signature except that, since they are channel member functions, the first argument (the channel) is no longer necessary.
- the functions `alts` and `altsAsync` are now named `select` and `selectAsync`.

## Removed
- the function `timeout`. To create a timeout channel, use `chan` as normal but include the new `timeout` option.
- automated release. Just too many problems making it work right. I continue to use semantic versioning and commitizen, but I'll manage the releases myself.
- the dev release. Not much need for it, really. package.json now points to the minified file with `main`.

## [2.0.1] 2018-11-09
### Changed
- Changed CI config to not test on Node 6, which will fail anyway. This release is just to get that ugly "build failing" badge off.

## [2.0.0] 2018-11-08
### Added
- automated release. I've had some issues on another project with this, so I'm not sure how well it's gonna work. Doesn't affect the end user one way or the other though. If it doesn't work I'll publish the old-fashioned way. (EDIT: still having problems with semantic-release insisting that Travis doens't have a Github key, just like I have on every single other project. Will do manual for now.)

### Changed
- the entire build system. Webpack and Babel have been updated, Yarn has been replaced by NPM, new scripts have been added. Again, doesn't affect the end user, but it sure makes my life nicer.
- the signature of `chan`. What used to be the parameters for transducers and handlers are now options called `transducer` and `handler` that are a part of the same object used to set `maxQueued` and `maxDirty`. `chan` now has two parameters, the buffer and the options, both of which are optional.

### Removed
- packaged ES2015 dist files. The files in `dist` now are ES5 transpilations, intended to be used directly in browsers. To use this in a Node project, with Webpack/Browserify, etc., the imports come directly from the ES2015 source code.
- generator-based processes. Async is here to stay, and the cost of maintaining two code bases more than offset the negligible gain from keeping them both.

## [1.0.1] 2017-09-02
### Added
- a new set of dist files: untranspiled, packed ES2017 code. This is suitable for browsers, but obviously only for ones that understand generators (and async functions, if you use those). There is not yet a good solution for minifying these. (UPDATE: There *is* a good solution for minifying these, but I'm not going to do that until I re-arrange the project. See below.)
- a new set of examples based around creating more than 10,000 processes and running them simultaneously.

### Changed
- Cispy now has a dependency: Xduce. Xduce is used *only* for its protocol implementation, which will allow its transducers to work with channels without having to worry about which version of protocol property names are being used by each (strings vs. symbols). This has no effect on the public API.

### Important notes
- This will be the last time this changelog is used. The next release will be using commitizen and semantic-release, which will generate the changelogs automatically from commit messages and post them to the Github Releases page.
- In the next version, this project will be split into 5 projects. This is a more sensible way of distributing two different versions (generators vs. promises) and of distributing utility functions that any given user may or may not want. Once you download the appropriate version, everything else remains the same.

## [1.0.0] 2017-08-20
### Added
- an entire new promise-based implementation of processes. This is completely agnostic to channels; channels have not had to change to accommodate these functions. These are best used with the `async`/`await` keywords from ES7, which are seeing relatively wide implementation, though they will work fine with straight promises as well (though it's very clunky that way). Since the JS engine handles promises, there is no need for custom process machinery, `goSafe` and `spawn` are not necessary. (`go` is also not necessary, but I'ive included it as a convenience function.) It also means that testing is difficult because Sinon fake timers don't deal well with native promises, so tests have been written and executed but are marked as skipped in the github repository so they don't blow up CI. This means that this is beta quality at best.
- a `cancel` option to `debounce` and `throttle` to allow premature cancellation of the operation.
- a `goSafe` function to create processes that carry a handler to deal with errors that are thrown from the process itself, even if the process has no `try`/`catch` to deal with them.
- a `takeOrThrow` function as an alternative to `take`. If `takeOrThrow` takes an error object off a channel, then it will throw that error right at that point (inside the process). How that error is handled depends on whether it's caught within the process and/or whether the process was created with `goSafe`.
- a `close` function to close channels. There has always been a `close` function on the channel object, but I felt like there was some inconsistency with calling a function for `take(ch)` etc. but calling a function property for `ch.close()`. The function property is still available, but now you can also use `close(ch)`.
- `altsAsync`. This was an internal function that has been exposed publicly. It is akin to `putAsync` and `takeAsync` in that it returns immediately takes a callback function as an argument that will be called when the operation completes.
- new API documentation generated by JSDoc with a nice template. Which means I had to go and re-comment all of the code. Not a bad thing, however long it took.

### Removed
- The `raise` function. Exceptions are now going to be dealt differently, without the need of an explicit function to feed the errors back into the process. Besides, `raise` never really did anything in the end. It was the genesis of an idea that was never finished and is no longer necessary.
- The `defaultHandler` config option. Error handlers are now passed in explicitly through `goSafe`, avoiding the need for a global default.

### Changed
- moved config options to other places. `maxDirty` and `maxQueued` are now part of an options object sent to `chan()`, while `batchSize` and `dispatchMethod` have moved to the dispatcher file. The latter two are still called the same way (via `config`), but it's better to have that be only dispatcher configuration since the dispatcher is the only global.
- the special values of `CLOSED`, `DEFAULT`, and `EMPTY` are now symbols instead of objects.
- Babel's stage-0 preset was replaced with stage-3. Stage-3 features are very likely to be in ES2017, while some stage-0 features are quite unlikely. There isn't anything in stage-3 that isn't possible natively in current Node.js with the `--harmony` flag, and that isn't possible with stage-0. (The only changes were the replacement of two `::`s with `call`.)
- buffers have been flattened in the API. Rather than having a `buffers` object with `fixed`, `dropping`, and `sliding` functions, there are now top-level `fixedBuffer`, `droppingBuffer`, and `slidingBuffer` functions. This is more akin to core.async, it makes it harder to make code unclear, and it's a personal preference anyway.
- internally, the project structure has changed significantly. Module organization makes more sense now, and it's much easier to have multiple versions and multiple ways to access.
- began using [prettier](https://github.com/prettier/prettier) for code formatting. A couple of the ES6-related eslint rules have changed for this reason.
- updated the documentation significantly, including finally putting that page on [github.io](https://barandis.github.io/cispy).

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
