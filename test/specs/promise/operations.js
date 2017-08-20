/* eslint-disable max-lines */

// ********************************************************************************************************************
// IMPORTANT NOTE
//
// These tests are currently non-deterministic, because I don't yet have a way to fake timers in the context of native
// promises. These tests are largely done with actual small delays, which means that normal, short delays in execution
// can cause them to fail. They're good enough for me to check as I'm coding, but they're not good enough to run in a
// CI environment or just for someone who wants to run the tests to ensure correctness.
//
// For this reason, I'm calling `skip` on all tests of promise-based channels until I work out how to make these tests
// deterministic.
// ********************************************************************************************************************

const { expect } = require('../../helper');
const sinon = require('sinon');

const { chan, close, CLOSED, DEFAULT } = require('../../../src/core/channel');
const { putAsync, takeAsync } = require('../../../src/core/operations');
const { config, SET_TIMEOUT } = require('../../../src/core/dispatcher');
const { put, take, takeOrThrow, alts, sleep } = require('../../../src/promise/operations');

// As of the writing of this comment (the initial production of this test file), this is basically a copy of all of the
// tests in core.js that are relevant for promise-based channel operations.

describe.skip('Promise functions', () => {
  // Sleep continues to vex, as the promise-based version fails while using Sinon's fake timers. I've opted to
  // leave in a test using raw setTimeout calls set to short enough to not make the testing process too long, but
  // I'm not particularly pleased about it.
  describe('sleep', () => {
    // let clock;

    before(() => config({ dispatchMethod: SET_TIMEOUT }));
    // beforeEach(() => (clock = sinon.useFakeTimers()));
    // afterEach(() => clock.restore());
    after(() => config({ dispatchMethod: null }));

    it('causes an async function to block for a certain amount of time', done => {
      const spy = sinon.spy();

      async function proc() {
        await sleep(25);
        spy();
      }
      proc();

      // clock.tick(250);
      // expect(spy).not.to.be.called;
      setTimeout(() => expect(spy).not.to.be.called, 10);

      // clock.tick(500);
      // expect(spy).to.be.called;
      setTimeout(() => {
        expect(spy).to.be.called;
        done();
      }, 40);
    });
  });

  describe('take', () => {
    it('returns a value that was put onto a channel', done => {
      const ch = chan();

      async function taker() {
        const value = await take(ch);
        expect(value).to.equal(1729);
        done();
      }

      async function putter() {
        await put(ch, 1729);
      }

      taker();
      putter();
    });

    it('returns the value even if it is an error obejct', done => {
      const ch = chan();
      const obj = Error('test error');

      async function taker() {
        expect(await take(ch)).to.equal(obj);
        done();
      }

      async function putter() {
        await put(ch, obj);
      }

      taker();
      putter();
    });

    it('returns a value that was putAsync onto a channel', done => {
      const ch = chan();

      async function taker() {
        expect(await take(ch)).to.equal(1729);
        done();
      }

      putAsync(ch, 1729);
      taker();
    });

    it('blocks until there is a value on the channel', done => {
      const spy = sinon.spy();
      const ch = chan();

      async function taker() {
        await take(ch);
        spy();
      }

      async function putter() {
        // ensures the take happens first
        await sleep();
        expect(spy).not.to.be.called;
        await put(ch, 1729);
        // necessary because put doesn't block when there's a pending take
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      taker();
      putter();
    });
  });

  describe('put', () => {
    it('puts a value onto a channel for take', done => {
      const ch = chan();

      async function putter() {
        await put(ch, 1729);
      }

      async function taker() {
        expect(await take(ch)).to.equal(1729);
        done();
      }

      putter();
      taker();
    });

    it('puts a value onto a channel for takeAsync', done => {
      const ch = chan();

      async function putter() {
        await put(ch, 1729);
      }

      takeAsync(ch, value => {
        expect(value).to.equal(1729);
        done();
      });

      putter();
    });

    it('does not require being in an async function if nothing is being done with the return value', done => {
      const ch = chan();

      put(ch, 1729);

      async function taker() {
        expect(await take(ch)).to.equal(1729);
        done();
      }

      taker();
    });

    it('does not allow putting CLOSED onto a channel', done => {
      const ch = chan();

      async function test() {
        try {
          await put(ch, CLOSED);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal('Cannot put CLOSED on a channel');
        } finally {
          done();
        }
      }

      test();
    });

    it('returns true if invoked on an open channel', done => {
      const ch = chan();

      async function putter() {
        // necessary so the put doesn't block, but we don't await it because we don't
        // want the take itself to block and we don't care about its value
        take(ch);
        expect(await put(ch, 1729)).to.be.true;
        done();
      }

      putter();
    });

    it('returns false if invoked on a closed channel', done => {
      const ch = chan();

      async function putter() {
        close(ch);
        expect(await put(ch, 1729)).to.be.false;
        done();
      }

      putter();
    });

    it('blocks until a value is taken off the channel', done => {
      const spy = sinon.spy();
      const ch = chan();

      async function putter() {
        await put(ch, 1729);
        spy();
      }

      async function taker() {
        await sleep();
        expect(spy).not.to.be.called;
        await take(ch);
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      putter();
      taker();
    });
  });

  describe('alts', () => {
    function numTrue(array) {
      return array.filter(x => x).length;
    }

    let chs;

    beforeEach(() => (chs = [chan(), chan(), chan()]));

    it('accepts a value off exactly one channel at a time', done => {
      put(chs[1], 1);
      put(chs[0], 0);
      put(chs[2], 2);

      async function test() {
        const called = [false, false, false];

        const alt1 = await alts(chs);
        called[alt1.value] = true;
        expect(numTrue(called)).to.equal(1);

        const alt2 = await alts(chs);
        called[alt2.value] = true;
        expect(numTrue(called)).to.equal(2);

        const alt3 = await alts(chs);
        called[alt3.value] = true;
        expect(numTrue(called)).to.equal(3);

        done();
      }

      test();
    });

    it('puts values onto exactly one channel at a time', done => {
      const called = [false, false, false];

      (async () => {
        for (let i = 1; i <= 3; ++i) {
          await alts([[chs[0], 0], [chs[1], 1], [chs[2], 2]]);
          await sleep();
          expect(numTrue(called)).to.equal(i);
          await sleep();
        }
        done();
      })();

      (async () => {
        expect(await take(chs[0])).to.equal(0);
        called[0] = true;
      })();

      (async () => {
        expect(await take(chs[1])).to.equal(1);
        called[1] = true;
      })();

      (async () => {
        expect(await take(chs[2])).to.equal(2);
        called[2] = true;
      })();
    });

    it('can handle takes and puts in the same call', done => {
      const called = [false, false, false];

      (async () => {
        for (let i = 1; i <= 3; ++i) {
          await alts([chs[0], [chs[1], 1], chs[2]]);
          await sleep();
          expect(numTrue(called)).to.equal(i);
        }
        done();
      })();

      (async () => {
        await put(chs[0]);
        called[0] = true;
      })();

      (async () => {
        expect(await take(chs[1])).to.equal(1);
        called[1] = true;
      })();

      (async () => {
        await put(chs[2]);
        called[2] = true;
      })();
    });

    it('throws an error if no operations are provided', done => {
      async function test() {
        try {
          await alts([]);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal('Alts called with no operations');
        } finally {
          done();
        }
      }
      test();
    });

    it('can take a priority option to explicitly order operations', done => {
      put(chs[1], 1);
      put(chs[2], 2);
      put(chs[0], 0);

      async function test() {
        await sleep();

        const alt1 = await alts(chs, { priority: true });
        expect(alt1.value).to.equal(0);
        expect(alt1.channel).to.equal(chs[0]);

        const alt2 = await alts(chs, { priority: true });
        expect(alt2.value).to.equal(1);
        expect(alt2.channel).to.equal(chs[1]);

        const alt3 = await alts(chs, { priority: true });
        expect(alt3.value).to.equal(2);
        expect(alt3.channel).to.equal(chs[2]);

        done();
      }
      test();
    });

    it('blocks if none of the operations is ready yet', done => {
      const spy = sinon.spy();

      async function setup() {
        for (let i = 0; i < 3; ++i) {
          await alts([chs[0], [chs[1], 1], chs[2]]);
          spy();
          await sleep();
        }
      }

      async function test() {
        await sleep();
        expect(spy).not.to.be.called;
        await put(chs[0], 0);
        await sleep();
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      setup();
      test();
    });

    it('returns a default if one is provided and it would otherwise block', done => {
      async function test() {
        const { value, channel } = await alts(chs, { default: 1729 });
        expect(value).to.equal(1729);
        expect(channel).to.equal(DEFAULT);
        done();
      }
      test();
    });

    it('does not return the default if there is a value available', done => {
      const chs = [chan(1), chan(1), chan(1)];
      const ctrl = chan();

      async function setup() {
        await put(chs[0], 1729);
        await put(ctrl);
      }

      async function test() {
        await take(ctrl);
        const { value, channel } = await alts(chs, { default: 1723 });
        expect(value).to.equal(1729);
        expect(channel).to.equal(chs[0]);
        done();
      }

      setup();
      test();
    });
  });

  describe('takeOrThrow', () => {
    it('acts like a take if no error object is taken from the channel', done => {
      const ch = chan();
      put(ch, 1729);

      async function taker() {
        expect(await takeOrThrow(ch)).to.equal(1729);
        done();
      }
      taker();
    });

    it('throws the error if an error object is taken from the channel', done => {
      const ch = chan();
      const ctrl = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      async function taker() {
        try {
          await takeOrThrow(ch);
          expect.fail();
        } catch (ex) {
          expect(ex).to.equal(err);
          spy();
          await put(ctrl);
        }
      }

      async function test() {
        await take(ctrl);
        expect(spy).to.be.calledOnce;
        done();
      }

      put(ch, err);
      taker();
      test();
    });

    it('lets the function continue running if it catches the error', done => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      async function proc() {
        try {
          await takeOrThrow(ch);
        } catch (ex) {
          expect(ex.message).to.equal('test error');
          spy();
        }
        return 1729;
      }

      async function test() {
        expect(await proc()).to.equal(1729);
        expect(spy).to.be.calledOnce;
        done();
      }

      put(ch, err);
      test();
    });

    it('allows the function to run further operations if it catches the error', done => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      async function proc() {
        try {
          await takeOrThrow(ch);
        } catch (ex) {
          expect(ex.message).to.equal('test error');
          spy();
        }
        expect(await takeOrThrow(ch)).to.equal(1729);
      }

      async function test() {
        await proc();
        expect(spy).to.be.calledOnce;
        done();
      }

      async function setup() {
        await put(ch, err);
        await put(ch, 1729);
      }

      setup();
      test();
    });
  });
});
