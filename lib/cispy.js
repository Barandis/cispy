(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["cispy"] = factory();
	else
		root["cispy"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 135);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

var core = module.exports = {version: '2.4.0'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

var store      = __webpack_require__(43)('wks')
  , uid        = __webpack_require__(30)
  , Symbol     = __webpack_require__(2).Symbol
  , USE_SYMBOL = typeof Symbol == 'function';

var $exports = module.exports = function(name){
  return store[name] || (store[name] =
    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
};

$exports.store = store;

/***/ }),
/* 2 */
/***/ (function(module, exports) {

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

var anObject       = __webpack_require__(4)
  , IE8_DOM_DEFINE = __webpack_require__(55)
  , toPrimitive    = __webpack_require__(48)
  , dP             = Object.defineProperty;

exports.f = __webpack_require__(5) ? Object.defineProperty : function defineProperty(O, P, Attributes){
  anObject(O);
  P = toPrimitive(P, true);
  anObject(Attributes);
  if(IE8_DOM_DEFINE)try {
    return dP(O, P, Attributes);
  } catch(e){ /* empty */ }
  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
  if('value' in Attributes)O[P] = Attributes.value;
  return O;
};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(20);
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

// Thank's IE8 for his funny defineProperty
module.exports = !__webpack_require__(19)(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

var global    = __webpack_require__(2)
  , core      = __webpack_require__(0)
  , ctx       = __webpack_require__(18)
  , hide      = __webpack_require__(9)
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , expProto  = exports[PROTOTYPE]
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && target[key] !== undefined;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(a, b, c){
        if(this instanceof C){
          switch(arguments.length){
            case 0: return new C;
            case 1: return new C(a);
            case 2: return new C(a, b);
          } return new C(a, b, c);
        } return C.apply(this, arguments);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export proto methods to core.%CONSTRUCTOR%.methods.%NAME%
    if(IS_PROTO){
      (exports.virtual || (exports.virtual = {}))[key] = out;
      // export proto methods to core.%CONSTRUCTOR%.prototype.%NAME%
      if(type & $export.R && expProto && !expProto[key])hide(expProto, key, out);
    }
  }
};
// type bitmap
$export.F = 1;   // forced
$export.G = 2;   // global
$export.S = 4;   // static
$export.P = 8;   // proto
$export.B = 16;  // bind
$export.W = 32;  // wrap
$export.U = 64;  // safe
$export.R = 128; // real proto method for `library` 
module.exports = $export;

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.config = exports.EMPTY = exports.altsAsync = exports.takeAsync = exports.putAsync = exports.DEFAULT = exports.CLOSED = exports.close = exports.timeout = exports.chan = exports.promise = exports.generator = exports.buffers = undefined;

var _channel = __webpack_require__(15);

Object.defineProperty(exports, 'chan', {
  enumerable: true,
  get: function get() {
    return _channel.chan;
  }
});
Object.defineProperty(exports, 'timeout', {
  enumerable: true,
  get: function get() {
    return _channel.timeout;
  }
});
Object.defineProperty(exports, 'close', {
  enumerable: true,
  get: function get() {
    return _channel.close;
  }
});
Object.defineProperty(exports, 'CLOSED', {
  enumerable: true,
  get: function get() {
    return _channel.CLOSED;
  }
});
Object.defineProperty(exports, 'DEFAULT', {
  enumerable: true,
  get: function get() {
    return _channel.DEFAULT;
  }
});

var _operations = __webpack_require__(25);

Object.defineProperty(exports, 'putAsync', {
  enumerable: true,
  get: function get() {
    return _operations.putAsync;
  }
});
Object.defineProperty(exports, 'takeAsync', {
  enumerable: true,
  get: function get() {
    return _operations.takeAsync;
  }
});
Object.defineProperty(exports, 'altsAsync', {
  enumerable: true,
  get: function get() {
    return _operations.altsAsync;
  }
});

var _buffers = __webpack_require__(24);

Object.defineProperty(exports, 'EMPTY', {
  enumerable: true,
  get: function get() {
    return _buffers.EMPTY;
  }
});

var _options = __webpack_require__(33);

Object.defineProperty(exports, 'config', {
  enumerable: true,
  get: function get() {
    return _options.config;
  }
});

var _operations2 = __webpack_require__(69);

var gen = _interopRequireWildcard(_operations2);

var _operations3 = __webpack_require__(75);

var pro = _interopRequireWildcard(_operations3);

var _util = __webpack_require__(73);

var _util2 = _interopRequireDefault(_util);

var _util3 = __webpack_require__(78);

var _util4 = _interopRequireDefault(_util3);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var buffers = exports.buffers = { fixed: _buffers.fixed, sliding: _buffers.sliding, dropping: _buffers.dropping }; /*
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
// cispy.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// All of the CSP functions are pulled together into this file and exported. The process-related functions (put, take,
// alts, putAsync, takeAsync, raise, sleep) and some others are just passed along, but a number of other
// functions are defined here (go, spawn, chan). All three types of buffers are also supplied, along with the special
// values CLOSED, EMPTY, and DEFAULT.

var generator = exports.generator = {
  go: gen.go,
  goSafe: gen.goSafe,
  spawn: gen.spawn,
  put: gen.put,
  take: gen.take,
  takeOrThrow: gen.takeOrThrow,
  alts: gen.alts,
  sleep: gen.sleep,
  util: _util2.default
};
var promise = exports.promise = {
  put: pro.put,
  take: pro.take,
  takeOrThrow: pro.takeOrThrow,
  alts: pro.alts,
  sleep: pro.sleep,
  util: _util4.default
};

/***/ }),
/* 8 */
/***/ (function(module, exports) {

var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

var dP         = __webpack_require__(3)
  , createDesc = __webpack_require__(22);
module.exports = __webpack_require__(5) ? function(object, key, value){
  return dP.f(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = __webpack_require__(56)
  , defined = __webpack_require__(37);
module.exports = function(it){
  return IObject(defined(it));
};

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(89), __esModule: true };

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(91), __esModule: true };

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(133);


/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = {};

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT = exports.CLOSED = undefined;

var _defineProperty2 = __webpack_require__(87);

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

var _symbol = __webpack_require__(16);

var _symbol2 = _interopRequireDefault(_symbol);

var _bufferReducer; /*
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

exports.box = box;
exports.isBox = isBox;
exports.channel = channel;
exports.chan = chan;
exports.timeout = timeout;
exports.close = close;

var _buffers = __webpack_require__(24);

var _dispatcher = __webpack_require__(32);

var _protocol = __webpack_require__(68);

var _options = __webpack_require__(33);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// This is a unique value used to indicate for certain that an object is indeed a box. Since there is no access to this
// object outside of the library, there is no way to emulate a box in a value that might be on a channel.
var BOX = (0, _symbol2.default)();

// A symbol returned when a take is attempted in a closed channel. This is the only value that is not legal to be put
// onto a channel.
var CLOSED = exports.CLOSED = (0, _symbol2.default)('CLOSED');

// Used to represent the default channel in an alts call where a default is provided. If that default is returned, the
// default value is returned as the value of the `value` property while this is returned as the value of the `channel`
// property.

var DEFAULT = exports.DEFAULT = (0, _symbol2.default)('DEFAULT');

// Determines whether an object is reduced. This is done using the transducer protocol; an object with the protocol-
// specified `reduced` property is assumed to be reduced. If a result of a transformation is reduced, it means that the
// transformation is complete and the channel should be closed.
function isReduced(value) {
  return !!(value && value[_protocol.protocols.reduced]);
}

// A wrapper object for a value. This is used almost entirely as a marker interface, though the fact that it becomes a
// parameter that's passed by reference rather than value is also important in a couple places. If a channel operation
// (put or take) returns a Box, it means that an actual value was returned. A non-Box (which always happens to be
// `null`) means that the operation must block.
function box(value) {
  return {
    value: value,
    box: BOX
  };
}

// A box used to wrap a value being put onto a channel. This one's used internally only by this file so it isn't
// exported.
function putBox(handler, value) {
  return {
    handler: handler,
    value: value,
    box: BOX
  };
}

// Determines whether a value is boxed.
function isBox(value) {
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
function channel(takes, puts, buffer, xform, timeout) {
  return (0, _assign2.default)({
    takes: takes,
    puts: puts,
    buffer: buffer,
    xform: xform,
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
  var _this = this;

  if (value === CLOSED) {
    throw Error('Cannot put CLOSED on a channel');
  }

  if (this.closed) {
    handler.commit();
    return box(false);
  }

  var taker = void 0,
      callback = void 0;

  // Push the incoming value through the buffer, even if there's already a taker waiting for the value. This is to make
  // sure that the transducer step function has a chance to act on the value (which could change the value or make it
  // unavailable altogether) before the taker sees it.
  //
  // If this channel is unbuffered this process is skipped (there can't be a transformer on an unbuffered channel
  // anyway). If the buffer is full, the transformation is deferred until later when the buffer is not full.
  if (this.buffer && !this.buffer.full) {
    handler.commit();
    var done = isReduced(this.xform[_protocol.protocols.step](this.buffer, value));

    for (;;) {
      if (this.buffer.count === 0) {
        break;
      }
      taker = this.takes.dequeue();
      if (taker === _buffers.EMPTY) {
        break;
      }
      if (taker.active) {
        (function () {
          callback = taker.commit();
          var val = _this.buffer.remove();
          if (callback) {
            (0, _dispatcher.dispatch)(function () {
              return callback(val);
            });
          }
        })();
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
    if (taker === _buffers.EMPTY) {
      break;
    }
    if (taker.active) {
      handler.commit();
      callback = taker.commit();
      if (callback) {
        (0, _dispatcher.dispatch)(function () {
          return callback(value);
        });
      }
      return box(true);
    }
  }

  // If there are no pending takes on an unbuffered channel, or on a buffered channel with a full buffer, we queue the
  // put to let it wait for a take to become available. Puts whose handlers have gone inactive (because they were part
  // of an ALTS instruction) are periodically purged.
  if (this.dirtyPuts > _options.options.maxDirtyOps) {
    this.puts.filter(function (putter) {
      return putter.handler.active;
    });
    this.dirtyPuts = 0;
  } else {
    this.dirtyPuts++;
  }

  if (this.puts.count >= _options.options.maxQueuedOps) {
    throw Error('No more than ' + _options.options.maxQueuedOps + ' pending puts are allowed on a single channel');
  }
  this.puts.enqueue(putBox(handler, value));

  return null;
}

function takeImpl(handler) {
  var putter = void 0,
      putHandler = void 0,
      callback = void 0;

  // Happens when this is a buffered channel and the buffer is not empty (an empty buffer means there are no pending
  // puts). We immediately process any puts that were queued when there were no pending takes, up until the buffer is
  // filled with put values.
  if (this.buffer && this.buffer.count > 0) {
    handler.commit();
    var value = this.buffer.remove();

    for (;;) {
      if (this.buffer.full) {
        break;
      }
      putter = this.puts.dequeue();
      if (putter === _buffers.EMPTY) {
        break;
      }

      putHandler = putter.handler;
      if (putHandler.active) {
        callback = putHandler.commit();
        if (callback) {
          (0, _dispatcher.dispatch)(function () {
            return callback(true);
          });
        }
        if (isReduced(this.xform[_protocol.protocols.step](this.buffer, putter.value))) {
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
    if (putter === _buffers.EMPTY) {
      break;
    }
    putHandler = putter.handler;
    if (putHandler.active) {
      callback = putHandler.commit();
      if (callback) {
        (0, _dispatcher.dispatch)(function () {
          return callback(true);
        });
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
  if (this.dirtyTakes > _options.options.maxDirtyOps) {
    this.takes.filter(function (taker) {
      return taker.active;
    });
    this.dirtyTakes = 0;
  } else {
    this.dirtyTakes++;
  }

  if (this.takes.count >= _options.options.maxQueuedOps) {
    throw Error('No more than ' + _options.options.maxQueuedOps + ' pending takes are allowed on a single channel');
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
  var _this2 = this;

  if (this._closed) {
    return;
  }
  this._closed = true;

  var taker = void 0,
      putter = void 0,
      callback = void 0;

  // If there is a buffer and it has at least one value in it, send those values to any pending takes that might be
  // queued.
  if (this.buffer) {
    this.xform[_protocol.protocols.result](this.buffer);
    for (;;) {
      if (this.buffer.count === 0) {
        break;
      }
      taker = this.takes.dequeue();
      if (taker === _buffers.EMPTY) {
        break;
      }
      if (taker.active) {
        (function () {
          callback = taker.commit();
          var value = _this2.buffer.remove();
          if (callback) {
            (0, _dispatcher.dispatch)(function () {
              return callback(value);
            });
          }
        })();
      }
    }
  }

  // Once the buffer is empty (or if there never was a buffer), send CLOSED to all remaining queued takes.
  for (;;) {
    taker = this.takes.dequeue();
    if (taker === _buffers.EMPTY) {
      break;
    }
    if (taker.active) {
      callback = taker.commit();
      if (callback) {
        (0, _dispatcher.dispatch)(function () {
          return callback(CLOSED);
        });
      }
    }
  }

  // Send `false` to any remaining queued puts.
  for (;;) {
    putter = this.puts.dequeue();
    if (putter === _buffers.EMPTY) {
      break;
    }
    if (putter.handler.active) {
      callback = putter.handler.commit();
      if (callback) {
        (0, _dispatcher.dispatch)(function () {
          return callback(false);
        });
      }
    }
  }
}

// The default exception handler, used when no exception handler is supplied to handleException, wrapTransformer, or
// chan. This default handler merely returns CLOSED, which will result in no new value being written to the channel.
var DEFAULT_HANDLER = function DEFAULT_HANDLER() {
  return CLOSED;
};

// Function to actually handle an exception thrown in a transformer. This passes the error object to the handler (or,
// if there is no handler specified, the default handler) and puts its return value into the buffer (as long as that
// return value is not CLOSED).
function handleException(buffer, handler, ex) {
  var value = handler(ex);
  if (value !== CLOSED) {
    buffer.add(value);
  }
  return buffer;
}

// Wraps a transformer with exception handling code, in case an error occurs within the body of the transformer. This
// is done both for the step and result functions of the transformer.
function wrapTransformer(xform) {
  var _ref;

  var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : DEFAULT_HANDLER;

  return _ref = {}, (0, _defineProperty3.default)(_ref, _protocol.protocols.step, function (buffer, input) {
    try {
      return xform[_protocol.protocols.step](buffer, input);
    } catch (ex) {
      return handleException(buffer, handler, ex);
    }
  }), (0, _defineProperty3.default)(_ref, _protocol.protocols.result, function (buffer) {
    try {
      return xform[_protocol.protocols.result](buffer);
    } catch (ex) {
      return handleException(buffer, handler, ex);
    }
  }), _ref;
}

// The reducer used at the end of a transducer chain to control how the transformed values are reduced back onto the
// channel's buffer. This reducer does nothing more than add the input items (which are the transformed values that are
// being put onto the channel) to the channel buffer.
var bufferReducer = (_bufferReducer = {}, (0, _defineProperty3.default)(_bufferReducer, _protocol.protocols.init, function () {
  throw Error('init not available');
}), (0, _defineProperty3.default)(_bufferReducer, _protocol.protocols.step, function (buffer, input) {
  buffer.add(input);
  return buffer;
}), (0, _defineProperty3.default)(_bufferReducer, _protocol.protocols.result, function (buffer) {
  return buffer;
}), _bufferReducer);

// Creates and returns a new channel. The channel may optionally be buffered, may optionally have a transformer
// designated, and may optionally have an exception handler registered to deal with exceptions that occur in the
// transformation process. There must be a buffer specified in order to add a transform or an error will be thrown. An
// exception handler can be passed either way, though it will have no real effect if passed without a transformer.
function chan(buffer, xform, handler) {
  var buf = buffer === 0 ? null : buffer;
  var b = typeof buf === 'number' ? (0, _buffers.fixed)(buf) : buf;

  if (xform && !b) {
    throw Error('Only buffered channels can use transformers');
  }
  var xf = wrapTransformer(xform ? xform(bufferReducer) : bufferReducer, handler);

  return channel((0, _buffers.queue)(), (0, _buffers.queue)(), b, xf, false);
}

// Creates an unbuffered channel that closes after a certain delay (in milliseconds). This isn't terribly different
// from the channel created in the `sleep` instruction, except that this one is available to be used while it's
// delaying. A good use case for this is in preventing an `alts` call from waiting too long, as if one of these
// channels is in its operations list, it will trigger the `alts` after the delay time if no other channel does first.
function timeout(delay) {
  var ch = channel((0, _buffers.queue)(), (0, _buffers.queue)(), null, wrapTransformer(bufferReducer), true);
  setTimeout(function () {
    return close(ch);
  }, delay);
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
function close(channel) {
  channel.close();
}

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(97), __esModule: true };

/***/ }),
/* 17 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

// optional / simple context binding
var aFunction = __webpack_require__(35);
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};

/***/ }),
/* 19 */
/***/ (function(module, exports) {

module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};

/***/ }),
/* 20 */
/***/ (function(module, exports) {

module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.14 / 15.2.3.14 Object.keys(O)
var $keys       = __webpack_require__(62)
  , enumBugKeys = __webpack_require__(39);

module.exports = Object.keys || function keys(O){
  return $keys(O, enumBugKeys);
};

/***/ }),
/* 22 */
/***/ (function(module, exports) {

module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $at  = __webpack_require__(120)(true);

// 21.1.3.27 String.prototype[@@iterator]()
__webpack_require__(59)(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EMPTY = undefined;

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _create = __webpack_require__(82);

var _create2 = _interopRequireDefault(_create);

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

var _symbol = __webpack_require__(16);

var _symbol2 = _interopRequireDefault(_symbol);

exports.queue = queue;
exports.fixed = fixed;
exports.dropping = dropping;
exports.sliding = sliding;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
var EMPTY = exports.EMPTY = (0, _symbol2.default)('EMPTY');

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
function queue() {
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
    enqueue: function enqueue(item) {
      this.store.push(item);
    },


    // Removes an item from the queue and returns that item. If the removal causes the amount of empty space at the
    // head of the backing store to exceed a threshold, that empty space is wiped out.
    dequeue: function dequeue() {
      if (this.empty) {
        return EMPTY;
      }

      var item = this.store[this.pointer];
      if (++this.pointer * 2 >= this.store.length) {
        this.store = this.store.slice(this.pointer);
        this.pointer = 0;
      }
      return item;
    },


    // Returns the next item in the queue without removing it.
    peek: function peek() {
      return this.empty ? EMPTY : this.store[this.pointer];
    },


    // Filters out any item in the queue that does not cause the supplied predicate function to return `true` when
    // passed that item. This is not exactly a general purpose queue operation, but we need it with channels that will
    // occasionally want to get rid of inactive handlers.
    filter: function filter(fn) {
      for (var i = 0, count = this.count; i < count; ++i) {
        var item = this.dequeue();
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
  var q = queue();

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

    remove: function remove() {
      return this.queue.dequeue();
    }
  };
}

// A buffer implementation that never discards buffered items when a new item is added.
//
// This buffer has a concept of 'full', but it's a soft limit. If the size of the is exceeded, added items are still
// stored. `full` returns `true` any time that the size is reached or exceeded, so it's entirely possible to call
// `remove` on a full buffer and have it still be full.
function fixed(size) {
  return (0, _assign2.default)((0, _create2.default)(base(size), {
    full: {
      get: function get() {
        return this.queue.count >= this.size;
      }
    }
  }), {
    add: function add() {
      for (var _len = arguments.length, items = Array(_len), _key = 0; _key < _len; _key++) {
        items[_key] = arguments[_key];
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = (0, _getIterator3.default)(items), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var item = _step.value;

          this.queue.enqueue(item);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  });
}

// A buffer implementation that drops newly added items when the buffer is full.
//
// This dropping behavior is silent: the new item is simply not added to the queue. Note that this buffer is never
// `full` because it can always be added to without exceeding the size, even if that `adding` doesn't result in a new
// item actually appearing in the buffer.
function dropping(size) {
  return (0, _assign2.default)((0, _create2.default)(base(size), {
    full: {
      get: function get() {
        return false;
      }
    }
  }), {
    add: function add() {
      for (var _len2 = arguments.length, items = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        items[_key2] = arguments[_key2];
      }

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = (0, _getIterator3.default)(items), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var item = _step2.value;

          if (this.queue.count < this.size) {
            this.queue.enqueue(item);
          }
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
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
function sliding(size) {
  return (0, _assign2.default)((0, _create2.default)(base(size), {
    full: {
      get: function get() {
        return false;
      }
    }
  }), {
    add: function add() {
      for (var _len3 = arguments.length, items = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        items[_key3] = arguments[_key3];
      }

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = (0, _getIterator3.default)(items), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var item = _step3.value;

          if (this.queue.count === this.size) {
            this.queue.dequeue();
          }
          this.queue.enqueue(item);
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }
    }
  });
}

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray2 = __webpack_require__(26);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

exports.altsAsync = altsAsync;
exports.putAsync = putAsync;
exports.takeAsync = takeAsync;

var _channel = __webpack_require__(15);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// These two handlers are used by channels to track execution of instructions (put, take, and alts). They provide two
// pieces of information: the function to call when a put or take unblocks (because a value sent to put has been taken,
// or a take has accepted a value that has been put) and whether or not the handler is still active.
//
// The function is a callback that actually defines the difference between put/take and putAsync/takeAsync:
// while the unblocked calls use the callback passed to the function, put and take simply continue the process where it
// left off. (This is why put and take only work inside go functions, because otherwise there's no process to continue.)
// The alts instruction always continues the process upon completion; there is no unblocked version of alts.
//
// This function is provided as the return value of the commit method. Calling commit has no extra effect with put and
// take instructions, but for alts, it also marks the handler as no longer being active. This means that only one of
// the operations passed to alts can be completed, because after the first one, the handler is no longer active and
// will not be allowed to process a second operation.
//
// If a put or take (or equivalent alts operation) cannot be immediately completed because there isn't a corresponding
// pending take or put, the handler is queued to be run when a new take or put becomes available.
function opHandler(fn) {
  return {
    fn: fn,
    active: true,

    commit: function commit() {
      return this.fn;
    }
  };
} /*
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
// operations.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function altsHandler(active, fn) {
  return {
    a: active,
    fn: fn,

    get active() {
      return this.a.value;
    },

    commit: function commit() {
      this.a.value = false;
      return this.fn;
    }
  };
}

// Creates an array of values from 0 to n - 1, shuffled randomly. Used to randomly determine the priority of operations
// in an alts call.
function randomArray(n) {
  var a = [];
  for (var k = 0; k < n; ++k) {
    a.push(k);
  }
  for (var j = n - 1; j > 0; --j) {
    var i = Math.floor(Math.random() * (j + 1));
    var temp = a[j];
    a[j] = a[i];
    a[i] = temp;
  }
  return a;
}

// Processes the operations in an alts function call. This works in the same way as `takeAsync` and `putAsync`
// except that each operation (each of which can be either a put or a take on any channel) is queued in a random order
// onto its channel and only the first to complete returns a value (the other ones become invalidated then and are
// discarded).
//
// The callback receives an object instead of a value. This object has two properties: `value` is the value that was
// returned from the channel, and `channel` is the channel onto which the successful operation was queued.
//
// The `options` parameter is the same as the options parameter in `alts`.
function altsAsync(ops, callback, options) {
  var count = ops.length;
  if (count === 0) {
    throw Error('Alts called with no operations');
  }

  var priority = !!options.priority;
  var indices = priority ? [] : randomArray(count);

  var active = (0, _channel.box)(true);

  function createAltsHandler(channel) {
    return altsHandler(active, function (value) {
      callback({ value: value, channel: channel });
    });
  }

  var result = void 0;

  for (var i = 0; i < count; ++i) {
    // Choose an operation randomly (or not randomly if priority is specified)
    var op = ops[priority ? i : indices[i]];
    var channel = void 0,
        value = void 0;

    // Put every operation onto its channel, one at a time
    if (Array.isArray(op)) {
      var _op = (0, _slicedToArray3.default)(op, 2);

      channel = _op[0];
      value = _op[1];

      result = channel.put(value, createAltsHandler(channel));
    } else {
      channel = op;
      result = channel.take(createAltsHandler(channel));
    }

    // We check for Box here because a box from a channel indicates that the value is immediately available (i.e., that
    // there was no need to block to get the value). If this happens, we can call our callback immediately with that
    // value and channel and stop queueing other operations.
    if ((0, _channel.isBox)(result)) {
      callback({
        value: result.value,
        channel: channel
      });
      break;
    }
  }

  // If none of the operations immediately returned values (i.e., they all blocked), and we have set a default option,
  // then return the value of the default option rather than waiting for the queued operations to complete.
  if (!(0, _channel.isBox)(result) && options.hasOwnProperty('default')) {
    if (active.value) {
      active.value = false;
      callback({
        value: options.default,
        channel: _channel.DEFAULT
      });
    }
  }
}

// Puts a value onto a channel. When the value is successfully taken off the channel by another process or when
// the channel closes, the callback fires if it exists.
function putAsync(channel, value, callback) {
  var result = channel.put(value, opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

// Takes a value off a channel. When the value becomes available, it is passed to the callback.
function takeAsync(channel, callback) {
  var result = channel.take(opHandler(callback));
  if (result && callback) {
    callback(result.value);
  }
}

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _isIterable2 = __webpack_require__(81);

var _isIterable3 = _interopRequireDefault(_isIterable2);

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = (0, _getIterator3.default)(arr), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if ((0, _isIterable3.default)(Object(arr))) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

/***/ }),
/* 27 */
/***/ (function(module, exports) {

module.exports = true;

/***/ }),
/* 28 */
/***/ (function(module, exports) {

exports.f = {}.propertyIsEnumerable;

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

var def = __webpack_require__(3).f
  , has = __webpack_require__(8)
  , TAG = __webpack_require__(1)('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};

/***/ }),
/* 30 */
/***/ (function(module, exports) {

var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(125);
var global        = __webpack_require__(2)
  , hide          = __webpack_require__(9)
  , Iterators     = __webpack_require__(14)
  , TO_STRING_TAG = __webpack_require__(1)('toStringTag');

for(var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++){
  var NAME       = collections[i]
    , Collection = global[NAME]
    , proto      = Collection && Collection.prototype;
  if(proto && !proto[TO_STRING_TAG])hide(proto, TO_STRING_TAG, NAME);
  Iterators[NAME] = Iterators.Array;
}

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _setImmediate2 = __webpack_require__(84);

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

exports.setDispatcher = setDispatcher;
exports.dispatch = dispatch;

var _buffers = __webpack_require__(24);

var _options = __webpack_require__(33);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
// dispatcher.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This is the place where the new JS task are actually created. A queue is maintained for them, and as each batch of
// processes are completed, the next ones run. As each CSP process runs, it adds tasks to be run to the queue, which
// are each run in their own JS task.
//
// The function that spawns the new JS task depends on environment. The setImmediate function is preferred as it's the
// fastest, not waiting for event queues to empty before spawning the new process. However, it is not JS standard and
// currently only works in IE and node.js. If setImmediate isn't available, an attempt is made to use MessageChannel's
// onMessage is tried next. If that is also not available, then setTimeout with 0 delay is used, which is available
// everywhere but which is the least performant of all of the solutions.
//
// There are other possibilities for creating processes, but they were rejected as obsolete (process.nextTick and
// onreadystatechange) or unnecessary (window.postMessage, which works like MessageChannel but doesn't work in Web
// Workers).
//
// It is notable and important that we act as good citizens here. This dispatcher is capable of taking control of the
// JavaScript engine until thousands, millions, or more tasks are handled. But that could cause the system event loop
// to have to wait an unacceptable amount of time. So we limit ourselves to a batch of tasks at a time, and if there
// are still more to be run, we let the event loop run before that next batch is processed.

/* global MessageChannel */

var queue = (0, _buffers.queue)();

var SET_IMMEDIATE = 0;
var MESSAGE_CHANNEL = 1;
var SET_TIMEOUT = 2;

var dispatcher = createDispatcher();

var running = false;
var queued = false;

// Uses a combination of available methods and the dispatchMethod option to determine which of hte three dispatch
// methods should be used.
function getDispatchMethod() {
  switch (_options.options.dispatchMethod) {
    case 'MessageChannel':
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;

    case 'setTimeout':
      return SET_TIMEOUT;

    default:
      if (typeof _setImmediate3.default !== 'undefined') {
        return SET_IMMEDIATE;
      }
      if (typeof MessageChannel !== 'undefined') {
        return MESSAGE_CHANNEL;
      }
      return SET_TIMEOUT;
  }
}

// This is the function used to run a task in a separate process. The prefered is setImmediate, but there are a couple
// of other options presented in case setImmediate isn't available in the current environment.
function createDispatcher() {
  switch (getDispatchMethod()) {
    // We prefer setImmediate if it's available.
    case SET_IMMEDIATE:
      return function () {
        if (!(queued && running)) {
          queued = true;
          (0, _setImmediate3.default)(processTasks);
        }
      };

    // Most modern browsers implement MessageChannel. This is basically a last-ditch effort to avoid using setTimeout,
    // since that's always the slowest way to do it. This was chosen over postMessage because postMessage doesn't work
    // in Web workers, where MessageChannel does.
    case MESSAGE_CHANNEL:
      {
        var channel = new MessageChannel();
        channel.port1.onmessage = function () {
          return processTasks();
        };
        return function () {
          if (!(queued && running)) {
            queued = true;
            channel.port2.postMessage(0);
          }
        };
      }

    // If all else fails, just use setTimeout. It may be a few milliseconds slower than the others over the long haul,
    // but it works everywhere.
    case SET_TIMEOUT:
      return function () {
        if (!(queued && running)) {
          queued = true;
          setTimeout(processTasks, 0);
        }
      };
  }
}

function setDispatcher() {
  dispatcher = createDispatcher();
}

// Processes a batch of tasks one at a time. The reason for limiting this function to a batch size is because we need
// to give up control to the system's process queue occasionally, or else the system event loop would never run. We
// limit ourselves to running a batch at a time, and if there are still more tasks remaining, we put another call onto
// the system process queue to be run after the event loop cycles once more.
function processTasks() {
  running = true;
  queued = false;
  var count = 0;

  for (;;) {
    var task = queue.dequeue();
    if (task === _buffers.EMPTY) {
      break;
    }

    task();

    if (count >= _options.options.taskBatchSize) {
      break;
    }
    count++;
  }

  running = false;
  if (queue.length) {
    dispatcher();
  }
}

function dispatch(task) {
  queue.enqueue(task);
  dispatcher();
}

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.options = undefined;
exports.config = config;

var _dispatcher = __webpack_require__(32);

var options = exports.options = {
  // The maximum number of operations (puts or takes) that can be queued in a channel buffer before running a cleanup
  // operation to make sure no inactive operations are in the queue.
  maxDirtyOps: 64,
  // The maximum number of puts or takes that can be queued on a channel at the same time.
  maxQueuedOps: 1024,
  // The maximum number of tasks that the dispatcher will run in a single batch. If the number of pending tasks exceeds
  // this, the remaining are not discarded. They're simply run as part of another batch after the current batch
  // completes. Setting this to a reasonable number makes sure that control can pass back to the event loop every now
  // and then, even if there are thousands of tasks in the queue.
  taskBatchSize: 1024,
  // The default process error handler. If this is set and an uncaught `yield raise` happens in the process, this error
  // handler is used to manage the error. It's a function that takes one parameter, which is an object containing an
  // `error` property which is the actual error. (This is to allow future expansion of the library's error-handling
  // capabilities.)
  dispatchMethod: 'setImmediate'
};

// Sets the values of one or more configurable options. This function takes an object for a parameter, and if any of
// that object's property's names match one of those of the options object, its value becomes the new value of that
// option. Properties that don't exist as options are ignored, and options that are not present in the parameter are
// left unchanged.
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
// options.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Tracks and allows the setting of a few runtime-configurable options.

function config(opts) {
  for (var key in options) {
    if (opts.hasOwnProperty(key)) {
      options[key] = opts[key];

      if (key === 'dispatchMethod') {
        (0, _dispatcher.setDispatcher)();
      }
    }
  }
}

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _promise = __webpack_require__(52);

var _promise2 = _interopRequireDefault(_promise);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (fn) {
  return function () {
    var gen = fn.apply(this, arguments);
    return new _promise2.default(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }

        if (info.done) {
          resolve(value);
        } else {
          return _promise2.default.resolve(value).then(function (value) {
            step("next", value);
          }, function (err) {
            step("throw", err);
          });
        }
      }

      return step("next");
    });
  };
};

/***/ }),
/* 35 */
/***/ (function(module, exports) {

module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = __webpack_require__(17)
  , TAG = __webpack_require__(1)('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function(it, key){
  try {
    return it[key];
  } catch(e){ /* empty */ }
};

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};

/***/ }),
/* 37 */
/***/ (function(module, exports) {

// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

var isObject = __webpack_require__(20)
  , document = __webpack_require__(2).document
  // in old IE typeof document.createElement is 'object'
  , is = isObject(document) && isObject(document.createElement);
module.exports = function(it){
  return is ? document.createElement(it) : {};
};

/***/ }),
/* 39 */
/***/ (function(module, exports) {

// IE 8- don't enum bug keys
module.exports = (
  'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'
).split(',');

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
var anObject    = __webpack_require__(4)
  , dPs         = __webpack_require__(113)
  , enumBugKeys = __webpack_require__(39)
  , IE_PROTO    = __webpack_require__(42)('IE_PROTO')
  , Empty       = function(){ /* empty */ }
  , PROTOTYPE   = 'prototype';

// Create object with fake `null` prototype: use iframe Object with cleared prototype
var createDict = function(){
  // Thrash, waste and sodomy: IE GC bug
  var iframe = __webpack_require__(38)('iframe')
    , i      = enumBugKeys.length
    , lt     = '<'
    , gt     = '>'
    , iframeDocument;
  iframe.style.display = 'none';
  __webpack_require__(54).appendChild(iframe);
  iframe.src = 'javascript:'; // eslint-disable-line no-script-url
  // createDict = iframe.contentWindow.Object;
  // html.removeChild(iframe);
  iframeDocument = iframe.contentWindow.document;
  iframeDocument.open();
  iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
  iframeDocument.close();
  createDict = iframeDocument.F;
  while(i--)delete createDict[PROTOTYPE][enumBugKeys[i]];
  return createDict();
};

module.exports = Object.create || function create(O, Properties){
  var result;
  if(O !== null){
    Empty[PROTOTYPE] = anObject(O);
    result = new Empty;
    Empty[PROTOTYPE] = null;
    // add "__proto__" for Object.getPrototypeOf polyfill
    result[IE_PROTO] = O;
  } else result = createDict();
  return Properties === undefined ? result : dPs(result, Properties);
};


/***/ }),
/* 41 */
/***/ (function(module, exports) {

exports.f = Object.getOwnPropertySymbols;

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

var shared = __webpack_require__(43)('keys')
  , uid    = __webpack_require__(30);
module.exports = function(key){
  return shared[key] || (shared[key] = uid(key));
};

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

var global = __webpack_require__(2)
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

var ctx                = __webpack_require__(18)
  , invoke             = __webpack_require__(105)
  , html               = __webpack_require__(54)
  , cel                = __webpack_require__(38)
  , global             = __webpack_require__(2)
  , process            = global.process
  , setTask            = global.setImmediate
  , clearTask          = global.clearImmediate
  , MessageChannel     = global.MessageChannel
  , counter            = 0
  , queue              = {}
  , ONREADYSTATECHANGE = 'onreadystatechange'
  , defer, channel, port;
var run = function(){
  var id = +this;
  if(queue.hasOwnProperty(id)){
    var fn = queue[id];
    delete queue[id];
    fn();
  }
};
var listener = function(event){
  run.call(event.data);
};
// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
if(!setTask || !clearTask){
  setTask = function setImmediate(fn){
    var args = [], i = 1;
    while(arguments.length > i)args.push(arguments[i++]);
    queue[++counter] = function(){
      invoke(typeof fn == 'function' ? fn : Function(fn), args);
    };
    defer(counter);
    return counter;
  };
  clearTask = function clearImmediate(id){
    delete queue[id];
  };
  // Node.js 0.8-
  if(__webpack_require__(17)(process) == 'process'){
    defer = function(id){
      process.nextTick(ctx(run, id, 1));
    };
  // Browsers with MessageChannel, includes WebWorkers
  } else if(MessageChannel){
    channel = new MessageChannel;
    port    = channel.port2;
    channel.port1.onmessage = listener;
    defer = ctx(port.postMessage, port, 1);
  // Browsers with postMessage, skip WebWorkers
  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
    defer = function(id){
      global.postMessage(id + '', '*');
    };
    global.addEventListener('message', listener, false);
  // IE8-
  } else if(ONREADYSTATECHANGE in cel('script')){
    defer = function(id){
      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
        html.removeChild(this);
        run.call(id);
      };
    };
  // Rest old browsers
  } else {
    defer = function(id){
      setTimeout(ctx(run, id, 1), 0);
    };
  }
}
module.exports = {
  set:   setTask,
  clear: clearTask
};

/***/ }),
/* 45 */
/***/ (function(module, exports) {

// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.15 ToLength
var toInteger = __webpack_require__(45)
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.13 ToObject(argument)
var defined = __webpack_require__(37);
module.exports = function(it){
  return Object(defined(it));
};

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

// 7.1.1 ToPrimitive(input [, PreferredType])
var isObject = __webpack_require__(20);
// instead of the ES6 spec version, we didn't implement @@toPrimitive case
// and the second argument - flag - preferred type is a string
module.exports = function(it, S){
  if(!isObject(it))return it;
  var fn, val;
  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
  throw TypeError("Can't convert object to primitive value");
};

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

var global         = __webpack_require__(2)
  , core           = __webpack_require__(0)
  , LIBRARY        = __webpack_require__(27)
  , wksExt         = __webpack_require__(50)
  , defineProperty = __webpack_require__(3).f;
module.exports = function(name){
  var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
  if(name.charAt(0) != '_' && !(name in $Symbol))defineProperty($Symbol, name, {value: wksExt.f(name)});
};

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

exports.f = __webpack_require__(1);

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

var classof   = __webpack_require__(36)
  , ITERATOR  = __webpack_require__(1)('iterator')
  , Iterators = __webpack_require__(14);
module.exports = __webpack_require__(0).getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(94), __esModule: true };

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _from = __webpack_require__(80);

var _from2 = _interopRequireDefault(_from);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return (0, _from2.default)(arr);
  }
};

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(2).document && document.documentElement;

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = !__webpack_require__(5) && !__webpack_require__(19)(function(){
  return Object.defineProperty(__webpack_require__(38)('div'), 'a', {get: function(){ return 7; }}).a != 7;
});

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = __webpack_require__(17);
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

// check on default Array iterator
var Iterators  = __webpack_require__(14)
  , ITERATOR   = __webpack_require__(1)('iterator')
  , ArrayProto = Array.prototype;

module.exports = function(it){
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

// call something on iterator step with safe closing on error
var anObject = __webpack_require__(4);
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var LIBRARY        = __webpack_require__(27)
  , $export        = __webpack_require__(6)
  , redefine       = __webpack_require__(63)
  , hide           = __webpack_require__(9)
  , has            = __webpack_require__(8)
  , Iterators      = __webpack_require__(14)
  , $iterCreate    = __webpack_require__(107)
  , setToStringTag = __webpack_require__(29)
  , getPrototypeOf = __webpack_require__(116)
  , ITERATOR       = __webpack_require__(1)('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , $entries   = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined
    , $anyNative = NAME == 'Array' ? proto.entries || $native : $native
    , methods, key, IteratorPrototype;
  // Fix native
  if($anyNative){
    IteratorPrototype = getPrototypeOf($anyNative.call(new Base));
    if(IteratorPrototype !== Object.prototype){
      // Set @@toStringTag to native iterators
      setToStringTag(IteratorPrototype, TAG, true);
      // fix for some old engines
      if(!LIBRARY && !has(IteratorPrototype, ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    }
  }
  // fix Array#{values, @@iterator}.name in V8 / FF
  if(DEF_VALUES && $native && $native.name !== VALUES){
    VALUES_BUG = true;
    $default = function values(){ return $native.call(this); };
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES ? $default : getMethod(VALUES),
      keys:    IS_SET     ? $default : getMethod(KEYS),
      entries: $entries
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

var ITERATOR     = __webpack_require__(1)('iterator')
  , SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }

module.exports = function(exec, skipClosing){
  if(!skipClosing && !SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[ITERATOR]();
    iter.next = function(){ return {done: safe = true}; };
    arr[ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.7 / 15.2.3.4 Object.getOwnPropertyNames(O)
var $keys      = __webpack_require__(62)
  , hiddenKeys = __webpack_require__(39).concat('length', 'prototype');

exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O){
  return $keys(O, hiddenKeys);
};

/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

var has          = __webpack_require__(8)
  , toIObject    = __webpack_require__(10)
  , arrayIndexOf = __webpack_require__(101)(false)
  , IE_PROTO     = __webpack_require__(42)('IE_PROTO');

module.exports = function(object, names){
  var O      = toIObject(object)
    , i      = 0
    , result = []
    , key;
  for(key in O)if(key != IE_PROTO)has(O, key) && result.push(key);
  // Don't enum bug & hidden keys
  while(names.length > i)if(has(O, key = names[i++])){
    ~arrayIndexOf(result, key) || result.push(key);
  }
  return result;
};

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(9);

/***/ }),
/* 64 */
/***/ (function(module, exports) {



/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// ECMAScript 6 symbols shim
var global         = __webpack_require__(2)
  , has            = __webpack_require__(8)
  , DESCRIPTORS    = __webpack_require__(5)
  , $export        = __webpack_require__(6)
  , redefine       = __webpack_require__(63)
  , META           = __webpack_require__(110).KEY
  , $fails         = __webpack_require__(19)
  , shared         = __webpack_require__(43)
  , setToStringTag = __webpack_require__(29)
  , uid            = __webpack_require__(30)
  , wks            = __webpack_require__(1)
  , wksExt         = __webpack_require__(50)
  , wksDefine      = __webpack_require__(49)
  , keyOf          = __webpack_require__(109)
  , enumKeys       = __webpack_require__(103)
  , isArray        = __webpack_require__(106)
  , anObject       = __webpack_require__(4)
  , toIObject      = __webpack_require__(10)
  , toPrimitive    = __webpack_require__(48)
  , createDesc     = __webpack_require__(22)
  , _create        = __webpack_require__(40)
  , gOPNExt        = __webpack_require__(115)
  , $GOPD          = __webpack_require__(114)
  , $DP            = __webpack_require__(3)
  , $keys          = __webpack_require__(21)
  , gOPD           = $GOPD.f
  , dP             = $DP.f
  , gOPN           = gOPNExt.f
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , PROTOTYPE      = 'prototype'
  , HIDDEN         = wks('_hidden')
  , TO_PRIMITIVE   = wks('toPrimitive')
  , isEnum         = {}.propertyIsEnumerable
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , OPSymbols      = shared('op-symbols')
  , ObjectProto    = Object[PROTOTYPE]
  , USE_NATIVE     = typeof $Symbol == 'function'
  , QObject        = global.QObject;
// Don't use setters in Qt Script, https://github.com/zloirock/core-js/issues/173
var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(dP({}, 'a', {
    get: function(){ return dP(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = gOPD(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  dP(it, key, D);
  if(protoDesc && it !== ObjectProto)dP(ObjectProto, key, protoDesc);
} : dP;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
  sym._k = tag;
  return sym;
};

var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function(it){
  return typeof it == 'symbol';
} : function(it){
  return it instanceof $Symbol;
};

var $defineProperty = function defineProperty(it, key, D){
  if(it === ObjectProto)$defineProperty(OPSymbols, key, D);
  anObject(it);
  key = toPrimitive(key, true);
  anObject(D);
  if(has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))dP(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return dP(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key = toPrimitive(key, true));
  if(this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return false;
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  it  = toIObject(it);
  key = toPrimitive(key, true);
  if(it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key))return;
  var D = gOPD(it, key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = gOPN(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META)result.push(key);
  } return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var IS_OP  = it === ObjectProto
    , names  = gOPN(IS_OP ? OPSymbols : toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i){
    if(has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true))result.push(AllSymbols[key]);
  } return result;
};

// 19.4.1.1 Symbol([description])
if(!USE_NATIVE){
  $Symbol = function Symbol(){
    if(this instanceof $Symbol)throw TypeError('Symbol is not a constructor!');
    var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
    var $set = function(value){
      if(this === ObjectProto)$set.call(OPSymbols, value);
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    };
    if(DESCRIPTORS && setter)setSymbolDesc(ObjectProto, tag, {configurable: true, set: $set});
    return wrap(tag);
  };
  redefine($Symbol[PROTOTYPE], 'toString', function toString(){
    return this._k;
  });

  $GOPD.f = $getOwnPropertyDescriptor;
  $DP.f   = $defineProperty;
  __webpack_require__(61).f = gOPNExt.f = $getOwnPropertyNames;
  __webpack_require__(28).f  = $propertyIsEnumerable;
  __webpack_require__(41).f = $getOwnPropertySymbols;

  if(DESCRIPTORS && !__webpack_require__(27)){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }

  wksExt.f = function(name){
    return wrap(wks(name));
  }
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Symbol: $Symbol});

for(var symbols = (
  // 19.4.2.2, 19.4.2.3, 19.4.2.4, 19.4.2.6, 19.4.2.8, 19.4.2.9, 19.4.2.10, 19.4.2.11, 19.4.2.12, 19.4.2.13, 19.4.2.14
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'
).split(','), i = 0; symbols.length > i; )wks(symbols[i++]);

for(var symbols = $keys(wks.store), i = 0; symbols.length > i; )wksDefine(symbols[i++]);

$export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    if(isSymbol(key))return keyOf(SymbolRegistry, key);
    throw TypeError(key + ' is not a symbol!');
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
});

$export($export.S + $export.F * !USE_NATIVE, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
})), 'JSON', {
  stringify: function stringify(it){
    if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
    var args = [it]
      , i    = 1
      , replacer, $replacer;
    while(arguments.length > i)args.push(arguments[i++]);
    replacer = args[1];
    if(typeof replacer == 'function')$replacer = replacer;
    if($replacer || !isArray(replacer))replacer = function(key, value){
      if($replacer)value = $replacer.call(this, key, value);
      if(!isSymbol(value))return value;
    };
    args[1] = replacer;
    return _stringify.apply($JSON, args);
  }
});

// 19.4.3.4 Symbol.prototype[@@toPrimitive](hint)
$Symbol[PROTOTYPE][TO_PRIMITIVE] || __webpack_require__(9)($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);

/***/ }),
/* 66 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 67 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.protocols = undefined;

var _iterator = __webpack_require__(86);

var _iterator2 = _interopRequireDefault(_iterator);

var _for = __webpack_require__(85);

var _for2 = _interopRequireDefault(_for);

var _symbol = __webpack_require__(16);

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
// protocol.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Protocols for iteration and reduction. The source for these protocols depends on which protocol it is.
//
// Iteration: a part of the ES6 standard.
// Transduction: agreed to by several parties who maintain transducer libraries in the comment thread for an issue on
//     one of them (https://github.com/cognitect-labs/transducers-js/issues/20).

var USE_SYMBOLS = false;
var symbol = typeof _symbol2.default !== 'undefined';

// Generation of the key used on an object to store a protocol function. This is a symbol if symbols are available and
// USE_SYMBOLS (above) is set to true; if not, it's a regular string. If a symbol of the supplied name already exists,
// it'll be used instead of having a new one generated.
function generateKey(name) {
  return USE_SYMBOLS && symbol ? (0, _for2.default)(name) : '@@' + name;
}

var protocols = exports.protocols = {
  // Since this one is built in, it already has a custom Symbol property, so we don't need to generate a symbol for a
  // key when symbols are supported.
  iterator: symbol ? _iterator2.default : '@@iterator',

  // Reduction protocols
  init: generateKey('transducer/init'),
  step: generateKey('transducer/step'),
  result: generateKey('transducer/result'),
  reduced: generateKey('transducer/reduced'),
  value: generateKey('transducer/value')
};

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.take = take;
exports.takeOrThrow = takeOrThrow;
exports.put = put;
exports.alts = alts;
exports.sleep = sleep;
exports.spawn = spawn;
exports.go = go;
exports.goSafe = goSafe;

var _process = __webpack_require__(70);

var _buffers = __webpack_require__(24);

var _channel = __webpack_require__(15);

var _operations = __webpack_require__(25);

// Takes the first available value off the specified channel. If there is no value currently available, this will block
// until either the channel closes or a put is made onto the channel. If there are multiple takes (or take operations
// from `alts`) queued on the channel and waiting, they will be provided values in order as the values are put onto the
// channel.
//
// The return value of this function is a TAKE instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a value is returned from the channel. The process is then
// restarted, with the returned value from the channel becoming the value of the `yield` expression. If the unblocking
// was the result of the channel closing, then the value of that `yield` expression will be CLOSED.
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
// operations.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function take(channel) {
  return (0, _process.instruction)(_process.TAKE, { channel: channel, except: false });
}

// Works exactly like `take`, except that if the value that is taken off the channel is an `Error` object, that error
// is thrown back into the process. At that point it acts exactly like any other thrown error.
function takeOrThrow(channel) {
  return (0, _process.instruction)(_process.TAKE, { channel: channel, except: true });
}

// Puts the value onto the specified channel. If there is no process ready to take this value, this function will block
// until either the channel closes or a taker becomes available. If there are multiple puts (or put operations from
// `alts`) queued on the channel and waiting, they will be processed in order as take requests happen.
//
// The return value of this function is a PUT instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a take is called on the channel or until the channel
// closes. The process is then restarted, and either `true` (if there was a take) or `false` (if the channel was
// closed) will become the value of the `yield` expression.
function put(channel, value) {
  return (0, _process.instruction)(_process.PUT, { channel: channel, value: value });
}

// Processes an arbitrary number of puts and takes (represented by the operations array). When the first operation
// successfully completes, the rest are discarded.
//
// Each element of the operations array is one operation. If that element is a channel, then the operation is a take on
// that channel. If the element is a two-element array, the operation is a put operation. These operations are queued
// on their respective channels in a random order. In this case, the first element of the sub-array should be the
// channel to put on, and the second value the value to put on that channel.
//
// As with put and take, the return value of this function is an instruction (ALTS), which is only useful in that a
// process knows how to use it to restart itself with the correct value being applied as the result of the `yield`
// expression that caused the process to pause in the first place.
//
// Operations are processed in a random order. The first one to come back without blocking, or if they all block, the
// first one to come unblocked, will be the operation that is run. Other operations will be discarded. The successful
// operation will cause an object to become the value of the `yield` expression in the process. This object has two
// properties: `value` is the return value of the operation (the same as the return value for either a put or a take),
// and `channel` is the channel on which the operation was executed. This way the process has the ability to know which
// channel was used to provide the value.
//
// This function takes an optional object that provides options to the execution. There are two legal options:
// `priority` causes the operations to be queued in the order of the operations array, rather than randomly; `default`
// causes its value to become the return value (with a channel of DEFAULT) if all operations block before completing.
// In this case all of the operations are discarded.
function alts(ops) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return (0, _process.instruction)(_process.ALTS, { ops: ops, options: options });
}

// Blocks the process until some amount of time has elapsed. This is done by creating a local channel that isn't
// exposed to the outside and setting it to close after the required delay. The process then becomes unblocked because
// blocking stops when a channel closes. Since the channel is private, there's no way to prematurely unblock the
// process.
//
// If no delay is passed, or if that delay is 0, then a new channel won't be created. Instead, the process will simply
// relinquish its control and cause itself to be immediately queued back up to be run after all of the other processes
// (and the event loop) have a chance to run.
//
// The return value of this function is a SLEEP instruction. This doesn't have any value except that, when returned via
// `yield`, it will stop the execution of the process until a the required amount of time has passed. The process is
// then restarted automatically.
function sleep() {
  var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

  return (0, _process.instruction)(_process.SLEEP, { delay: delay });
}

// Creates a process from a generator (not a generator function) and runs it. The process is then left to its own
// devices until it returns. This function creates and returns a channel, though that channel can only ever have one
// value: the return value of the generator (the channel closes after this value is taken).
//
// If a second argument is passed and it's a function, then that function will be called when an exception is thrown
// within the process code itself. The handler receives the error object as an argument.
//
// Since this requires a generator and not a generator function, it isn't used nearly as much as `go`.
function spawn(gen, exh) {
  var ch = (0, _channel.chan)((0, _buffers.fixed)(1));
  (0, _process.process)(gen, exh, function (value) {
    if (value === _channel.CLOSED) {
      ch.close();
    } else {
      (0, _operations.putAsync)(ch, value, function () {
        return (0, _channel.close)(ch);
      });
    }
  }).run();
  return ch;
}

// Creates a process from a generator function (not a generator) and runs it. What this really does is create a
// generator from the generator function and its optional arguments, and then pass that off to `spawn`. But since
// generator functions have a literal form (`function* ()`) while generators themselves do not, this is going to be the
// much more commonly used function of the two.
function go(fn) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return spawn(fn.apply(undefined, args));
}

// Creates a process from a generator function just like `go`, except this one also accepts an exception handling
// function. This function is called any time an error is caught within the process itself. It receives the error object
// as an argument. The process is then considered finished, and the value placed into its return channel is the value
// returned from the exception handler.
function goSafe(fn, exh) {
  for (var _len2 = arguments.length, args = Array(_len2 > 2 ? _len2 - 2 : 0), _key2 = 2; _key2 < _len2; _key2++) {
    args[_key2 - 2] = arguments[_key2];
  }

  return spawn(fn.apply(undefined, args), exh);
}

/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SLEEP = exports.ALTS = exports.PUT = exports.TAKE = undefined;

var _symbol = __webpack_require__(16);

var _symbol2 = _interopRequireDefault(_symbol);

exports.instruction = instruction;
exports.process = process;

var _channel2 = __webpack_require__(15);

var _operations = __webpack_require__(25);

var _dispatcher = __webpack_require__(32);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Names of the actual instructions that are used within a CSP process. These are the five operations that are
// explicitly supported by the Process object itself. Other instructions like putAsync and takeAsync are handled
// outside of the process and do not have process instructions.

var TAKE = exports.TAKE = 'take'; /*
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
// process.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// An implementation of processes, one of the two big parts of CSP (the other being channels). These processes
// represent lines of execution that may be run concurrently with other lines of execution.
//
// Processes are implemented as generators that have some extra functionality based on the values fed out of the
// generator by its `yield` expressions. By passing special values out of those expressions (in the form of
// instruction objects), the process can control when and how the generator is restarted.

var PUT = exports.PUT = 'put';
var ALTS = exports.ALTS = 'alts';
var SLEEP = exports.SLEEP = 'sleep';

// A unique value used to tag an object as an instruction. Since there's no access to this value outside of this module,
// there's no way to emulate (accidentally or on purpose) an instruction in the process queue.
var INSTRUCTION = (0, _symbol2.default)();

// A simple object basically used as a wrapper to associate some data with a  particular instruction. The op property
// is the string name of the instruction (from the five choices in the constants above), while the data property
// contains whatever data is necessary to process that instruction.
function instruction(op, data) {
  return {
    op: op,
    data: data,
    instruction: INSTRUCTION
  };
}

// Determines whether an object is an instruction.
function isInstruction(value) {
  return value && value.instruction === INSTRUCTION;
}

// An actual process that is being run in a separate line of execution. This is one of the two key objects from this
// library; the other is Channel.
//
// A process wraps a generator. This generator can operate exactly like any other generator, except that certain
// `yield` expressions will be handled specially. A regular `yield` works just like normal, but if the value given to
// the `yield` is the result of a `put`, `take`, `alts`, `raise`, or `sleep`, something different happens. Each of
// `put`, `take`, and  `alts` will put values onto their channels and then block until they can complete; `raise` will
// cause the raised error to be injected back into the channel with default error handler support; and `sleep` will
// create a new rudimentary channel that blocks until it closes after a certain amount of time.
//
// Each invocation of the wrapped generator - whether from the initial run or continuing after handling a `yield`
// expression (special or not) - will be scheduled by the dispatcher to run as a separate message in the message queue.
function process(gen, exh, onFinish) {
  return {
    gen: gen,
    exh: exh,
    onFinish: onFinish,
    finished: false,

    // Continues a process that has been paused by passing back the response (the value which will be assigned to the
    // `yield` expression inside the process) and running the code as a different JS task. If the response results from
    // a `yield raise`, the error handling code (which invokes the default handler, if required) will be run instead.
    continue: function _continue(response) {
      var except = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

      if (Error.prototype.isPrototypeOf(response) && except) {
        this.injectError(response);
      } else {
        (0, _dispatcher.dispatch)(this.run.bind(this, response));
      }
    },


    // Called with an arbitrary value when the process exits. This runs the onFinish callback (passing the value) as a
    // separate JS task.
    done: function done(value) {
      if (!this.finished) {
        this.finished = true;
        var finish = this.onFinish;
        if (typeof finish === 'function') {
          (0, _dispatcher.dispatch)(finish.bind(this, value));
        }
      }
    },


    // Called if an error object is passed out of the process via `takeOrThrow`. The error object is thrown back into
    // the process. If it's caught, then the process continues as normal. Otherwise the error is thrown as though it
    // was generated in the process itself (i.e., it can be caught with an event handler if the process was created
    // with `goSafe`).
    injectError: function injectError(response) {
      var result = void 0;
      try {
        result = this.gen.throw(response);
      } catch (ex) {
        this.handleProcessError(ex);
        return;
      }
      if (result.done) {
        this.done(result.value);
      } else {
        this.run(result.value);
      }
    },


    // Deals with errors that happen inside a running process. Calls that restart a process (`next` or `throw`) should
    // be wrapped in a `try` with a call to this function in the `catch` block. This simply runs the error handler
    // function for the process if it exists, passing the resulting value into the process's return channel and ending
    // the process. If there is no error handler, the error is simply thrown.
    handleProcessError: function handleProcessError(ex) {
      if (typeof this.exh === 'function') {
        this.done(this.exh(ex));
      } else {
        throw ex;
      }
    },


    // Runs the process until it reaches a `yield`, and then handles the result of that `yield`. If the result is that
    // the process is finished (returns { done: true }), then the process is closed and the onFinish callback is called.
    run: function run(response) {
      var _this = this;

      if (this.finished) {
        return;
      }

      var item = void 0;
      if (isInstruction(response)) {
        // If this function was called by `injectError`, then `this.gen.throw()` was already called so we already
        // have an instruction as the result, no need to call `this.gen.next()`
        item = response;
      } else {
        var iter = void 0;
        try {
          iter = this.gen.next(response);
        } catch (ex) {
          this.handleProcessError(ex);
          return;
        }
        if (iter.done) {
          this.done(iter.value);
          return;
        }
        item = iter.value;
      }

      if (isInstruction(item)) {
        // Handle any of the instructions, which are the only meaningful yield outputs inside a process.
        switch (item.op) {
          case PUT:
            {
              var _item$data = item.data,
                  channel = _item$data.channel,
                  value = _item$data.value;

              (0, _operations.putAsync)(channel, value, function (status) {
                return _this.continue(status);
              });
              break;
            }

          case TAKE:
            {
              var _item$data2 = item.data,
                  _channel = _item$data2.channel,
                  except = _item$data2.except;

              (0, _operations.takeAsync)(_channel, function (value) {
                return _this.continue(value, except);
              });
              break;
            }

          case ALTS:
            {
              var _item$data3 = item.data,
                  ops = _item$data3.ops,
                  options = _item$data3.options;

              (0, _operations.altsAsync)(ops, function (result) {
                return _this.continue(result);
              }, options);
              break;
            }

          case SLEEP:
            {
              var delay = item.data.delay;

              if (delay === 0) {
                setTimeout(function () {
                  return _this.continue();
                }, 0);
              } else {
                var ch = (0, _channel2.chan)();
                setTimeout(function () {
                  return ch.close();
                }, delay);
                (0, _operations.takeAsync)(ch, function (value) {
                  return _this.continue(value);
                });
              }
              break;
            }
        }
      } else {
        // Handles anything else, though this actually does nothing more than pass the response back into the process.
        this.continue(item);
      }
    }
  };
}
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(66)))

/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _slicedToArray2 = __webpack_require__(26);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.reduce = reduce;
exports.onto = onto;
exports.into = into;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Reduces all of the values in the supplied channel by running them through a reduction function. An initial value for
// the reduction function can also be supplied. The single value that comes out of this reduction (which cannot
// complete until the input channel is closed) is put into a channel that is returned. This returned channel will close
// automatically after the value is taken from it.
//
// This is different from transducer reduction, as transducers always reduce to a collection (or channel). This reduce
// can result in a single scalar value.
function reduce(fn, ch, init) {
  return (0, _cispy.go)(_regenerator2.default.mark(function _callee() {
    var result, value;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            result = init;

          case 1:
            _context.next = 3;
            return (0, _cispy.take)(ch);

          case 3:
            value = _context.sent;

            if (!(value === _cispy.CLOSED)) {
              _context.next = 6;
              break;
            }

            return _context.abrupt('return', result);

          case 6:
            result = fn(result, value);

          case 7:
            _context.next = 1;
            break;

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
}

// Puts all of the values in the input array onto the supplied channel. If no channel is supplied (if only an array is
// passed), then a new buffered channel of the same length of the array is created. Either way, the channel is returned
// and will close when the last array value has been taken.
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
// conversion.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions convert channels into other kinds of data, or vice versa.

function onto(ch, array) {
  var _ref = Array.isArray(ch) ? [(0, _cispy.chan)(ch.length), ch] : [ch, array],
      _ref2 = (0, _slicedToArray3.default)(_ref, 2),
      chnl = _ref2[0],
      arr = _ref2[1];

  (0, _cispy.go)(_regenerator2.default.mark(function _callee2() {
    var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item;

    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context2.prev = 3;
            _iterator = (0, _getIterator3.default)(arr);

          case 5:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context2.next = 12;
              break;
            }

            item = _step.value;
            _context2.next = 9;
            return (0, _cispy.put)(chnl, item);

          case 9:
            _iteratorNormalCompletion = true;
            _context2.next = 5;
            break;

          case 12:
            _context2.next = 18;
            break;

          case 14:
            _context2.prev = 14;
            _context2.t0 = _context2['catch'](3);
            _didIteratorError = true;
            _iteratorError = _context2.t0;

          case 18:
            _context2.prev = 18;
            _context2.prev = 19;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 21:
            _context2.prev = 21;

            if (!_didIteratorError) {
              _context2.next = 24;
              break;
            }

            throw _iteratorError;

          case 24:
            return _context2.finish(21);

          case 25:
            return _context2.finish(18);

          case 26:
            (0, _cispy.close)(chnl);

          case 27:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[3, 14, 18, 26], [19,, 21, 25]]);
  }));
  return chnl;
}

// Moves all of the values on a channel into the supplied array. If no array is supplied (if the only parameter passed
// is a channel), then a new and empty array is created to contain the values. A channel is returned; the resulting
// channel will hold the resulting array and will close immediately upon that array being taken from it.
function into(array, ch) {
  var _ref3 = Array.isArray(array) ? [array, ch] : [[], array],
      _ref4 = (0, _slicedToArray3.default)(_ref3, 2),
      arr = _ref4[0],
      chnl = _ref4[1];

  var init = arr.slice();

  return reduce(function (acc, input) {
    acc.push(input);
    return acc;
  }, chnl, init);
}

/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = __webpack_require__(53);

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _slicedToArray2 = __webpack_require__(26);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.pipe = pipe;
exports.partition = partition;
exports.merge = merge;
exports.split = split;
exports.tap = tap;
exports.untap = untap;
exports.untapAll = untapAll;
exports.map = map;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var protocols = {
  taps: '@@multitap/taps'
}; /*
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
// flow.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// The functions in this file route channels to other channels in different ways.
//
// IN EVERY ONE OF THESE FUNCTIONS the source channel will not be available to be taken from, as all of the source
// channels will have their values taken by the processes within these functions. The lone exception is `tap`, where
// the regular function of the source channel will be restored if all taps are removed. Even so, while at least one tap
// is in place, the source channel cannot be taken from.

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

// Takes the values off one channel and, in the same order, puts them onto a different channel. Both channels must be
// provided, and the piping continues until the source channel is closed. At that point the destination channel is also
// closed, though by setting keep-open to `true`, the destination channel closing is prevented.
//
// Because of the option to keep the destination channel open after the source channel closes, pipe can be used to
// convert an automatically-closing channel into one that remains open.
function pipe(src, dest, keepOpen) {
  (0, _cispy.go)(_regenerator2.default.mark(function _callee() {
    var value;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return (0, _cispy.take)(src);

          case 2:
            value = _context.sent;

            if (!(value === _cispy.CLOSED)) {
              _context.next = 6;
              break;
            }

            if (!keepOpen) {
              dest.close();
            }
            return _context.abrupt('break', 12);

          case 6:
            _context.next = 8;
            return (0, _cispy.put)(dest, value);

          case 8:
            if (_context.sent) {
              _context.next = 10;
              break;
            }

            return _context.abrupt('break', 12);

          case 10:
            _context.next = 0;
            break;

          case 12:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));
  return dest;
}

// Partitions the values from one channel into two new channels. Which channel each value is put onto depends on
// whether it returns `true` or `false` when passed through a supplied predicate function. Both output channels are
// created and returned, and both are closed when the source channel closes.
function partition(fn, src) {
  var tBuffer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var fBuffer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

  var tDest = (0, _cispy.chan)(tBuffer);
  var fDest = (0, _cispy.chan)(fBuffer);

  (0, _cispy.go)(_regenerator2.default.mark(function _callee2() {
    var value;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return (0, _cispy.take)(src);

          case 2:
            value = _context2.sent;

            if (!(value === _cispy.CLOSED)) {
              _context2.next = 7;
              break;
            }

            (0, _cispy.close)(tDest);
            (0, _cispy.close)(fDest);
            return _context2.abrupt('break', 11);

          case 7:
            _context2.next = 9;
            return (0, _cispy.put)(fn(value) ? tDest : fDest, value);

          case 9:
            _context2.next = 0;
            break;

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));
  return [tDest, fDest];
}

// Merges the values from two or more source channels into a single channel. The ordering of the values on the new
// channel is indeterminate; it cannot be assumed that each source channel will be cycled through in order. As each
// source channel is closed, it stops providing values to be merged; only when all source channels are closed will the
// new channel close.
function merge(srcs) {
  var buffer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  var dest = (0, _cispy.chan)(buffer);
  var inputs = srcs.slice();

  (0, _cispy.go)(_regenerator2.default.mark(function _callee3() {
    var _ref, value, channel, index;

    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            if (!(inputs.length === 0)) {
              _context3.next = 2;
              break;
            }

            return _context3.abrupt('break', 15);

          case 2:
            _context3.next = 4;
            return (0, _cispy.alts)(inputs);

          case 4:
            _ref = _context3.sent;
            value = _ref.value;
            channel = _ref.channel;

            if (!(value === _cispy.CLOSED)) {
              _context3.next = 11;
              break;
            }

            index = inputs.indexOf(channel);

            inputs.splice(index, 1);
            return _context3.abrupt('continue', 13);

          case 11:
            _context3.next = 13;
            return (0, _cispy.put)(dest, value);

          case 13:
            _context3.next = 0;
            break;

          case 15:
            (0, _cispy.close)(dest);

          case 16:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));
  return dest;
}

// Splits a channel into an arbitrary number of other channels, all of which will contain whatever values are put on
// the source channel. Essentially this creates some number of copies of the source channel. All of the new channels
// are closed when the source channel is closed.
function split(src) {
  var dests = [];

  for (var _len = arguments.length, buffers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    buffers[_key - 1] = arguments[_key];
  }

  var bs = buffers.length === 0 ? [2] : buffers;
  if (bs.length === 1 && isNumber(bs[0])) {
    var _bs = bs,
        _bs2 = (0, _slicedToArray3.default)(_bs, 1),
        count = _bs2[0];

    bs = [];
    for (var i = 0; i < count; ++i) {
      bs.push(0);
    }
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(bs), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var b = _step.value;

      dests.push((0, _cispy.chan)(b));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var doneCh = (0, _cispy.chan)();
  var doneCount = 0;
  function done() {
    if (--doneCount === 0) {
      (0, _cispy.putAsync)(doneCh);
    }
  }

  (0, _cispy.go)(_regenerator2.default.mark(function _callee4() {
    var value, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, dest, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _dest;

    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return (0, _cispy.take)(src);

          case 2:
            value = _context4.sent;

            if (!(value === _cispy.CLOSED)) {
              _context4.next = 24;
              break;
            }

            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context4.prev = 7;

            for (_iterator2 = (0, _getIterator3.default)(dests); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              dest = _step2.value;

              (0, _cispy.close)(dest);
            }
            _context4.next = 15;
            break;

          case 11:
            _context4.prev = 11;
            _context4.t0 = _context4['catch'](7);
            _didIteratorError2 = true;
            _iteratorError2 = _context4.t0;

          case 15:
            _context4.prev = 15;
            _context4.prev = 16;

            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }

          case 18:
            _context4.prev = 18;

            if (!_didIteratorError2) {
              _context4.next = 21;
              break;
            }

            throw _iteratorError2;

          case 21:
            return _context4.finish(18);

          case 22:
            return _context4.finish(15);

          case 23:
            return _context4.abrupt('break', 48);

          case 24:

            doneCount = dests.length;
            _iteratorNormalCompletion3 = true;
            _didIteratorError3 = false;
            _iteratorError3 = undefined;
            _context4.prev = 28;
            for (_iterator3 = (0, _getIterator3.default)(dests); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              _dest = _step3.value;

              (0, _cispy.putAsync)(_dest, value, done);
            }
            _context4.next = 36;
            break;

          case 32:
            _context4.prev = 32;
            _context4.t1 = _context4['catch'](28);
            _didIteratorError3 = true;
            _iteratorError3 = _context4.t1;

          case 36:
            _context4.prev = 36;
            _context4.prev = 37;

            if (!_iteratorNormalCompletion3 && _iterator3.return) {
              _iterator3.return();
            }

          case 39:
            _context4.prev = 39;

            if (!_didIteratorError3) {
              _context4.next = 42;
              break;
            }

            throw _iteratorError3;

          case 42:
            return _context4.finish(39);

          case 43:
            return _context4.finish(36);

          case 44:
            _context4.next = 46;
            return (0, _cispy.take)(doneCh);

          case 46:
            _context4.next = 0;
            break;

          case 48:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[7, 11, 15, 23], [16,, 18, 22], [28, 32, 36, 44], [37,, 39, 43]]);
  }));
  return dests;
}

// Utility function to add the ability to be tapped to a channel that is being tapped. This will add a single property
// to that channel only (named '@@multitap/taps' so as to decrease the chance of collision), but the tapping
// functionality itself is provided outside the channel object. This new property is an array of the channels tapping
// this channel, and it will be removed if all taps are removed.
function tapped(src) {
  src[protocols.taps] = [];

  var doneCh = (0, _cispy.chan)();
  var doneCount = 0;
  function done() {
    if (--doneCount === 0) {
      (0, _cispy.putAsync)(doneCh);
    }
  }

  (0, _cispy.go)(_regenerator2.default.mark(function _callee5() {
    var value, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _tap;

    return _regenerator2.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return (0, _cispy.take)(src);

          case 2:
            value = _context5.sent;

            if (!(value === _cispy.CLOSED || src[protocols.taps].length === 0)) {
              _context5.next = 6;
              break;
            }

            delete src[protocols.taps];
            return _context5.abrupt('break', 30);

          case 6:

            doneCount = src[protocols.taps].length;
            _iteratorNormalCompletion4 = true;
            _didIteratorError4 = false;
            _iteratorError4 = undefined;
            _context5.prev = 10;
            for (_iterator4 = (0, _getIterator3.default)(src[protocols.taps]); !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              _tap = _step4.value;

              (0, _cispy.putAsync)(_tap, value, done);
            }
            _context5.next = 18;
            break;

          case 14:
            _context5.prev = 14;
            _context5.t0 = _context5['catch'](10);
            _didIteratorError4 = true;
            _iteratorError4 = _context5.t0;

          case 18:
            _context5.prev = 18;
            _context5.prev = 19;

            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }

          case 21:
            _context5.prev = 21;

            if (!_didIteratorError4) {
              _context5.next = 24;
              break;
            }

            throw _iteratorError4;

          case 24:
            return _context5.finish(21);

          case 25:
            return _context5.finish(18);

          case 26:
            _context5.next = 28;
            return (0, _cispy.take)(doneCh);

          case 28:
            _context5.next = 0;
            break;

          case 30:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, this, [[10, 14, 18, 26], [19,, 21, 25]]);
  }));
}

// Taps a source channel with a destination channel to which the source's values will be redirected. Any number of taps
// can be created on a source channel, by calling this function multiple times with the same source and different
// destinations. In that manner this function acts like `split` above in that all of the values put onto the source
// channel will be copied to each tapping channel. There are three major differences from `split` though: the tapping
// channels are -not- closed if the source channel is closed; new destination channels do not have to be created
// (channels that already exist can be passed as destinations); and when all taps are removed, the tapped channel
// reverts to its former behavior (i.e., it becomes a normal channel that can both be put onto and taken from).
//
// In essence, this is intended to be a temporary tap of one already existing channel into another, and when the tap is
// removed, the channels are just as they were before.
function tap(src) {
  var dest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0, _cispy.chan)();

  if (!src[protocols.taps]) {
    tapped(src);
  }
  if (!~src[protocols.taps].indexOf(dest)) {
    src[protocols.taps].push(dest);
  }
  return dest;
}

// Removes the tap from the destination channel into the source channel. If the destination channel wasn't tapping the
// source channel to begin with, then nothing will happen. If this function removes the last tap from a source channel,
// that channel will revert to being a normal untapped channel.
function untap(src, dest) {
  if (src[protocols.taps]) {
    var index = src[protocols.taps].indexOf(dest);
    if (index !== -1) {
      src[protocols.taps].splice(index, 1);
      if (src[protocols.taps].length === 0) {
        // We have to do this because a tapped channel sits waiting in a while loop for a take to happen, and it wil be
        // waiting when we untap the last channel. Still nervous about it though.
        (0, _cispy.putAsync)(src);
      }
    }
  }
}

// Removes all taps from a source channel. Every tapping channel that's removed and the tapped source channel revert to
// being normal channels.
function untapAll(src) {
  if (src[protocols.taps]) {
    src[protocols.taps] = [];
    (0, _cispy.putAsync)(src);
  }
}

// Merges the values from two or more source channels together by passing them as parameters to a mapping function,
// whose output fills the new merged channel. This is different from a map transducer in that the transducer can only
// handle one input channel; this can handle an arbitrary number of source channels. (Consequently, it is not
// composable like a map transducer.)
//
// The returned channel will contain values as long as ALL of the source channels provide values. As soon as one source
// channel is closed, the mapping is complete and the returned channel is also closed.
function map(fn, srcs) {
  var buffer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var dest = (0, _cispy.chan)(buffer);
  var srcLen = srcs.length;
  var values = [];
  var callbacks = [];
  var temp = (0, _cispy.chan)();
  var count = void 0;

  for (var i = 0; i < srcLen; ++i) {
    callbacks[i] = function (index) {
      return function (value) {
        values[index] = value;
        if (--count === 0) {
          (0, _cispy.putAsync)(temp, values.slice());
        }
      };
    }(i);
  }

  (0, _cispy.go)(_regenerator2.default.mark(function _callee6() {
    var _i, _values, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, value;

    return _regenerator2.default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            count = srcLen;
            for (_i = 0; _i < srcLen; ++_i) {
              (0, _cispy.takeAsync)(srcs[_i], callbacks[_i]);
            }
            _context6.next = 4;
            return (0, _cispy.take)(temp);

          case 4:
            _values = _context6.sent;
            _iteratorNormalCompletion5 = true;
            _didIteratorError5 = false;
            _iteratorError5 = undefined;
            _context6.prev = 8;
            _iterator5 = (0, _getIterator3.default)(_values);

          case 10:
            if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
              _context6.next = 18;
              break;
            }

            value = _step5.value;

            if (!(value === _cispy.CLOSED)) {
              _context6.next = 15;
              break;
            }

            (0, _cispy.close)(dest);
            return _context6.abrupt('return');

          case 15:
            _iteratorNormalCompletion5 = true;
            _context6.next = 10;
            break;

          case 18:
            _context6.next = 24;
            break;

          case 20:
            _context6.prev = 20;
            _context6.t0 = _context6['catch'](8);
            _didIteratorError5 = true;
            _iteratorError5 = _context6.t0;

          case 24:
            _context6.prev = 24;
            _context6.prev = 25;

            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }

          case 27:
            _context6.prev = 27;

            if (!_didIteratorError5) {
              _context6.next = 30;
              break;
            }

            throw _iteratorError5;

          case 30:
            return _context6.finish(27);

          case 31:
            return _context6.finish(24);

          case 32:
            _context6.next = 34;
            return (0, _cispy.put)(dest, fn.apply(undefined, (0, _toConsumableArray3.default)(_values)));

          case 34:
            _context6.next = 0;
            break;

          case 36:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, this, [[8, 20, 24, 32], [25,, 27, 31]]);
  }));
  return dest;
}

/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

var _conversion = __webpack_require__(71);

var conversion = _interopRequireWildcard(_conversion);

var _flow = __webpack_require__(72);

var flow = _interopRequireWildcard(_flow);

var _timing = __webpack_require__(74);

var timing = _interopRequireWildcard(_timing);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var util = (0, _assign2.default)({}, conversion, flow, timing); /*
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
// cispy.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.default = util;

/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

exports.debounce = debounce;
exports.throttle = throttle;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

// Ensures that only one value is put onto the input channel in a given delay interval.
//
// By default, the value will not appear on the output channel until the delay expires. If a new value is put onto the
// input channel before that delay expires, the delay timer will restart, and that new value will be put onto the output
// channel after the delay timer expires. There will be no output until no input has happened in
// the delay time.
//
// By passing { immediate: true } as options, the behavior changes. Then the first input is passed to the output
// immediately, but no other output will happen until the delay timer passes without any new input.
//
// Another option, { maxDelay: <number> }, limits how long a debounce operation can last. Regularly, it can go on
// indefinitely as long as input regularly comes before the delay expires. Setting a maxDelay will cause the delay to
// forcefully end after there has been no output in that number of milliseconds.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the debouncing to immediately cease, the output channel to be closed, and any remaining values that had been waiting
// to be output after the debounce timer to instead be discarded.
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
// timing.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions change the timing of inputs being put onto the input channel.

function debounce(src, buffer, delay, options) {
  var buf = isNumber(delay) ? buffer : 0;
  var del = isNumber(delay) ? delay : buffer;
  var opts = (0, _assign2.default)({ leading: false, trailing: true, maxDelay: 0, cancel: (0, _cispy.chan)() }, (isNumber(delay) ? options : delay) || {});

  var dest = (0, _cispy.chan)(buf);
  var leading = opts.leading,
      trailing = opts.trailing,
      maxDelay = opts.maxDelay,
      cancel = opts.cancel;


  (0, _cispy.go)(_regenerator2.default.mark(function _callee() {
    var timer, max, current, _ref, value, channel, timing;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            timer = (0, _cispy.chan)();
            max = (0, _cispy.chan)();
            current = _cispy.CLOSED;

          case 3:
            _context.next = 5;
            return (0, _cispy.alts)([src, timer, max, cancel]);

          case 5:
            _ref = _context.sent;
            value = _ref.value;
            channel = _ref.channel;

            if (!(channel === cancel)) {
              _context.next = 11;
              break;
            }

            (0, _cispy.close)(dest);
            return _context.abrupt('break', 38);

          case 11:
            if (!(channel === src)) {
              _context.next = 30;
              break;
            }

            if (!(value === _cispy.CLOSED)) {
              _context.next = 15;
              break;
            }

            (0, _cispy.close)(dest);
            return _context.abrupt('break', 38);

          case 15:
            timing = timer.timeout;

            timer = (0, _cispy.timeout)(del);

            if (!timing && maxDelay > 0) {
              max = (0, _cispy.timeout)(maxDelay);
            }

            if (!leading) {
              _context.next = 27;
              break;
            }

            if (timing) {
              _context.next = 24;
              break;
            }

            _context.next = 22;
            return (0, _cispy.put)(dest, value);

          case 22:
            _context.next = 25;
            break;

          case 24:
            current = value;

          case 25:
            _context.next = 28;
            break;

          case 27:
            if (trailing) {
              current = value;
            }

          case 28:
            _context.next = 36;
            break;

          case 30:
            timer = (0, _cispy.chan)();
            max = (0, _cispy.chan)();

            if (!(trailing && current !== _cispy.CLOSED)) {
              _context.next = 36;
              break;
            }

            _context.next = 35;
            return (0, _cispy.put)(dest, current);

          case 35:
            current = _cispy.CLOSED;

          case 36:
            _context.next = 3;
            break;

          case 38:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return dest;
}

// Ensures that a value cannot be taken off the output channel more often than a certain interval.
//
// If a number of values are put onto the input channel during the delay, then only the last one will appear after the
// delay has elapsed. The rest will be discarded. In this way, a value appears on the output channel only as often as
// specified by the delay.
//
// By default, the first value (the one that triggers the throttle timer) will appear on the output channel immediately.
// The last value put onto the input channel is then put onto the output channel when the timer elapses, and the delay
// is then restarted. Any values that appear during that subsequent delay will also cause the last value to appear on
// the output channel when the next delay elapses, restarting the delay again, and so on.
//
// By setting the `leading` option to `false`, that initial value will not immediately appear on the output channel.
// Instead, it will appear after the delay elapses, unless another value being put onto the input channel in the
// meantime overwrites it.
//
// By setting the `trailing` option to `false`, no value will be put onto the output channel when the timer elapses.
// Any value that had been put onto the input channel during that delay will be silently dropped. After the delay
// elapses, the next input value will appear on the output channel, and so on.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the throttling to immediately cease, the output channel to be closed, and all remaining throttled values that had
// not yet been put onto the channel to be discarded.
function throttle(src, buffer, delay, options) {
  var buf = isNumber(delay) ? buffer : 0;
  var del = isNumber(delay) ? delay : buffer;
  var opts = (0, _assign2.default)({ leading: true, trailing: true, cancel: (0, _cispy.chan)() }, (isNumber(delay) ? options : delay) || {});

  var dest = (0, _cispy.chan)(buf);
  var leading = opts.leading,
      trailing = opts.trailing,
      cancel = opts.cancel;


  (0, _cispy.go)(_regenerator2.default.mark(function _callee2() {
    var timer, current, _ref2, value, channel, timing;

    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            timer = (0, _cispy.chan)();
            current = _cispy.CLOSED;

          case 2:
            _context2.next = 4;
            return (0, _cispy.alts)([src, timer, cancel]);

          case 4:
            _ref2 = _context2.sent;
            value = _ref2.value;
            channel = _ref2.channel;

            if (!(channel === cancel)) {
              _context2.next = 12;
              break;
            }

            (0, _cispy.close)(dest);
            return _context2.abrupt('break', 40);

          case 12:
            if (!(channel === src)) {
              _context2.next = 30;
              break;
            }

            if (!(value === _cispy.CLOSED)) {
              _context2.next = 16;
              break;
            }

            (0, _cispy.close)(dest);
            return _context2.abrupt('break', 40);

          case 16:
            timing = timer.timeout;

            if (!timing) {
              timer = (0, _cispy.timeout)(del);
            }

            if (!leading) {
              _context2.next = 27;
              break;
            }

            if (timing) {
              _context2.next = 24;
              break;
            }

            _context2.next = 22;
            return (0, _cispy.put)(dest, value);

          case 22:
            _context2.next = 25;
            break;

          case 24:
            if (trailing) {
              current = value;
            }

          case 25:
            _context2.next = 28;
            break;

          case 27:
            if (trailing) {
              current = value;
            }

          case 28:
            _context2.next = 38;
            break;

          case 30:
            if (!(trailing && current !== _cispy.CLOSED)) {
              _context2.next = 37;
              break;
            }

            timer = (0, _cispy.timeout)(del);
            _context2.next = 34;
            return (0, _cispy.put)(dest, current);

          case 34:
            current = _cispy.CLOSED;
            _context2.next = 38;
            break;

          case 37:
            timer = (0, _cispy.chan)();

          case 38:
            _context2.next = 2;
            break;

          case 40:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return dest;
}

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = __webpack_require__(52);

var _promise2 = _interopRequireDefault(_promise);

exports.put = put;
exports.take = take;
exports.takeOrThrow = takeOrThrow;
exports.alts = alts;
exports.sleep = sleep;

var _channel = __webpack_require__(15);

var _operations = __webpack_require__(25);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Puts the value onto the specified channel. A promise is returned which will resolve to `true` once a taker is
// available to take the put value or `false` if the channel closes before such a taker becomes available. If there are
// multiple puts (or put operations from `alts`) queued on the channel and waiting, they will be processed in order as
// take requests happen.
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
// operations.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Operators that can be used on channels. These include out-of-process puts and takes as well as promise-returning
// operations. It does NOT include the operations that must happen within a process, as those are tied tightly to the
// process itself (they return special values that the process can read but are meaningless elsewhere). Those operations
// are in process.js.

function put(channel, value) {
  return new _promise2.default(function (resolve) {
    (0, _operations.putAsync)(channel, value, resolve);
  });
}

// Takes a value from a channel. This returns a promise that resolves as soon as another process puts a value onto the
// channel to be taken, or when the channel closes. The promise resolves to the value that was put, or to `CLOSED` if
// the channel is/was closed.
function take(channel) {
  return new _promise2.default(function (resolve) {
    (0, _operations.takeAsync)(channel, resolve);
  });
}

// Takes a value from a channel. This works exactly like `take`, except that if the value that is taken from the channel
// is an error object, the returned promise is rejected with that error.
function takeOrThrow(channel) {
  return new _promise2.default(function (resolve, reject) {
    (0, _operations.takeAsync)(channel, function (result) {
      if (Error.prototype.isPrototypeOf(result)) {
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
}

// Processes an arbitrary number of puts and takes (represented by the operations array). When the first operation
// successfully completes, the rest are discarded.
//
// Each element of the operations array is one operation. If that element is a channel, then the operation is a take on
// that channel. If the element is a two-element array, the operation is a put operation. These operations are queued
// on their respective channels in a random order. In this case, the first element of the sub-array should be the
// channel to put on, and the second value the value to put on that channel.
//
// This function returns a promise that resolves when the first operation is completed.
//
// Operations are processed in a random order. The first one to come back without blocking, or if they all block, the
// first one to come unblocked, will be the operation that is run. Other operations will be discarded. The successful
// operation will resolve the returned promise into an object. This object has two properties: `value` is the return
// value of the operation (the same as the return value for either a put or a take), and `channel` is the channel on
// which the operation was executed. This way the process has the ability to know which channel was used to provide the
// value.
//
// This function takes an optional object that provides options to the execution. There are two legal options:
// `priority` causes the operations to be queued in the order of the operations array, rather than randomly; `default`
// causes its value to become the return value (with a channel of DEFAULT) if all operations block before completing.
// In this case all of the operations are discarded.
function alts(ops) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  return new _promise2.default(function (resolve) {
    (0, _operations.altsAsync)(ops, resolve, options);
  });
}

// Returns a promise that resolves after a certain amount of time has passed. This is done by creating a local channel
// that isn't exposed to the outside and setting it to close after the required delay. The process then resolves because
// the channel closes. Since the channel is private, there's no way to prematurely resolve the promise.
//
// If no delay is passed, or if that delay is 0, then a new channel won't be created. Instead, the promise will simply
// resolve. This allows an async function to relinquish its control and cause itself to be immediately queued back up to
// be run after all of the other waiting functions (and the event loop) have a chance to run.
function sleep() {
  var delay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

  return new _promise2.default(function (resolve) {
    if (delay === 0) {
      setTimeout(resolve, 0);
    } else {
      var ch = (0, _channel.chan)();
      setTimeout(function () {
        return ch.close();
      }, delay);
      (0, _operations.takeAsync)(ch, resolve);
    }
  });
}

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.into = exports.reduce = undefined;

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _slicedToArray2 = __webpack_require__(26);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = __webpack_require__(34);

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

// Reduces all of the values in the supplied channel by running them through a reduction function. An initial value for
// the reduction function can also be supplied. This is an async function that returns a promise that resolves to the
// result of the reduction, but it will not resolve until the input channel is closed (this is the only way to know
// when all of the data needed for the reduction is present on the channel)'
//
// This is different from transducer reduction, as transducers always reduce to a collection (or channel). This reduce
// can result in a single scalar value.
var reduce = exports.reduce = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(fn, ch, init) {
    var result, value;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            result = init;

          case 1:
            _context.next = 3;
            return take(ch);

          case 3:
            value = _context.sent;

            if (!(value === _cispy.CLOSED)) {
              _context.next = 6;
              break;
            }

            return _context.abrupt('return', result);

          case 6:
            result = fn(result, value);

          case 7:
            _context.next = 1;
            break;

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function reduce(_x, _x2, _x3) {
    return _ref.apply(this, arguments);
  };
}();

// Puts all of the values in the input array onto the supplied channel. If no channel is supplied (if only an array is
// passed), then a new buffered channel of the same length of the array is created. Either way, the channel is returned
// and will close when the last array value has been taken.
//
// This is NOT an async function. It returns a channel, and a channel-returning function can immediately return a
// channel even if the channel doesn't have all of the results on it yet. (In fact, unless it's a buffered channel, it
// *cannot* have all values on it until some are taken.)


// Moves all of the values on a channel into the supplied array. If no array is supplied (if the only parameter passed
// is a channel), then a new and empty array is created to contain the values. This function is async; the promise it
// returns resolves with the resulting array once the input channel has closed.
var into = exports.into = function () {
  var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(array, ch) {
    var _ref6, _ref7, arr, chnl, init;

    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _ref6 = Array.isArray(array) ? [array, ch] : [[], array], _ref7 = (0, _slicedToArray3.default)(_ref6, 2), arr = _ref7[0], chnl = _ref7[1];
            init = arr.slice();
            return _context3.abrupt('return', reduce(function (acc, input) {
              acc.push(input);
              return acc;
            }, chnl, init));

          case 3:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this);
  }));

  return function into(_x4, _x5) {
    return _ref5.apply(this, arguments);
  };
}();

exports.onto = onto;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var put = _cispy.promise.put,
    take = _cispy.promise.take; /*
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
// conversion.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages. These
// functions specifically use async functions rather than processes.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions convert channels into other kinds of data, or vice versa.

function onto(ch, array) {
  var _this = this;

  var _ref2 = Array.isArray(ch) ? [(0, _cispy.chan)(ch.length), ch] : [ch, array],
      _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
      chnl = _ref3[0],
      arr = _ref3[1];

  (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
    var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item;

    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context2.prev = 3;
            _iterator = (0, _getIterator3.default)(arr);

          case 5:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context2.next = 12;
              break;
            }

            item = _step.value;
            _context2.next = 9;
            return put(chnl, item);

          case 9:
            _iteratorNormalCompletion = true;
            _context2.next = 5;
            break;

          case 12:
            _context2.next = 18;
            break;

          case 14:
            _context2.prev = 14;
            _context2.t0 = _context2['catch'](3);
            _didIteratorError = true;
            _iteratorError = _context2.t0;

          case 18:
            _context2.prev = 18;
            _context2.prev = 19;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 21:
            _context2.prev = 21;

            if (!_didIteratorError) {
              _context2.next = 24;
              break;
            }

            throw _iteratorError;

          case 24:
            return _context2.finish(21);

          case 25:
            return _context2.finish(18);

          case 26:
            (0, _cispy.close)(chnl);

          case 27:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, _this, [[3, 14, 18, 26], [19,, 21, 25]]);
  }))();
  return chnl;
}

/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = __webpack_require__(53);

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _getIterator2 = __webpack_require__(11);

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = __webpack_require__(34);

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _symbol = __webpack_require__(16);

var _symbol2 = _interopRequireDefault(_symbol);

exports.pipe = pipe;
exports.partition = partition;
exports.merge = merge;
exports.split = split;
exports.tap = tap;
exports.untap = untap;
exports.untapAll = untapAll;
exports.map = map;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var put = _cispy.promise.put,
    take = _cispy.promise.take,
    alts = _cispy.promise.alts; /*
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
// flow.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// The functions in this file route channels to other channels in different ways.
//
// IN EVERY ONE OF THESE FUNCTIONS the source channel will not be available to be taken from, as all of the source
// channels will have their values taken by the processes within these functions. The lone exception is `tap`, where
// the regular function of the source channel will be restored if all taps are removed. Even so, while at least one tap
// is in place, the source channel cannot be taken from.
//
// These functions all use async/await. They mimic the regular process-based functions.

var protocols = {
  taps: (0, _symbol2.default)('multitap/taps')
};

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

// Takes the values off one channel and, in the same order, puts them onto a different channel. Both channels must be
// provided, and the piping continues until the source channel is closed. At that point the destination channel is also
// closed, though by setting keep-open to `true`, the destination channel closing is prevented.
//
// Because of the option to keep the destination channel open after the source channel closes, pipe can be used to
// convert an automatically-closing channel into one that remains open.
function pipe(src, dest, keepOpen) {
  var loop = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
      var value;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              _context.next = 2;
              return take(src);

            case 2:
              value = _context.sent;

              if (!(value === _cispy.CLOSED)) {
                _context.next = 6;
                break;
              }

              if (!keepOpen) {
                (0, _cispy.close)(dest);
              }
              return _context.abrupt('break', 12);

            case 6:
              _context.next = 8;
              return put(dest, value);

            case 8:
              if (_context.sent) {
                _context.next = 10;
                break;
              }

              return _context.abrupt('break', 12);

            case 10:
              _context.next = 0;
              break;

            case 12:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function loop() {
      return _ref.apply(this, arguments);
    };
  }();

  loop();
  return dest;
}

// Partitions the values from one channel into two new channels. Which channel each value is put onto depends on
// whether it returns `true` or `false` when passed through a supplied predicate function. Both output channels are
// created and returned, and both are closed when the source channel closes.
function partition(fn, src) {
  var tBuffer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var loop = function () {
    var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
      var value;
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return take(src);

            case 2:
              value = _context2.sent;

              if (!(value === _cispy.CLOSED)) {
                _context2.next = 7;
                break;
              }

              (0, _cispy.close)(tDest);
              (0, _cispy.close)(fDest);
              return _context2.abrupt('break', 11);

            case 7:
              _context2.next = 9;
              return put(fn(value) ? tDest : fDest, value);

            case 9:
              _context2.next = 0;
              break;

            case 11:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function loop() {
      return _ref2.apply(this, arguments);
    };
  }();

  var fBuffer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

  var tDest = (0, _cispy.chan)(tBuffer);
  var fDest = (0, _cispy.chan)(fBuffer);

  loop();
  return [tDest, fDest];
}

// Merges the values from two or more source channels into a single channel. The ordering of the values on the new
// channel is indeterminate; it cannot be assumed that each source channel will be cycled through in order. As each
// source channel is closed, it stops providing values to be merged; only when all source channels are closed will the
// new channel close.
function merge(srcs) {
  var loop = function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
      var _ref4, value, channel, index;

      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              if (!(inputs.length === 0)) {
                _context3.next = 2;
                break;
              }

              return _context3.abrupt('break', 15);

            case 2:
              _context3.next = 4;
              return alts(inputs);

            case 4:
              _ref4 = _context3.sent;
              value = _ref4.value;
              channel = _ref4.channel;

              if (!(value === _cispy.CLOSED)) {
                _context3.next = 11;
                break;
              }

              index = inputs.indexOf(channel);

              inputs.splice(index, 1);
              return _context3.abrupt('continue', 13);

            case 11:
              _context3.next = 13;
              return put(dest, value);

            case 13:
              _context3.next = 0;
              break;

            case 15:
              (0, _cispy.close)(dest);

            case 16:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    return function loop() {
      return _ref3.apply(this, arguments);
    };
  }();

  var buffer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  var dest = (0, _cispy.chan)(buffer);
  var inputs = srcs.slice();

  loop();
  return dest;
}

// Splits a channel into an arbitrary number of other channels, all of which will contain whatever values are put on
// the source channel. Essentially this creates some number of copies of the source channel. All of the new channels
// are closed when the source channel is closed.
function split(src) {
  var loop = function () {
    var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
      var value, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, dest, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _dest;

      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.next = 2;
              return take(src);

            case 2:
              value = _context4.sent;

              if (!(value === _cispy.CLOSED)) {
                _context4.next = 24;
                break;
              }

              _iteratorNormalCompletion2 = true;
              _didIteratorError2 = false;
              _iteratorError2 = undefined;
              _context4.prev = 7;

              for (_iterator2 = (0, _getIterator3.default)(dests); !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                dest = _step2.value;

                (0, _cispy.close)(dest);
              }
              _context4.next = 15;
              break;

            case 11:
              _context4.prev = 11;
              _context4.t0 = _context4['catch'](7);
              _didIteratorError2 = true;
              _iteratorError2 = _context4.t0;

            case 15:
              _context4.prev = 15;
              _context4.prev = 16;

              if (!_iteratorNormalCompletion2 && _iterator2.return) {
                _iterator2.return();
              }

            case 18:
              _context4.prev = 18;

              if (!_didIteratorError2) {
                _context4.next = 21;
                break;
              }

              throw _iteratorError2;

            case 21:
              return _context4.finish(18);

            case 22:
              return _context4.finish(15);

            case 23:
              return _context4.abrupt('break', 48);

            case 24:

              count = dests.length;
              _iteratorNormalCompletion3 = true;
              _didIteratorError3 = false;
              _iteratorError3 = undefined;
              _context4.prev = 28;
              for (_iterator3 = (0, _getIterator3.default)(dests); !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                _dest = _step3.value;

                (0, _cispy.putAsync)(_dest, value, cb);
              }
              _context4.next = 36;
              break;

            case 32:
              _context4.prev = 32;
              _context4.t1 = _context4['catch'](28);
              _didIteratorError3 = true;
              _iteratorError3 = _context4.t1;

            case 36:
              _context4.prev = 36;
              _context4.prev = 37;

              if (!_iteratorNormalCompletion3 && _iterator3.return) {
                _iterator3.return();
              }

            case 39:
              _context4.prev = 39;

              if (!_didIteratorError3) {
                _context4.next = 42;
                break;
              }

              throw _iteratorError3;

            case 42:
              return _context4.finish(39);

            case 43:
              return _context4.finish(36);

            case 44:
              _context4.next = 46;
              return take(done);

            case 46:
              _context4.next = 0;
              break;

            case 48:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, this, [[7, 11, 15, 23], [16,, 18, 22], [28, 32, 36, 44], [37,, 39, 43]]);
    }));

    return function loop() {
      return _ref5.apply(this, arguments);
    };
  }();

  var dests = [];

  for (var _len = arguments.length, buffers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    buffers[_key - 1] = arguments[_key];
  }

  var bs = buffers.length === 0 ? [2] : buffers;
  if (bs.length === 1 && isNumber(bs[0])) {
    var _count = bs[0];
    bs = [];
    for (var i = 0; i < _count; ++i) {
      bs.push(0);
    }
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = (0, _getIterator3.default)(bs), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var b = _step.value;

      dests.push((0, _cispy.chan)(b));
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var done = (0, _cispy.chan)();
  var count = 0;

  function cb() {
    if (--count === 0) {
      (0, _cispy.putAsync)(done);
    }
  }

  loop();
  return dests;
}

// Utility function to add the ability to be tapped to a channel that is being tapped. This will add a single property
// to that channel only (named '@@multitap/taps' so as to decrease the chance of collision), but the tapping
// functionality itself is provided outside the channel object. This new property is an array of the channels tapping
// this channel, and it will be removed if all taps are removed.
function tapped(src) {
  var loop = function () {
    var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
      var value, _iteratorNormalCompletion4, _didIteratorError4, _iteratorError4, _iterator4, _step4, _tap;

      return _regenerator2.default.wrap(function _callee5$(_context5) {
        while (1) {
          switch (_context5.prev = _context5.next) {
            case 0:
              _context5.next = 2;
              return take(src);

            case 2:
              value = _context5.sent;

              if (!(value === _cispy.CLOSED || src[protocols.taps].length === 0)) {
                _context5.next = 6;
                break;
              }

              delete src[protocols.taps];
              return _context5.abrupt('break', 30);

            case 6:

              count = src[protocols.taps].length;
              _iteratorNormalCompletion4 = true;
              _didIteratorError4 = false;
              _iteratorError4 = undefined;
              _context5.prev = 10;
              for (_iterator4 = (0, _getIterator3.default)(src[protocols.taps]); !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                _tap = _step4.value;

                (0, _cispy.putAsync)(_tap, value, cb);
              }
              _context5.next = 18;
              break;

            case 14:
              _context5.prev = 14;
              _context5.t0 = _context5['catch'](10);
              _didIteratorError4 = true;
              _iteratorError4 = _context5.t0;

            case 18:
              _context5.prev = 18;
              _context5.prev = 19;

              if (!_iteratorNormalCompletion4 && _iterator4.return) {
                _iterator4.return();
              }

            case 21:
              _context5.prev = 21;

              if (!_didIteratorError4) {
                _context5.next = 24;
                break;
              }

              throw _iteratorError4;

            case 24:
              return _context5.finish(21);

            case 25:
              return _context5.finish(18);

            case 26:
              _context5.next = 28;
              return take(done);

            case 28:
              _context5.next = 0;
              break;

            case 30:
            case 'end':
              return _context5.stop();
          }
        }
      }, _callee5, this, [[10, 14, 18, 26], [19,, 21, 25]]);
    }));

    return function loop() {
      return _ref6.apply(this, arguments);
    };
  }();

  src[protocols.taps] = [];

  var done = (0, _cispy.chan)();
  var count = 0;

  function cb() {
    if (--count === 0) {
      (0, _cispy.putAsync)(done);
    }
  }

  loop();
}

// Taps a source channel with a destination channel to which the source's values will be redirected. Any number of taps
// can be created on a source channel, by calling this function multiple times with the same source and different
// destinations. In that manner this function acts like `split` above in that all of the values put onto the source
// channel will be copied to each tapping channel. There are three major differences from `split` though: the tapping
// channels are -not- closed if the source channel is closed; new destination channels do not have to be created
// (channels that already exist can be passed as destinations); and when all taps are removed, the tapped channel
// reverts to its former behavior (i.e., it becomes a normal channel that can both be put onto and taken from).
//
// In essence, this is intended to be a temporary tap of one already existing channel into another, and when the tap is
// removed, the channels are just as they were before.
function tap(src) {
  var dest = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : (0, _cispy.chan)();

  var taps = src[protocols.taps];
  if (!taps) {
    tapped(src);
  }
  if (!~taps.indexOf(dest)) {
    taps.push(dest);
  }
  return dest;
}

// Removes the tap from the destination channel into the source channel. If the destination channel wasn't tapping the
// source channel to begin with, then nothing will happen. If this function removes the last tap from a source channel,
// that channel will revert to being a normal untapped channel.
function untap(src, dest) {
  var taps = src[protocols.taps];
  if (taps) {
    var index = taps.indexOf(dest);
    if (index !== -1) {
      taps.splice(index, 1);
      if (taps.length === 0) {
        (0, _cispy.putAsync)(src);
      }
    }
  }
}

// Removes all taps from a source channel. Every tapping channel that's removed and the tapped source channel revert to
// being normal channels.
function untapAll(src) {
  if (src[protocols.taps]) {
    src[protocols.taps] = [];
    (0, _cispy.putAsync)(src);
  }
}

// Merges the values from two or more source channels together by passing them as parameters to a mapping function,
// whose output fills the new merged channel. This is different from a map transducer in that the transducer can only
// handle one input channel; this can handle an arbitrary number of source channels. (Consequently, it is not
// composable like a map transducer.)
//
// The returned channel will contain values as long as ALL of the source channels provide values. As soon as one source
// channel is closed, the mapping is complete and the returned channel is also closed.
function map(fn, srcs) {
  var loop = function () {
    var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
      var _i, _values, _iteratorNormalCompletion5, _didIteratorError5, _iteratorError5, _iterator5, _step5, value;

      return _regenerator2.default.wrap(function _callee6$(_context6) {
        while (1) {
          switch (_context6.prev = _context6.next) {
            case 0:
              count = srcLen;
              for (_i = 0; _i < srcLen; ++_i) {
                (0, _cispy.takeAsync)(srcs[_i], callbacks[_i]);
              }
              _context6.next = 4;
              return take(temp);

            case 4:
              _values = _context6.sent;
              _iteratorNormalCompletion5 = true;
              _didIteratorError5 = false;
              _iteratorError5 = undefined;
              _context6.prev = 8;
              _iterator5 = (0, _getIterator3.default)(_values);

            case 10:
              if (_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done) {
                _context6.next = 18;
                break;
              }

              value = _step5.value;

              if (!(value === _cispy.CLOSED)) {
                _context6.next = 15;
                break;
              }

              (0, _cispy.close)(dest);
              return _context6.abrupt('return');

            case 15:
              _iteratorNormalCompletion5 = true;
              _context6.next = 10;
              break;

            case 18:
              _context6.next = 24;
              break;

            case 20:
              _context6.prev = 20;
              _context6.t0 = _context6['catch'](8);
              _didIteratorError5 = true;
              _iteratorError5 = _context6.t0;

            case 24:
              _context6.prev = 24;
              _context6.prev = 25;

              if (!_iteratorNormalCompletion5 && _iterator5.return) {
                _iterator5.return();
              }

            case 27:
              _context6.prev = 27;

              if (!_didIteratorError5) {
                _context6.next = 30;
                break;
              }

              throw _iteratorError5;

            case 30:
              return _context6.finish(27);

            case 31:
              return _context6.finish(24);

            case 32:
              _context6.next = 34;
              return put(dest, fn.apply(undefined, (0, _toConsumableArray3.default)(_values)));

            case 34:
              _context6.next = 0;
              break;

            case 36:
            case 'end':
              return _context6.stop();
          }
        }
      }, _callee6, this, [[8, 20, 24, 32], [25,, 27, 31]]);
    }));

    return function loop() {
      return _ref7.apply(this, arguments);
    };
  }();

  var buffer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

  var dest = (0, _cispy.chan)(buffer);
  var srcLen = srcs.length;
  var values = [];
  var callbacks = [];
  var temp = (0, _cispy.chan)();
  var count = void 0;

  for (var i = 0; i < srcLen; ++i) {
    callbacks[i] = function (index) {
      return function (value) {
        values[index] = value;
        if (--count === 0) {
          (0, _cispy.putAsync)(temp, values.slice());
        }
      };
    }(i);
  }

  loop();
  return dest;
}

/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

var _conversion = __webpack_require__(76);

var conversion = _interopRequireWildcard(_conversion);

var _flow = __webpack_require__(77);

var flow = _interopRequireWildcard(_flow);

var _timing = __webpack_require__(79);

var timing = _interopRequireWildcard(_timing);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var util = (0, _assign2.default)({}, conversion, flow, timing); /*
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
// cispy.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

exports.default = util;

/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = __webpack_require__(13);

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = __webpack_require__(34);

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _assign = __webpack_require__(12);

var _assign2 = _interopRequireDefault(_assign);

exports.debounce = debounce;
exports.throttle = throttle;

var _cispy = __webpack_require__(7);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var put = _cispy.promise.put,
    alts = _cispy.promise.alts; /*
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
// timing.js
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A series of functions meant to operate on the channels that the rest of this library creates and manages.
//
// All of the functions that are here cannot be done with transducers because of the limitations on transducers
// themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
// (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
//
// These functions change the timing of inputs being put onto the input channel.

function isNumber(x) {
  return Object.prototype.toString.call(x) === '[object Number]' && isFinite(x);
}

// Ensures that only one value is put onto the input channel in a given delay interval.
//
// By default, the value will not appear on the output channel until the delay expires. If a new value is put onto the
// input channel before that delay expires, the delay timer will restart, and that new value will be put onto the output
// channel after the delay timer expires. There will be no output until no input has happened in
// the delay time.
//
// By passing { immediate: true } as options, the behavior changes. Then the first input is passed to the output
// immediately, but no other output will happen until the delay timer passes without any new input.
//
// Another option, { maxDelay: <number> }, limits how long a debounce operation can last. Regularly, it can go on
// indefinitely as long as input regularly comes before the delay expires. Setting a maxDelay will cause the delay to
// forcefully end after there has been no output in that number of milliseconds.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the debouncing to immediately cease, the output channel to be closed, and any remaining values that had been waiting
// to be output after the debounce timer to instead be discarded.
function debounce(src, buffer, delay, options) {
  var loop = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
      var timer, max, current, _ref2, value, channel, timing;

      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              timer = (0, _cispy.chan)();
              max = (0, _cispy.chan)();
              current = _cispy.CLOSED;

            case 3:
              _context.next = 5;
              return alts([src, timer, max, cancel]);

            case 5:
              _ref2 = _context.sent;
              value = _ref2.value;
              channel = _ref2.channel;

              if (!(channel === cancel)) {
                _context.next = 11;
                break;
              }

              (0, _cispy.close)(dest);
              return _context.abrupt('break', 38);

            case 11:
              if (!(channel === src)) {
                _context.next = 30;
                break;
              }

              if (!(value === _cispy.CLOSED)) {
                _context.next = 15;
                break;
              }

              (0, _cispy.close)(dest);
              return _context.abrupt('break', 38);

            case 15:
              timing = timer.timeout;

              timer = (0, _cispy.timeout)(del);

              if (!timing && maxDelay > 0) {
                max = (0, _cispy.timeout)(maxDelay);
              }

              if (!leading) {
                _context.next = 27;
                break;
              }

              if (timing) {
                _context.next = 24;
                break;
              }

              _context.next = 22;
              return put(dest, value);

            case 22:
              _context.next = 25;
              break;

            case 24:
              current = value;

            case 25:
              _context.next = 28;
              break;

            case 27:
              if (trailing) {
                current = value;
              }

            case 28:
              _context.next = 36;
              break;

            case 30:
              timer = (0, _cispy.chan)();
              max = (0, _cispy.chan)();

              if (!(trailing && current !== _cispy.CLOSED)) {
                _context.next = 36;
                break;
              }

              _context.next = 35;
              return put(dest, current);

            case 35:
              current = _cispy.CLOSED;

            case 36:
              _context.next = 3;
              break;

            case 38:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this);
    }));

    return function loop() {
      return _ref.apply(this, arguments);
    };
  }();

  var defaults = { leading: false, trailing: true, maxDelay: 0, cancel: (0, _cispy.chan)() };
  var buf = isNumber(delay) ? buffer : 0;
  var del = isNumber(delay) ? delay : buffer;
  var opts = (0, _assign2.default)(defaults, (isNumber(delay) ? options : delay) || {});

  var dest = (0, _cispy.chan)(buf);
  var leading = opts.leading,
      trailing = opts.trailing,
      maxDelay = opts.maxDelay,
      cancel = opts.cancel;


  loop();
  return dest;
}

// Ensures that a value cannot be taken off the output channel more often than a certain interval.
//
// If a number of values are put onto the input channel during the delay, then only the last one will appear after the
// delay has elapsed. The rest will be discarded. In this way, a value appears on the output channel only as often as
// specified by the delay.
//
// By default, the first value (the one that triggers the throttle timer) will appear on the output channel immediately.
// The last value put onto the input channel is then put onto the output channel when the timer elapses, and the delay
// is then restarted. Any values that appear during that subsequent delay will also cause the last value to appear on
// the output channel when the next delay elapses, restarting the delay again, and so on.
//
// By setting the `leading` option to `false`, that initial value will not immediately appear on the output channel.
// Instead, it will appear after the delay elapses, unless another value being put onto the input channel in the
// meantime overwrites it.
//
// By setting the `trailing` option to `false`, no value will be put onto the output channel when the timer elapses.
// Any value that had been put onto the input channel during that delay will be silently dropped. After the delay
// elapses, the next input value will appear on the output channel, and so on.
//
// A channel can be provided to the `cancel` option. If it is, then putting -anything- onto that channel will cause
// the throttling to immediately cease, the output channel to be closed, and all remaining throttled values that had
// not yet been put onto the channel to be discarded.
function throttle(src, buffer, delay, options) {
  var loop = function () {
    var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
      var timer, current, _ref4, value, channel, timing;

      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              timer = (0, _cispy.chan)();
              current = _cispy.CLOSED;

            case 2:
              _context2.next = 4;
              return alts([src, timer, cancel]);

            case 4:
              _ref4 = _context2.sent;
              value = _ref4.value;
              channel = _ref4.channel;

              if (!(channel === cancel)) {
                _context2.next = 12;
                break;
              }

              (0, _cispy.close)(dest);
              return _context2.abrupt('break', 40);

            case 12:
              if (!(channel === src)) {
                _context2.next = 30;
                break;
              }

              if (!(value === _cispy.CLOSED)) {
                _context2.next = 16;
                break;
              }

              (0, _cispy.close)(dest);
              return _context2.abrupt('break', 40);

            case 16:
              timing = timer.timeout;

              if (!timing) {
                timer = (0, _cispy.timeout)(del);
              }

              if (!leading) {
                _context2.next = 27;
                break;
              }

              if (timing) {
                _context2.next = 24;
                break;
              }

              _context2.next = 22;
              return put(dest, value);

            case 22:
              _context2.next = 25;
              break;

            case 24:
              if (trailing) {
                current = value;
              }

            case 25:
              _context2.next = 28;
              break;

            case 27:
              if (trailing) {
                current = value;
              }

            case 28:
              _context2.next = 38;
              break;

            case 30:
              if (!(trailing && current !== _cispy.CLOSED)) {
                _context2.next = 37;
                break;
              }

              timer = (0, _cispy.timeout)(del);
              _context2.next = 34;
              return put(dest, current);

            case 34:
              current = _cispy.CLOSED;
              _context2.next = 38;
              break;

            case 37:
              timer = (0, _cispy.chan)();

            case 38:
              _context2.next = 2;
              break;

            case 40:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    return function loop() {
      return _ref3.apply(this, arguments);
    };
  }();

  var defaults = { leading: true, trailing: true, cancel: (0, _cispy.chan)() };
  var buf = isNumber(delay) ? buffer : 0;
  var del = isNumber(delay) ? delay : buffer;
  var opts = (0, _assign2.default)(defaults, (isNumber(delay) ? options : delay) || {});

  var dest = (0, _cispy.chan)(buf);
  var leading = opts.leading,
      trailing = opts.trailing,
      cancel = opts.cancel;


  loop();
  return dest;
}

/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(88), __esModule: true };

/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(90), __esModule: true };

/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(92), __esModule: true };

/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(93), __esModule: true };

/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(95), __esModule: true };

/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(96), __esModule: true };

/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = { "default": __webpack_require__(98), __esModule: true };

/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.__esModule = true;

var _defineProperty = __webpack_require__(83);

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (obj, key, value) {
  if (key in obj) {
    (0, _defineProperty2.default)(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

/***/ }),
/* 88 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(23);
__webpack_require__(124);
module.exports = __webpack_require__(0).Array.from;

/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(31);
__webpack_require__(23);
module.exports = __webpack_require__(122);

/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(31);
__webpack_require__(23);
module.exports = __webpack_require__(123);

/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(126);
module.exports = __webpack_require__(0).Object.assign;

/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(127);
var $Object = __webpack_require__(0).Object;
module.exports = function create(P, D){
  return $Object.create(P, D);
};

/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(128);
var $Object = __webpack_require__(0).Object;
module.exports = function defineProperty(it, key, desc){
  return $Object.defineProperty(it, key, desc);
};

/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(64);
__webpack_require__(23);
__webpack_require__(31);
__webpack_require__(129);
module.exports = __webpack_require__(0).Promise;

/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(132);
module.exports = __webpack_require__(0).setImmediate;

/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(65);
module.exports = __webpack_require__(0).Symbol['for'];

/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(65);
__webpack_require__(64);
__webpack_require__(130);
__webpack_require__(131);
module.exports = __webpack_require__(0).Symbol;

/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(23);
__webpack_require__(31);
module.exports = __webpack_require__(50).f('iterator');

/***/ }),
/* 99 */
/***/ (function(module, exports) {

module.exports = function(){ /* empty */ };

/***/ }),
/* 100 */
/***/ (function(module, exports) {

module.exports = function(it, Constructor, name, forbiddenField){
  if(!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)){
    throw TypeError(name + ': incorrect invocation!');
  } return it;
};

/***/ }),
/* 101 */
/***/ (function(module, exports, __webpack_require__) {

// false -> Array#indexOf
// true  -> Array#includes
var toIObject = __webpack_require__(10)
  , toLength  = __webpack_require__(46)
  , toIndex   = __webpack_require__(121);
module.exports = function(IS_INCLUDES){
  return function($this, el, fromIndex){
    var O      = toIObject($this)
      , length = toLength(O.length)
      , index  = toIndex(fromIndex, length)
      , value;
    // Array#includes uses SameValueZero equality algorithm
    if(IS_INCLUDES && el != el)while(length > index){
      value = O[index++];
      if(value != value)return true;
    // Array#toIndex ignores holes, Array#includes - not
    } else for(;length > index; index++)if(IS_INCLUDES || index in O){
      if(O[index] === el)return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

/***/ }),
/* 102 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var $defineProperty = __webpack_require__(3)
  , createDesc      = __webpack_require__(22);

module.exports = function(object, index, value){
  if(index in object)$defineProperty.f(object, index, createDesc(0, value));
  else object[index] = value;
};

/***/ }),
/* 103 */
/***/ (function(module, exports, __webpack_require__) {

// all enumerable object keys, includes symbols
var getKeys = __webpack_require__(21)
  , gOPS    = __webpack_require__(41)
  , pIE     = __webpack_require__(28);
module.exports = function(it){
  var result     = getKeys(it)
    , getSymbols = gOPS.f;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = pIE.f
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))result.push(key);
  } return result;
};

