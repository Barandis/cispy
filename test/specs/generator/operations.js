/* eslint-disable max-lines */
const { expect } = require('../../helper');
const sinon = require('sinon');

const { chan, close, CLOSED, DEFAULT } = require('../../../src/core/channel');
const { putAsync, takeAsync } = require('../../../src/core/operations');
const { config, SET_TIMEOUT } = require('../../../src/core/dispatcher');
const { go, goSafe, sleep, put, take, alts, takeOrThrow } = require('../../../src/generator/operations');

describe('Core CSP', () => {
  // Annoyingly, it appears that setImmediate isn't working with Sinon's fake timers (or lolex's, for that matter).
  // Timing tests all fail when using them. I have tested that these work as expected when using normal (non-faked),
  // timers, but in order to execute these tests in a reasonable amount of time, the delays have to be so short as to
  // occasionally fail just through randomness in execution time. Therefore I'm using the config option to force the
  // use of setTimeout here in all environments (in fact it's why I wrote the option to change the dispatch method).

  describe('sleep', () => {
    let clock;

    before(() => config({dispatchMethod: SET_TIMEOUT}));
    beforeEach(() => (clock = sinon.useFakeTimers()));
    afterEach(() => clock.restore());
    after(() => config({dispatchMethod: null}));

    it('causes a process to block for a certain amount of time', () => {
      const spy = sinon.spy();

      go(function* () {
        yield sleep(500);
        spy();
      });

      clock.tick(250);
      expect(spy).not.to.be.called;

      clock.tick(300);
      expect(spy).to.be.called;
    });
  });

  describe('take', () => {
    it('returns a value that was put onto a channel', (done) => {
      const ch = chan();

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });

      go(function* () {
        yield put(ch, 1729);
      });
    });

    it('returns the value even if it is an error object', (done) => {
      const ch = chan();
      const obj = Error('test error');

      go(function* () {
        expect(yield take(ch)).to.equal(obj);
        done();
      });

      go(function* () {
        yield put(ch, obj);
      });
    });

    it('returns a value that was putAsync onto a channel', (done) => {
      const ch = chan();

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });

      putAsync(ch, 1729);
    });

    it('blocks until there is a value on the channel', (done) => {
      const spy = sinon.spy();
      const ch = chan();

      go(function* () {
        yield take(ch);
        spy();
      });

      go(function* () {
        // ensures the take happens first
        yield sleep();
        expect(spy).not.to.be.called;
        yield put(ch, 1729);
        // necessary because put doesn't block when there's a pending take
        yield sleep();
        expect(spy).to.be.called;
        done();
      });
    });

    it('blocks until the channel is closed', (done) => {
      const spy = sinon.spy();
      const ch = chan();

      go(function* () {
        expect(yield take(ch)).to.equal(CLOSED);
        spy();
      });

      go(function* () {
        yield sleep();
        expect(spy).not.to.be.called;
        close(ch);
        // necessary because closing a channel doesn't block
        yield sleep();
        expect(spy).to.be.called;
        done();
      });
    });
  });

  describe('put', () => {
    it('puts a value onto a channel for take', (done) => {
      const ch = chan();

      go(function* () {
        yield put(ch, 1729);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });
    });

    it('puts a value onto a channel for takeAsync', (done) => {
      const ch = chan();

      go(function* () {
        yield put(ch, 1729);
      });

      takeAsync(ch, (value) => {
        expect(value).to.equal(1729);
        done();
      });
    });

    it('does not allow putting CLOSED onto a channel', (done) => {
      const ch = chan();

      try {
        go(function* () {
          yield put(ch, CLOSED);
          expect.fail();
        });
      } catch (ex) {
        expect(ex.message).to.equal('Cannot put CLOSED on a channel');
      } finally {
        done();
      }
    });

    it('returns true if invoked on an open channel', (done) => {
      const ch = chan();
      go(function* () { yield take(ch); });

      go(function* () {
        expect(yield put(ch, 1729)).to.be.true;
        done();
      });
    });

    it('returns false if invoked on a closed channel', (done) => {
      const ch = chan();

      go(function* () {
        close(ch);
        expect(yield put(ch, 1729)).to.be.false;
        done();
      });
    });

    it('blocks until a value is taken off the channel', (done) => {
      const spy = sinon.spy();
      const ch = chan();

      go(function* () {
        yield put(ch, 1729);
        spy();
      });

      go(function* () {
        yield sleep();
        expect(spy).not.to.be.called;
        yield take(ch);
        yield sleep();
        expect(spy).to.be.called;
        done();
      });
    });
  });

  describe('alts', () => {
    function numTrue(array) {
      return array.filter((x) => x).length;
    }

    let chs;

    beforeEach(() => (chs = [chan(), chan(), chan()]));

    it('accepts a value off exactly one channel at a time', (done) => {
      go(function* () { yield put(chs[0], 0); });
      go(function* () { yield put(chs[1], 1); });
      go(function* () { yield put(chs[2], 2); });

      go(function* () {
        const called = [false, false, false];

        let alt = yield alts(chs);
        called[alt.value] = true;
        expect(numTrue(called)).to.equal(1);

        alt = yield alts(chs);
        called[alt.value] = true;
        expect(numTrue(called)).to.equal(2);

        alt = yield alts(chs);
        called[alt.value] = true;
        expect(numTrue(called)).to.equal(3);

        done();
      });
    });

    it('puts values onto exactly one channel at a time', (done) => {
      const called = [false, false, false];

      go(function* () {
        for (let i = 1; i <= 3; ++i) {
          yield alts([[chs[0], 0], [chs[1], 1], [chs[2], 2]]);
          yield sleep();
          expect(numTrue(called)).to.equal(i);
        }
        done();
      });

      go(function* () {
        expect(yield take(chs[0])).to.equal(0);
        called[0] = true;
      });

      go(function* () {
        expect(yield take(chs[1])).to.equal(1);
        called[1] = true;
      });

      go(function* () {
        expect(yield take(chs[2])).to.equal(2);
        called[2] = true;
      });
    });

    it('can handle takes and puts in the same call', (done) => {
      const called = [false, false, false];

      go(function* () {
        for (let i = 1; i <= 3; ++i) {
          yield alts([chs[0], [chs[1], 1], chs[2]]);
          yield sleep();
          expect(numTrue(called)).to.equal(i);
        }
        done();
      });

      go(function* () {
        yield put(chs[0]);
        called[0] = true;
      });

      go(function* () {
        expect(yield take(chs[1])).to.equal(1);
        called[1] = true;
      });

      go(function* () {
        yield put(chs[2]);
        called[2] = true;
      });
    });

    it('throws an error if no operations are provided', (done) => {
      try {
        go(function* () {
          yield alts([]);
          expect.fail();
        });
      } catch (ex) {
        expect(ex.message).to.equal('Alts called with no operations');
      } finally {
        done();
      }
    });

    it('can take a priority option to explicitly order operations', (done) => {
      go(function* () { yield put(chs[1], 1); });
      go(function* () { yield put(chs[2], 2); });
      go(function* () { yield put(chs[0], 0); });

      go(function* () {
        yield sleep();

        let alt = yield alts(chs, { priority: true });
        expect(alt.value).to.equal(0);
        expect(alt.channel).to.equal(chs[0]);

        alt = yield alts(chs, { priority: true });
        expect(alt.value).to.equal(1);
        expect(alt.channel).to.equal(chs[1]);

        alt = yield alts(chs, { priority: true });
        expect(alt.value).to.equal(2);
        expect(alt.channel).to.equal(chs[2]);

        done();
      });
    });

    it('blocks if none of the operations is ready yet', (done) => {
      const spy = sinon.spy();

      go(function* () {
        for (let i = 0; i < 3; ++i) {
          yield alts([chs[0], [chs[1], 1], chs[2]]);
          spy();
        }
      });

      go(function* () {
        yield sleep();
        expect(spy).not.to.be.called;
        yield put(chs[0], 0);
        yield sleep();
        expect(spy).to.be.called;
        done();
      });
    });

    it('returns a default if one is provided and it would otherwise block', (done) => {
      go(function* () {
        const {value, channel} = yield alts(chs, {default: 1729});
        expect(value).to.equal(1729);
        expect(channel).to.equal(DEFAULT);
        done();
      });
    });

    it('does not return the default if there is a value available', (done) => {
      const chs = [chan(1), chan(1), chan(1)];
      const ctrl = chan();

      go(function* () {
        yield put(chs[0], 1729);
        yield put(ctrl);
      });

      go(function* () {
        yield take(ctrl);
        const {value, channel} = yield alts(chs, {default: 1723});
        expect(value).to.equal(1729);
        expect(channel).to.equal(chs[0]);
        done();
      });
    });
  });

  describe('takeOrThrow', () => {
    it('acts like a take if no error object is taken from the channel', (done) => {
      const ch = chan();

      go(function* () {
        expect(yield takeOrThrow(ch)).to.equal(1729);
        done();
      });

      go(function* () {
        yield put(ch, 1729);
      });
    });

    it('throws the error back into the process if an error object is taken from the channel', (done) => {
      // We have to use a handler to catch errors that come after the first yield
      // Hence making goSafe in the first place
      const ch = chan();
      const ctrl = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      const exh = (ex) => {
        expect(ex).to.equal(err);
        spy();
        putAsync(ctrl);
      };

      goSafe(function* () {
        yield takeOrThrow(ch);
      }, exh);

      go(function* () {
        yield put(ch, err);
      });

      go(function* () {
        yield take(ctrl);
        expect(spy).to.be.calledOnce;
        done();
      });
    });

    it('lets the process continue running if the process catches the error', (done) => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      const proc = go(function* () {
        try {
          yield takeOrThrow(ch);
        } catch (ex) {
          expect(ex.message).to.equal('test error');
          spy();
        }
        return 1729;
      });

      go(function* () {
        yield put(ch, err);
      });

      go(function* () {
        expect(yield take(proc)).to.equal(1729);
        expect(spy).to.be.calledOnce;
        done();
      });
    });

    it('allows the process to make further yields if it catches the error', (done) => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error('test error');

      const proc = go(function* () {
        try {
          yield takeOrThrow(ch);
        } catch (ex) {
          expect(ex.message).to.equal('test error');
          spy();
        }
        expect(yield take(ch)).to.equal(1729);
      });

      go(function* () {
        yield put(ch, err);
        yield put(ch, 1729);
      });

      go(function* () {
        yield take(proc);
        expect(spy).to.be.calledOnce;
        done();
      });
    });
  });

  describe('yield without an instruction', () => {
    it('is sent back into the process with no effect', (done) => {
      const ch = chan();

      go(function* () {
        yield 1729;
        yield put(ch, 1723);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1723);
        done();
      });
    });
  });
});
