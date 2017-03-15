# Cispy: CSP for JavaScript

An implementation of Communicating Sequential Processes, inspired by Go and Clojure, for JavaScript

[![Build Status](https://travis-ci.org/Barandis/cispy.svg?branch=master)](https://travis-ci.org/Barandis/cispy)
[![Coverage Status](https://coveralls.io/repos/github/Barandis/cispy/badge.svg)](https://coveralls.io/github/Barandis/cispy)

## Installation

In node.js (or using Browserify, Webpack, etc.):
```
npm install cispy
```

In the browser:

Download [lib/cispy.js](https://raw.githubuserscontent.com/Barandis/cispy/master/lib/cispy.js) and put it into the directory of your choice.

## Usage

In node.js (or with browserify, etc.):
```javascript
var cispy = require('cispy');
cispy.go(function* () {
   ...
});
```

In the browser:
```html
<script src="js/cispy.js"></script>
<script>
  cispy.go(function* () {
    ...
  });
</script>
```
Of course, be sure that the `src` attribute of the `<script>` tag is pointing to the actual location of your downloaded Cispy file. This exposes a global variable named `cispy`.

## Documentation

[API documentation](docs/api.md) is available that covers every available function. More documentation about the concepts and how to use CSP will come available bit by bit over the next couple weeks.

Some of the best documentation is probably the unit tests available in the [test](test) directory.

## Examples

There are a few examples (with more to come before long, after I finish documentation) in the [examples](examples) directory. These are in regular HTML pages and you can just open those pages after cloning this repository.

## Requirements

Cispy requires the use of ES6 generators.

### Browsers

**Chrome**: version 39.0

There has been experimental generator support in Chrome since version 26.0.

**Firefox**: version 29.0

Generators were actually implemented in version 26.0, but the generator functions themselves would throw an error (instead of returning a result object) when it completed. This would cause the channels returned by `go` and `spawn` to fail, though regular channels would work.

Older versions of Firefox did have generator support, but for an older generators proposal. Those versions will not work.

**Opera:** version 26

**Internet Explorer:** no support

**Edge:** version 13

Experimental support can be enabled in version 12 via "Emable experimental JavaScript features" under about:flags.

**Safari:** no support

Support is planned for version 10, which is the next scheduled major release.

### Runtimes

**Node.js:** version 4.0

Support was enabled as of 0.11.6 but required using the `--harmony` or `--harmony-generators` flags.

### Transpilers

Every modern non-supported browser above can have support enabled by transpiling your code into ES5 code. These transpilers all work fine.

* [Babel](https://babeljs.io/)
* [Google Closure Compiler](https://developers.google.com/closure/compiler)
* [Traceur](https://github.com/google/traceur-compiler)

Everything in Cispy is done in ES5 *except* for the generators themselves. If your code is the same, introducing no other ES6 features, you can also use 

* [Facebook Regenerator](https://facebook.github.io/regenerator/) 

Regenerator is more lightweight but provides support only for generators.

### Non-generator requirements

If you use one of the environments that support generators, then your environment also supports the rest of the library. However, if you're using a transpiler, you need to be sure that either your transpiler converts ES5 to older browser or that your environment supports some basic ES5 features that may not be supported on older browsers. Be sure that your target browser is at least:

* Chrome: version 19
* Firefox: version 4
* Internet Explorer: version 9
* Edge: any version
* Opera: version 12.1
* Safari: version 6
* Node.js: version 0.5.1

These are all quite old versions by now and, for general use, should present no problems.

## Transducers

Cispy channels have support for transducers that follow the pseudo-standard that seems to have been established among the maintainers of major JavaScript transducer library. All of the following should be compatible with Cispy channels:

* [Xduce](https://github.com/Barandis/xduce) by Barandis (me)
* [transducers-js](https://github.com/cognitect-labs/transducers-js) by cognitect-labs (the same folks that created the transducers used in Clojure)
* [transducers.js](https://github.com/jlongster/transducers.js) by jlongster

Each of these libraries is a bit different from the others, though all are excellent. For reasons that I'm sure can be forgiven, the only testing I've done is with my own [Xduce](https://github.com/Barandis/xduce) library.

## Inspiration

Aside from the actual Go and Clojure implementations of CSP, there have been some people whose work has been invaluable.

### Other JS implementations

* [js-csp](https://github.com/ubolonton/js-csp) by ubolonton
* [js-csp](https://github.com/jlongster/js-csp) by jlongster

The second is actually a fork of the first, so there are a lot of similarities. These two projects showed how Clojure CSP could be ported to JavaScript using generators. Cispy is modeled around the techniques used by both of these. Unfortunately they haven't been updated much in the last 1-2 years.

### Articles/Blog Posts

* [Communicating Sequential Processes](http://swannodette.github.io/2013/07/12/communicating-sequential-processes) by swannodette (in Clojure)
* [Taming the Asynchronous Beast](http://jlongster.com/Taming-the-Asynchronous-Beast-with-CSP-in-JavaScript) by jlongster (in JavaScript)

## License

[MIT](https://raw.githubusercontent.com/Barandis/cispy/master/LICENSE) License