/***/ }),
/* 104 */
/***/ (function(module, exports, __webpack_require__) {

var ctx         = __webpack_require__(18)
  , call        = __webpack_require__(58)
  , isArrayIter = __webpack_require__(57)
  , anObject    = __webpack_require__(4)
  , toLength    = __webpack_require__(46)
  , getIterFn   = __webpack_require__(51)
  , BREAK       = {}
  , RETURN      = {};
var exports = module.exports = function(iterable, entries, fn, that, ITERATOR){
  var iterFn = ITERATOR ? function(){ return iterable; } : getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator, result;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
    if(result === BREAK || result === RETURN)return result;
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    result = call(iterator, f, step.value, entries);
    if(result === BREAK || result === RETURN)return result;
  }
};
exports.BREAK  = BREAK;
exports.RETURN = RETURN;

/***/ }),
/* 105 */
/***/ (function(module, exports) {

// fast apply, http://jsperf.lnkit.com/fast-apply/5
module.exports = function(fn, args, that){
  var un = that === undefined;
  switch(args.length){
    case 0: return un ? fn()
                      : fn.call(that);
    case 1: return un ? fn(args[0])
                      : fn.call(that, args[0]);
    case 2: return un ? fn(args[0], args[1])
                      : fn.call(that, args[0], args[1]);
    case 3: return un ? fn(args[0], args[1], args[2])
                      : fn.call(that, args[0], args[1], args[2]);
    case 4: return un ? fn(args[0], args[1], args[2], args[3])
                      : fn.call(that, args[0], args[1], args[2], args[3]);
  } return              fn.apply(that, args);
};

/***/ }),
/* 106 */
/***/ (function(module, exports, __webpack_require__) {

// 7.2.2 IsArray(argument)
var cof = __webpack_require__(17);
module.exports = Array.isArray || function isArray(arg){
  return cof(arg) == 'Array';
};

/***/ }),
/* 107 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var create         = __webpack_require__(40)
  , descriptor     = __webpack_require__(22)
  , setToStringTag = __webpack_require__(29)
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
__webpack_require__(9)(IteratorPrototype, __webpack_require__(1)('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};

/***/ }),
/* 108 */
/***/ (function(module, exports) {

module.exports = function(done, value){
  return {value: value, done: !!done};
};

/***/ }),
/* 109 */
/***/ (function(module, exports, __webpack_require__) {

var getKeys   = __webpack_require__(21)
  , toIObject = __webpack_require__(10);
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};

/***/ }),
/* 110 */
/***/ (function(module, exports, __webpack_require__) {

var META     = __webpack_require__(30)('meta')
  , isObject = __webpack_require__(20)
  , has      = __webpack_require__(8)
  , setDesc  = __webpack_require__(3).f
  , id       = 0;
var isExtensible = Object.isExtensible || function(){
  return true;
};
var FREEZE = !__webpack_require__(19)(function(){
  return isExtensible(Object.preventExtensions({}));
});
var setMeta = function(it){
  setDesc(it, META, {value: {
    i: 'O' + ++id, // object ID
    w: {}          // weak collections IDs
  }});
};
var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add metadata
    if(!create)return 'E';
    // add missing metadata
    setMeta(it);
  // return object ID
  } return it[META].i;
};
var getWeak = function(it, create){
  if(!has(it, META)){
    // can't set metadata to uncaught frozen object
    if(!isExtensible(it))return true;
    // not necessary to add metadata
    if(!create)return false;
    // add missing metadata
    setMeta(it);
  // return hash weak collections IDs
  } return it[META].w;
};
// add metadata on freeze-family methods calling
var onFreeze = function(it){
  if(FREEZE && meta.NEED && isExtensible(it) && !has(it, META))setMeta(it);
  return it;
};
var meta = module.exports = {
  KEY:      META,
  NEED:     false,
  fastKey:  fastKey,
  getWeak:  getWeak,
  onFreeze: onFreeze
};

