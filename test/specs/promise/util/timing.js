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

const { expect } = require('../../../helper');
const sinon = require('sinon');

const { chan, fixedBuffer, put, take, sleep, close, CLOSED, util } = require('../../../../src/promise');

const { debounce, throttle } = util;

// Sinon timers do not work well with async functions, apparently. I can't get these to pass using sinon, but I can
// get them to pass just fine using actual timing. It slows down the tests by a lot, but that appears to be a price
// that has to be paid.
//
// It also makes the tests non-deterministic, which is a big problem. Most of them pass all the time, some of them pass
// most of the time, one or two pass maybe half the time. This is the result of using actual (small) delays in the
// tests, where conditions on the computer running it can change enough to turn that 50ms into 150ms. I'm retaining the
// tests because I can still use them to test correctness in a more inconvenient way, but until I figure out how to do
// this deterministically with native promises, I'm skipping them so they don't cause problems on CI.
describe.skip('Promise-based channel timing functions', () => {
  describe('debounce', () => {
    it('can accept a buffer value for the output channel', done => {
      const input = chan();
      const output = debounce(input, fixedBuffer(1), 100);
      const spy = sinon.spy();

      (async () => {
        expect(await take(output)).to.equal(1729);
        spy();
      })();

      (async () => {
        expect(spy).not.to.be.called;
        await put(input, 1729);

        await sleep(75);
        expect(spy).not.to.be.called;

        await sleep(50);
        expect(spy).to.be.called;

        done();
      })();
    });

    it('closes the output channel when the input channel closes', done => {
      const input = chan();
      const output = debounce(input, 100);

      (async () => {
        expect(await take(output)).to.equal(CLOSED);
        done();
      })();

      close(input);
    });

    describe('with trailing option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100);
      });

      it('holds the input value until the delay expires', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);

          await sleep(75);
          expect(spy).not.to.be.called;

          await sleep(50);
          expect(spy).to.be.called;

          done();
        })();
      });

      it('restarts the delay if another value is put on the input channel', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1723);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep(75);
          expect(spy).not.to.be.called;

          await put(input, 1723);
          await sleep(75);
          expect(spy).not.to.be.called;

          await sleep(50);
          expect(spy).to.be.called;

          done();
        })();
      });
    });

    describe('with leading option and no trailing option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { leading: true, trailing: false });
      });

      it('returns the input value immediately', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep();
          expect(spy).to.be.called;
          done();
        })();
      });

      it('will not allow another input value through until the delay expires', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          expect(await take(output)).to.equal(3271);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          expect(spy).not.to.be.called;
          await sleep(75);

          await put(input, 1723);
          expect(spy).not.to.be.called;
          await sleep(75);

          await put(input, 9271);
          expect(spy).not.to.be.called;
          await sleep(150);

          await put(input, 3271);
          await sleep();
          expect(spy).to.be.called;

          done();
        })();
      });
    });

    describe('with both leading and trailing option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { leading: true });
      });

      it('returns the input value immediately', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep();
          expect(spy).to.be.called;
          done();
        })();
      });

      it('does not return a single input value after the delay expires', done => {
        (async () => {
          expect(await take(output)).to.equal(1729);
          expect(await take(output)).to.equal(1723);
          done();
        })();

        (async () => {
          await put(input, 1729);
          await sleep(125);
          await put(input, 1723);
        })();
      });

      it('does return a second input value after the delay expires', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
          expect(await take(output)).to.equal(1723);
          spy();
          expect(await take(output)).to.equal(9271);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(50);
          expect(spy).to.be.calledOnce;

          await put(input, 1723);
          await sleep(50);
          expect(spy).to.be.calledOnce;

          await sleep(75);
          expect(spy).to.be.calledTwice;

          await put(input, 9271);
          await sleep();
          expect(spy).to.be.calledThrice;

          done();
        })();
      });
    });

    describe('with maxDelay option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { maxDelay: 250 });
      });

      it('interrupts the debounce delay after maxDelay elapses', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(75);
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(75);
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(75);
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(75);
          expect(spy).to.be.called;

          done();
        })();
      });

      it('restarts the maxDelay if the delay is allowed to elapse', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(150);
          expect(spy).to.be.calledOnce;

          await put(input, 1729);
          await sleep(75);
          expect(spy).to.be.calledOnce;

          await put(input, 1729);
          await sleep(75);
          expect(spy).to.be.calledOnce;

          await put(input, 1729);
          await sleep(75);
          expect(spy).to.be.calledOnce;

          await put(input, 1729);
          await sleep(75);
          expect(spy).to.be.calledTwice;

          done();
        })();
      });
    });

    describe('with cancel option', () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = debounce(input, 100, { cancel });
      });

      it('cancels debouncing and closes the output channel if a value is put onto the cancel channel', done => {
        (async () => {
          expect(await take(output)).to.equal(1729);
          expect(await take(output)).to.equal(CLOSED);
          done();
        })();

        (async () => {
          await put(input, 1729);
          await sleep(125);
          await put(input, 1723);
          await sleep(50);
          await put(cancel);
        })();
      });
    });
  });

  describe('throttle', () => {
    it('can accept a buffer value for the output channel', done => {
      const input = chan();
      const output = throttle(input, fixedBuffer(1), 100);
      const spy = sinon.spy();

      (async () => {
        expect(await take(output)).to.equal(1729);
        spy();
      })();

      (async () => {
        expect(spy).not.to.be.called;
        await put(input, 1729);

        await sleep(75);
        expect(spy).to.be.called;

        done();
      })();
    });

    it('closes the output channel when the input channel closes', done => {
      const input = chan();
      const output = throttle(input, 100);

      (async () => {
        expect(await take(output)).to.equal(CLOSED);
        done();
      })();

      close(input);
    });

    describe('with leading and trailing options', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100);
      });

      it('returns the first input value immediately', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep();
          expect(spy).to.be.called;
          done();
        })();
      });

      it('does not return a single input value after the delay expires', done => {
        (async () => {
          expect(await take(output)).to.equal(1729);
          expect(await take(output)).to.equal(1723);
          done();
        })();

        (async () => {
          await put(input, 1729);
          await sleep(125);
          await put(input, 1723);
        })();
      });

      it('does return a second input value after the delay expires', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
          expect(await take(output)).to.equal(1723);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(50);
          expect(spy).to.be.calledOnce;

          await put(input, 1723);
          await sleep(25);
          expect(spy).to.be.calledOnce;

          await sleep(50);
          expect(spy).to.be.calledTwice;

          done();
        })();
      });

      it('restarts the timer without waiting for a new initial input', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
          expect(await take(output)).to.equal(1723);
          spy();
          expect(await take(output)).to.equal(9271);
          spy();
          expect(await take(output)).to.equal(3271);
          spy();
        })();

        (async () => {
          await put(input, 1729);
          await sleep(50);
          expect(spy).to.be.calledOnce;

          await put(input, 1723);
          expect(spy).to.be.calledOnce;

          await sleep(75);
          expect(spy).to.be.calledTwice;
          await put(input, 9271);
          expect(spy).to.be.calledTwice;

          await sleep(100);
          expect(spy).to.be.calledThrice;
          await put(input, 3271);
          expect(spy).to.be.calledThrice;

          await sleep(100);
          expect(spy.callCount).to.equal(4);

          done();
        })();
      });
    });

    describe('with leading option only', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, { trailing: false });
      });

      it('returns the first value immediately', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep();
          expect(spy).to.be.called;
          done();
        })();
      });

      it('drops any input that is put before the delay elapses', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep(5);
          expect(spy).to.be.calledOnce;

          for (let i = 0; i < 5; ++i) {
            await put(input, 9999);
            await sleep(10);
            expect(spy).to.be.calledOnce;
          }

          await sleep(75);
          await put(input, 1729);
          await sleep();
          expect(spy).to.be.calledTwice;

          done();
        })();
      });
    });

    describe('with trailing option only', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, { leading: false });
      });

      it('returns a single value after the delay has elapsed', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1729);
          await sleep();
          expect(spy).not.to.be.called;

          await sleep(50);
          expect(spy).not.to.be.called;

          await sleep(75);
          expect(spy).to.be.called;

          done();
        })();
      });

      it('returns only the last input to happen before the delay has elapsed', done => {
        const spy = sinon.spy();

        (async () => {
          expect(await take(output)).to.equal(1729);
          spy();
        })();

        (async () => {
          expect(spy).not.to.be.called;
          await put(input, 1723);
          await sleep(25);
          expect(spy).not.to.be.called;

          await put(input, 9271);
          await sleep(25);
          expect(spy).not.to.be.called;

          await put(input, 3271);
          await sleep(25);
          expect(spy).not.to.be.called;

          await put(input, 1729);
          await sleep(5);
          expect(spy).not.to.be.called;

          await sleep(45);
          expect(spy).to.be.calledOnce;

          done();
        })();
      });
    });

    describe('with cancel option', () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = throttle(input, 100, { cancel });
      });

      it('cancels throttling and closes the output channel if a value is placed onto the cancel channel', done => {
        (async () => {
          expect(await take(output)).to.equal(1729);
          expect(await take(output)).to.equal(CLOSED);
          done();
        })();

        (async () => {
          await put(input, 1729);
          await put(input, 1723);
          await sleep(50);
          await put(cancel);
        })();
      });
    });
  });
});
