# Cispy: CSP for JavaScript

An implementation of Communicating Sequential Processes, inspired by Go and Clojure, for JavaScript

[![Version](https://img.shields.io/npm/v/cispy.svg)](https://www.npmjs.com/package/cispy)
[![Build Status](https://travis-ci.org/Barandis/cispy.svg?branch=master)](https://travis-ci.org/Barandis/cispy)
[![Coverage Status](https://coveralls.io/repos/github/Barandis/cispy/badge.svg)](https://coveralls.io/github/Barandis/cispy)
[![Downloads](https://img.shields.io/npm/dm/cispy.svg)](http://npm-stats.com/~packages/cispy)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![License](https://img.shields.io/github/license/Barandis/cispy.svg)](https://opensource.org/licenses/MIT)

Communicating Sequential Processes (CSP) is a mechanism for concurrency originally formulated by Tony Hoare in 1978 and brought into the mainstream by languages such as Go (where it is [built into the language](https://tour.golang.org/concurrency/1)) and Clojure (when it was included in the [core.async](http://clojure.github.io/core.async) package). CSP consists of processes, which are single lines of execution not dissimilar to threads, and channels to communicate between them. Concurrent programming becomes much simpler when its only communication happens with these channels rather than with shared memory. This is an idea realized by other mechanisms as well, such as the Actor model popular in Erlang, Elixir, and Scala.

In JavaScript, CSP became feasible with the release of generators in ES2015, but the now-widely-supported async function has really brought it into its own. Async functions serve as processes by themselves, and when combined with some small utility functions and channels, they drastically improve the ease of programming concurrently (especially when compared to the callbacks that have traditionally been used for this purpose).

```javascript
// A simple pong example using cispy CSP
// Adaptation of Go code at https://talks.golang.org/2013/advconc.slide#6

const { go, put, take, sleep, chan, close, CLOSED } = cispy;
const table = chan();

async function main() {
  const ball = { hits: 0 };
  go(player, 'ping');
  go(player, 'pong');

  await put(table, ball);
  await sleep(10000);
  close(table);
}

async function player(name) {
  for (;;) {
    const ball = await take(table);
    if (ball === CLOSED) {
      console.log(`${name} finished.`);
      break;
    }
    ball.hits++;
    console.log(`${name}: ${ball.hits}`);
    await sleep(500);
    await put(table, ball);
  }
}

go(main);
```

## Features

- Full implementation of channels, including the dispatch mechanism to make them act nicely
- Utility functions to make "async functions as processes" work more elegantly
- Channels will accept any value other than `CLOSED`, including `null` and `undefined`
- Channels are independent of processes (unlike the Actor model), so each can have an arbitrary number of senders and receivers
- Processes have the ability to listen to multiple channels simultaneously and respond to the first action
- Values on channels can be modified by transducers, available in the [xduce](https://barandis.github.io/xduce) library
- A full suite of channel utilities for combining, separating, tapping and throttling channels, etc.

## Documentation

See [the github.io page](https://barandis.github.io/cispy) for all of the documentation.

## License

[MIT](https://raw.githubusercontent.com/Barandis/cispy/master/LICENSE) License
