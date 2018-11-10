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
 * A series of functions meant to operate on the channels that the rest of this library creates and manages.
 *
 * All of the functions that are here cannot be done with transducers because of the limitations on transducers
 * themselves. Thus, you will not find filter or chunk or take here, as those functions can be done with transducers.
 * (You will find a map here, but this one maps multiple channels into one, which cannot be done with transducers.)
 *
 * @module cispy/utils
 */

/**
 * A set of utility functions using processes to work with channels.
 *
 * These are all accessed through the `cispy.utils` namespace; e.g.,
 * `{@link module:cispy/utils~CispyUtils.reduce|reduce}` can be called like this:
 *
 * ```
 * const output = cispy.utils.reduce((acc, value) => acc + value, ch, 0);
 * ```
 *
 * @namespace CispyUtils
 */

/**
 * A function used to reduce a collection of values into a single value via a reducer function.
 *
 * @callback reducer
 * @param {*} acc The accumulated value from the prior reduction step. If this is the first reduction step, this will
 *     be set to some initial value (either an explicit value or the first value of the collection).
 * @param {*} value The next value of the collection.
 * @return {*} The result of reducing the next value into the current accumulated value.
 */

/**
 * A function that tests a single input argument, returning `true` or `false` according to whether the argument passed
 * the test.
 *
 * @callback predicate
 * @param {*} value The value to test.
 * @return {boolean} Whether or not the value passed the test.
 */

/**
 * A function that takes a number of values and transforms them into a different value.
 *
 * @callback mapper
 * @param {...*} inputs The input values.
 * @return {*} The output value, calculated based on the input values.
 */

const conversion = require('./conversion');
const flow = require('./flow');
const timing = require('./timing');

module.exports = Object.assign({}, conversion, flow, timing);