/***/ }),
/* 111 */
/***/ (function(module, exports, __webpack_require__) {

var global    = __webpack_require__(2)
  , macrotask = __webpack_require__(44).set
  , Observer  = global.MutationObserver || global.WebKitMutationObserver
  , process   = global.process
  , Promise   = global.Promise
  , isNode    = __webpack_require__(17)(process) == 'process';

module.exports = function(){
  var head, last, notify;

  var flush = function(){
    var parent, fn;
    if(isNode && (parent = process.domain))parent.exit();
    while(head){
      fn   = head.fn;
      head = head.next;
      try {
        fn();
      } catch(e){
        if(head)notify();
        else last = undefined;
        throw e;
      }
    } last = undefined;
    if(parent)parent.enter();
  };

  // Node.js
  if(isNode){
    notify = function(){
      process.nextTick(flush);
    };
  // browsers with MutationObserver
  } else if(Observer){
    var toggle = true
      , node   = document.createTextNode('');
    new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
    notify = function(){
      node.data = toggle = !toggle;
    };
  // environments with maybe non-completely correct, but existent Promise
  } else if(Promise && Promise.resolve){
    var promise = Promise.resolve();
    notify = function(){
      promise.then(flush);
    };
  // for other environments - macrotask based on:
  // - setImmediate
  // - MessageChannel
  // - window.postMessag
  // - onreadystatechange
  // - setTimeout
  } else {
    notify = function(){
      // strange IE + webpack dev server bug - use .call(global)
      macrotask.call(global, flush);
    };
  }

  return function(fn){
    var task = {fn: fn, next: undefined};
    if(last)last.next = task;
    if(!head){
      head = task;
      notify();
    } last = task;
  };
};

/***/ }),
/* 112 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// 19.1.2.1 Object.assign(target, source, ...)
var getKeys  = __webpack_require__(21)
  , gOPS     = __webpack_require__(41)
  , pIE      = __webpack_require__(28)
  , toObject = __webpack_require__(47)
  , IObject  = __webpack_require__(56)
  , $assign  = Object.assign;

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = !$assign || __webpack_require__(19)(function(){
  var A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , aLen  = arguments.length
    , index = 1
    , getSymbols = gOPS.f
    , isEnum     = pIE.f;
  while(aLen > index){
    var S      = IObject(arguments[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  } return T;
} : $assign;

/***/ }),
/* 113 */
/***/ (function(module, exports, __webpack_require__) {

var dP       = __webpack_require__(3)
  , anObject = __webpack_require__(4)
  , getKeys  = __webpack_require__(21);

module.exports = __webpack_require__(5) ? Object.defineProperties : function defineProperties(O, Properties){
  anObject(O);
  var keys   = getKeys(Properties)
    , length = keys.length
    , i = 0
    , P;
  while(length > i)dP.f(O, P = keys[i++], Properties[P]);
  return O;
};

/***/ }),
/* 114 */
/***/ (function(module, exports, __webpack_require__) {

var pIE            = __webpack_require__(28)
  , createDesc     = __webpack_require__(22)
  , toIObject      = __webpack_require__(10)
  , toPrimitive    = __webpack_require__(48)
  , has            = __webpack_require__(8)
  , IE8_DOM_DEFINE = __webpack_require__(55)
  , gOPD           = Object.getOwnPropertyDescriptor;

exports.f = __webpack_require__(5) ? gOPD : function getOwnPropertyDescriptor(O, P){
  O = toIObject(O);
  P = toPrimitive(P, true);
  if(IE8_DOM_DEFINE)try {
    return gOPD(O, P);
  } catch(e){ /* empty */ }
  if(has(O, P))return createDesc(!pIE.f.call(O, P), O[P]);
};

/***/ }),
/* 115 */
/***/ (function(module, exports, __webpack_require__) {

// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = __webpack_require__(10)
  , gOPN      = __webpack_require__(61).f
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return gOPN(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.f = function getOwnPropertyNames(it){
  return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
};


/***/ }),
/* 116 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.2.9 / 15.2.3.2 Object.getPrototypeOf(O)
var has         = __webpack_require__(8)
  , toObject    = __webpack_require__(47)
  , IE_PROTO    = __webpack_require__(42)('IE_PROTO')
  , ObjectProto = Object.prototype;

module.exports = Object.getPrototypeOf || function(O){
  O = toObject(O);
  if(has(O, IE_PROTO))return O[IE_PROTO];
  if(typeof O.constructor == 'function' && O instanceof O.constructor){
    return O.constructor.prototype;
  } return O instanceof Object ? ObjectProto : null;
};

/***/ }),
/* 117 */
/***/ (function(module, exports, __webpack_require__) {

var hide = __webpack_require__(9);
module.exports = function(target, src, safe){
  for(var key in src){
    if(safe && target[key])target[key] = src[key];
    else hide(target, key, src[key]);
  } return target;
};

/***/ }),
/* 118 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var global      = __webpack_require__(2)
  , core        = __webpack_require__(0)
  , dP          = __webpack_require__(3)
  , DESCRIPTORS = __webpack_require__(5)
  , SPECIES     = __webpack_require__(1)('species');

module.exports = function(KEY){
  var C = typeof core[KEY] == 'function' ? core[KEY] : global[KEY];
  if(DESCRIPTORS && C && !C[SPECIES])dP.f(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};

/***/ }),
/* 119 */
/***/ (function(module, exports, __webpack_require__) {

// 7.3.20 SpeciesConstructor(O, defaultConstructor)
var anObject  = __webpack_require__(4)
  , aFunction = __webpack_require__(35)
  , SPECIES   = __webpack_require__(1)('species');
module.exports = function(O, D){
  var C = anObject(O).constructor, S;
  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
};

/***/ }),
/* 120 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(45)
  , defined   = __webpack_require__(37);
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};

/***/ }),
/* 121 */
/***/ (function(module, exports, __webpack_require__) {

var toInteger = __webpack_require__(45)
  , max       = Math.max
  , min       = Math.min;
module.exports = function(index, length){
  index = toInteger(index);
  return index < 0 ? max(index + length, 0) : min(index, length);
};

/***/ }),
/* 122 */
/***/ (function(module, exports, __webpack_require__) {

var anObject = __webpack_require__(4)
  , get      = __webpack_require__(51);
module.exports = __webpack_require__(0).getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};

/***/ }),
/* 123 */
/***/ (function(module, exports, __webpack_require__) {

var classof   = __webpack_require__(36)
  , ITERATOR  = __webpack_require__(1)('iterator')
  , Iterators = __webpack_require__(14);
module.exports = __webpack_require__(0).isIterable = function(it){
  var O = Object(it);
  return O[ITERATOR] !== undefined
    || '@@iterator' in O
    || Iterators.hasOwnProperty(classof(O));
};

/***/ }),
/* 124 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var ctx            = __webpack_require__(18)
  , $export        = __webpack_require__(6)
  , toObject       = __webpack_require__(47)
  , call           = __webpack_require__(58)
  , isArrayIter    = __webpack_require__(57)
  , toLength       = __webpack_require__(46)
  , createProperty = __webpack_require__(102)
  , getIterFn      = __webpack_require__(51);

$export($export.S + $export.F * !__webpack_require__(60)(function(iter){ Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
    var O       = toObject(arrayLike)
      , C       = typeof this == 'function' ? this : Array
      , aLen    = arguments.length
      , mapfn   = aLen > 1 ? arguments[1] : undefined
      , mapping = mapfn !== undefined
      , index   = 0
      , iterFn  = getIterFn(O)
      , length, result, step, iterator;
    if(mapping)mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if(iterFn != undefined && !(C == Array && isArrayIter(iterFn))){
      for(iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++){
        createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
      }
    } else {
      length = toLength(O.length);
      for(result = new C(length); length > index; index++){
        createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
      }
    }
    result.length = index;
    return result;
  }
});


/***/ }),
/* 125 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var addToUnscopables = __webpack_require__(99)
  , step             = __webpack_require__(108)
  , Iterators        = __webpack_require__(14)
  , toIObject        = __webpack_require__(10);

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = __webpack_require__(59)(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');

/***/ }),
/* 126 */
/***/ (function(module, exports, __webpack_require__) {

// 19.1.3.1 Object.assign(target, source)
var $export = __webpack_require__(6);

$export($export.S + $export.F, 'Object', {assign: __webpack_require__(112)});

/***/ }),
/* 127 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(6)
// 19.1.2.2 / 15.2.3.5 Object.create(O [, Properties])
$export($export.S, 'Object', {create: __webpack_require__(40)});

/***/ }),
/* 128 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(6);
// 19.1.2.4 / 15.2.3.6 Object.defineProperty(O, P, Attributes)
$export($export.S + $export.F * !__webpack_require__(5), 'Object', {defineProperty: __webpack_require__(3).f});

/***/ }),
/* 129 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var LIBRARY            = __webpack_require__(27)
  , global             = __webpack_require__(2)
  , ctx                = __webpack_require__(18)
  , classof            = __webpack_require__(36)
  , $export            = __webpack_require__(6)
  , isObject           = __webpack_require__(20)
  , aFunction          = __webpack_require__(35)
  , anInstance         = __webpack_require__(100)
  , forOf              = __webpack_require__(104)
  , speciesConstructor = __webpack_require__(119)
  , task               = __webpack_require__(44).set
  , microtask          = __webpack_require__(111)()
  , PROMISE            = 'Promise'
  , TypeError          = global.TypeError
  , process            = global.process
  , $Promise           = global[PROMISE]
  , process            = global.process
  , isNode             = classof(process) == 'process'
  , empty              = function(){ /* empty */ }
  , Internal, GenericPromiseCapability, Wrapper;

var USE_NATIVE = !!function(){
  try {
    // correct subclassing with @@species support
    var promise     = $Promise.resolve(1)
      , FakePromise = (promise.constructor = {})[__webpack_require__(1)('species')] = function(exec){ exec(empty, empty); };
    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
  } catch(e){ /* empty */ }
}();

// helpers
var sameConstructor = function(a, b){
  // with library wrapper special case
  return a === b || a === $Promise && b === Wrapper;
};
var isThenable = function(it){
  var then;
  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
};
var newPromiseCapability = function(C){
  return sameConstructor($Promise, C)
    ? new PromiseCapability(C)
    : new GenericPromiseCapability(C);
};
var PromiseCapability = GenericPromiseCapability = function(C){
  var resolve, reject;
  this.promise = new C(function($$resolve, $$reject){
    if(resolve !== undefined || reject !== undefined)throw TypeError('Bad Promise constructor');
    resolve = $$resolve;
    reject  = $$reject;
  });
  this.resolve = aFunction(resolve);
  this.reject  = aFunction(reject);
};
var perform = function(exec){
  try {
    exec();
  } catch(e){
    return {error: e};
  }
};
var notify = function(promise, isReject){
  if(promise._n)return;
  promise._n = true;
  var chain = promise._c;
  microtask(function(){
    var value = promise._v
      , ok    = promise._s == 1
      , i     = 0;
    var run = function(reaction){
      var handler = ok ? reaction.ok : reaction.fail
        , resolve = reaction.resolve
        , reject  = reaction.reject
        , domain  = reaction.domain
        , result, then;
      try {
        if(handler){
          if(!ok){
            if(promise._h == 2)onHandleUnhandled(promise);
            promise._h = 1;
          }
          if(handler === true)result = value;
          else {
            if(domain)domain.enter();
            result = handler(value);
            if(domain)domain.exit();
          }
          if(result === reaction.promise){
            reject(TypeError('Promise-chain cycle'));
          } else if(then = isThenable(result)){
            then.call(result, resolve, reject);
          } else resolve(result);
        } else reject(value);
      } catch(e){
        reject(e);
      }
    };
    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
    promise._c = [];
    promise._n = false;
    if(isReject && !promise._h)onUnhandled(promise);
  });
};
var onUnhandled = function(promise){
  task.call(global, function(){
    var value = promise._v
      , abrupt, handler, console;
    if(isUnhandled(promise)){
      abrupt = perform(function(){
        if(isNode){
          process.emit('unhandledRejection', value, promise);
        } else if(handler = global.onunhandledrejection){
          handler({promise: promise, reason: value});
        } else if((console = global.console) && console.error){
          console.error('Unhandled promise rejection', value);
        }
      });
      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
    } promise._a = undefined;
    if(abrupt)throw abrupt.error;
  });
};
var isUnhandled = function(promise){
  if(promise._h == 1)return false;
  var chain = promise._a || promise._c
    , i     = 0
    , reaction;
  while(chain.length > i){
    reaction = chain[i++];
    if(reaction.fail || !isUnhandled(reaction.promise))return false;
  } return true;
};
var onHandleUnhandled = function(promise){
  task.call(global, function(){
    var handler;
    if(isNode){
      process.emit('rejectionHandled', promise);
    } else if(handler = global.onrejectionhandled){
      handler({promise: promise, reason: promise._v});
    }
  });
};
var $reject = function(value){
  var promise = this;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  promise._v = value;
  promise._s = 2;
  if(!promise._a)promise._a = promise._c.slice();
  notify(promise, true);
};
var $resolve = function(value){
  var promise = this
    , then;
  if(promise._d)return;
  promise._d = true;
  promise = promise._w || promise; // unwrap
  try {
    if(promise === value)throw TypeError("Promise can't be resolved itself");
    if(then = isThenable(value)){
      microtask(function(){
        var wrapper = {_w: promise, _d: false}; // wrap
        try {
          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
        } catch(e){
          $reject.call(wrapper, e);
        }
      });
    } else {
      promise._v = value;
      promise._s = 1;
      notify(promise, false);
    }
  } catch(e){
    $reject.call({_w: promise, _d: false}, e); // wrap
  }
};

// constructor polyfill
if(!USE_NATIVE){
  // 25.4.3.1 Promise(executor)
  $Promise = function Promise(executor){
    anInstance(this, $Promise, PROMISE, '_h');
    aFunction(executor);
    Internal.call(this);
    try {
      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
    } catch(err){
      $reject.call(this, err);
    }
  };
  Internal = function Promise(executor){
    this._c = [];             // <- awaiting reactions
    this._a = undefined;      // <- checked in isUnhandled reactions
    this._s = 0;              // <- state
    this._d = false;          // <- done
    this._v = undefined;      // <- value
    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
    this._n = false;          // <- notify
  };
  Internal.prototype = __webpack_require__(117)($Promise.prototype, {
    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
    then: function then(onFulfilled, onRejected){
      var reaction    = newPromiseCapability(speciesConstructor(this, $Promise));
      reaction.ok     = typeof onFulfilled == 'function' ? onFulfilled : true;
      reaction.fail   = typeof onRejected == 'function' && onRejected;
      reaction.domain = isNode ? process.domain : undefined;
      this._c.push(reaction);
      if(this._a)this._a.push(reaction);
      if(this._s)notify(this, false);
      return reaction.promise;
    },
    // 25.4.5.1 Promise.prototype.catch(onRejected)
    'catch': function(onRejected){
      return this.then(undefined, onRejected);
    }
  });
  PromiseCapability = function(){
    var promise  = new Internal;
    this.promise = promise;
    this.resolve = ctx($resolve, promise, 1);
    this.reject  = ctx($reject, promise, 1);
  };
}

$export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: $Promise});
__webpack_require__(29)($Promise, PROMISE);
__webpack_require__(118)(PROMISE);
Wrapper = __webpack_require__(0)[PROMISE];

// statics
$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
  // 25.4.4.5 Promise.reject(r)
  reject: function reject(r){
    var capability = newPromiseCapability(this)
      , $$reject   = capability.reject;
    $$reject(r);
    return capability.promise;
  }
});
$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
  // 25.4.4.6 Promise.resolve(x)
  resolve: function resolve(x){
    // instanceof instead of internal slot check because we should fix it without replacement native Promise core
    if(x instanceof $Promise && sameConstructor(x.constructor, this))return x;
    var capability = newPromiseCapability(this)
      , $$resolve  = capability.resolve;
    $$resolve(x);
    return capability.promise;
  }
});
$export($export.S + $export.F * !(USE_NATIVE && __webpack_require__(60)(function(iter){
  $Promise.all(iter)['catch'](empty);
})), PROMISE, {
  // 25.4.4.1 Promise.all(iterable)
  all: function all(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , resolve    = capability.resolve
      , reject     = capability.reject;
    var abrupt = perform(function(){
      var values    = []
        , index     = 0
        , remaining = 1;
      forOf(iterable, false, function(promise){
        var $index        = index++
          , alreadyCalled = false;
        values.push(undefined);
        remaining++;
        C.resolve(promise).then(function(value){
          if(alreadyCalled)return;
          alreadyCalled  = true;
          values[$index] = value;
          --remaining || resolve(values);
        }, reject);
      });
      --remaining || resolve(values);
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  },
  // 25.4.4.4 Promise.race(iterable)
  race: function race(iterable){
    var C          = this
      , capability = newPromiseCapability(C)
      , reject     = capability.reject;
    var abrupt = perform(function(){
      forOf(iterable, false, function(promise){
        C.resolve(promise).then(capability.resolve, reject);
      });
    });
    if(abrupt)reject(abrupt.error);
    return capability.promise;
  }
});

/***/ }),
/* 130 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(49)('asyncIterator');

/***/ }),
/* 131 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(49)('observable');

/***/ }),
/* 132 */
/***/ (function(module, exports, __webpack_require__) {

var $export = __webpack_require__(6)
  , $task   = __webpack_require__(44);
$export($export.G + $export.B, {
  setImmediate:   $task.set,
  clearImmediate: $task.clear
});

/***/ }),
/* 133 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {// This method of obtaining a reference to the global object needs to be
// kept identical to the way it is obtained in runtime.js
var g =
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this;

// Use `getOwnPropertyNames` because not all browsers support calling
// `hasOwnProperty` on the global `self` object in a worker. See #183.
var hadRuntime = g.regeneratorRuntime &&
  Object.getOwnPropertyNames(g).indexOf("regeneratorRuntime") >= 0;

// Save the old regeneratorRuntime in case it needs to be restored later.
var oldRuntime = hadRuntime && g.regeneratorRuntime;

// Force reevalutation of runtime.js.
g.regeneratorRuntime = undefined;

module.exports = __webpack_require__(134);

if (hadRuntime) {
  // Restore the original runtime.
  g.regeneratorRuntime = oldRuntime;
} else {
  // Remove the global property added by runtime.js.
  try {
    delete g.regeneratorRuntime;
  } catch(e) {
    g.regeneratorRuntime = undefined;
  }
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(67)))

/***/ }),
/* 134 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function(global) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = typeof module === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  runtime.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  runtime.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if (typeof process === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  runtime.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return runtime.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        if (delegate.iterator.return) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };
})(
  // Among the various tricks for obtaining a reference to the global
  // object, this seems to be the most reliable technique that does not
  // use indirect eval (which violates Content Security Policy).
  typeof global === "object" ? global :
  typeof window === "object" ? window :
  typeof self === "object" ? self : this
);

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(67), __webpack_require__(66)))

/***/ }),
/* 135 */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(7);


/***/ })
/******/ ]);
});