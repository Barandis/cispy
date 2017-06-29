/* eslint-disable max-lines */
const { expect } = require('../../helper');

const { fixed, dropping, sliding } = require('../../../src/core/buffers');
const { chan, close, CLOSED } = require('../../../src/core/channel');
const { go, sleep, put, take } = require('../../../src/generator/operations');
const p = require('../../../src/core/protocol').protocols;

const t = require('xduce');

describe('CSP channel', () => {
  it('is not a timeout channel, no matter how it was created via chan', () => {
    expect(chan().timeout).to.be.false;
    expect(chan(0).timeout).to.be.false;
    expect(chan(3).timeout).to.be.false;
    expect(chan(fixed(3)).timeout).to.be.false;
    expect(chan(dropping(3)).timeout).to.be.false;
    expect(chan(sliding(3)).timeout).to.be.false;
    expect(chan(1, t.map((x) => x)).timeout).to.be.false;
    expect(chan(1, t.map((x) => x), (e) => { throw e; }).timeout).to.be.false;
  });

  it('cannot queue more than 1024 puts at once', (done) => {
    const ch = chan();

    try {
      for (let i = 0; i < 1025; ++i) {
        go(function* () {
          yield put(ch, i);
        });
      }
      expect.fail();
    } catch (ex) {
      expect(ex.message).to.equal('No more than 1024 pending puts are allowed on a single channel');
    } finally {
      done();
    }
  });

  it('cannot queue more than 1024 takes at once', (done) => {
    const ch = chan();

    try {
      for (let i = 0; i < 1025; ++i) {
        go(function* () {
          yield take(ch);
        });
      }
      expect.fail();
    } catch (ex) {
      expect(ex.message).to.equal('No more than 1024 pending takes are allowed on a single channel');
    } finally {
      done();
    }
  });

  it('can configure how many pending puts/takes to allow', (done) => {
    const ch = chan(0, null, null, {maxQueued: 2});

    try {
      for (let i = 0; i < 3; ++i) {
        go(function* () {
          yield take(ch);
        });
      }
      expect.fail();
    } catch (ex) {
      expect(ex.message).to.equal('No more than 2 pending takes are allowed on a single channel');
    } finally {
      done();
    }
  });

  describe('buffer argument', () => {
    it('defaults to being unbuffered', (done) => {
      const ch = chan();
      expect(ch.buffered).to.be.false;

      go(function* () {
        yield put(ch, 1729);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });
    });

    it('provides a fixed buffer if given a number', (done) => {
      const ch = chan(3);
      expect(ch.buffered).to.be.true;

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        yield put(ch, 4);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1);
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(3);
        expect(yield take(ch)).to.equal(4);
        done();
      });
    });

    it('creates an unbuffered channel if 0 is passed', (done) => {
      const ch = chan(0);
      expect(ch.buffered).to.be.false;

      go(function* () {
        yield put(ch, 1729);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });
    });

    it('accepts fixed buffers', (done) => {
      const ch = chan(fixed(3));
      expect(ch.buffered).to.be.true;

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        yield put(ch, 4);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1);
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(3);
        expect(yield take(ch)).to.equal(4);
        done();
      });
    });

    it('accepts dropping buffers', (done) => {
      const ch = chan(dropping(3));

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        // This one is just dropped
        yield put(ch, 4);
        close(ch);
      });

      go(function* () {
        // This makes the four puts happen before the first take does, letting the channel fill before something
        // is taken off of it
        for (let i = 0; i < 4; ++i) {
          yield sleep();
        }
        expect(yield take(ch)).to.equal(1);
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(3);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });

    it('accepts sliding buffers', (done) => {
      const ch = chan(sliding(3));
      expect(ch.buffered).to.be.true;

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        // This one causes the first value to be dropped
        yield put(ch, 4);
        close(ch);
      });

      go(function* () {
        // Run all 4 puts before the first take
        for (let i = 0; i < 4; ++i) {
          yield sleep();
        }
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(3);
        expect(yield take(ch)).to.equal(4);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });
  });

  describe('transducers argument', () => {
    const even = (x) => x % 2 === 0;

    it('can modify values on the channel before they\'re taken', (done) => {
      const ch = chan(1, t.map((x) => x + 1));

      go(function* () {
        yield put(ch, 1);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(2);
        done();
      });
    });

    it('can accept transducers that return fewer values than were passed', (done) => {
      const ch = chan(1, t.filter(even));

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        close(ch);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });

    it('closes the channel if hte transducer reduces the value early', (done) => {
      const ch = chan(3, t.take(2));

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1);
        expect(yield take(ch)).to.equal(2);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });

    it('handles composed transformers', (done) => {
      const xform = t.compose(t.map((x) => x * 3), t.filter(even), t.take(3));
      const ch = chan(10, xform);

      go(function* () {
        for (const i of [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]) {
          yield put(ch, i);
        }
      });

      go(function* () {
        expect(yield take(ch)).to.equal(0);
        expect(yield take(ch)).to.equal(6);
        expect(yield take(ch)).to.equal(24);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });

    it('correctly closes the channel even if another taker is active', (done) => {
      const ch = chan(10, t.compose(t.flatten(), t.take(3)));
      const out = chan();
      const ctrl = chan();

      go(function* () {
        for (const i of [0, 1, 2, 3, 4]) {
          yield put(ch, [i, i]);
        }
        yield put(ctrl);
        yield put(ctrl);
      });

      go(function* () {
        yield take(ctrl);
        yield take(ch);
        const value = yield take(ch);
        yield put(out, value === CLOSED ? 'closed' : value);
      });

      go(function* () {
        yield take(ctrl);
        yield take(ch);
        const value = yield take(ch);
        yield put(out, value === CLOSED ? 'closed' : value);
      });

      go(function* () {
        const value1 = yield take(out);
        const value2 = yield take(out);
        expect(value1 === 'closed' || value2 === 'closed').to.be.true;
        expect(value1 === 'closed' && value2 === 'closed').to.be.false;
        done();
      });
    });
  });

  describe('handler argument', () => {
    const stepErrorTransducer = (xform) => ({
      [p.step]() { throw Error('step error'); },
      [p.result](value) { return xform[p.result](value); }
    });

    const resultErrorTransducer = (xform) => ({
      [p.step](acc, input) { return xform[p.step](acc, input); },
      [p.result]() { throw Error('result error'); }
    });

    const oneTimeStepErrorTransducer = (xform) => ({
      count: 0,
      [p.step](acc, input) {
        if (this.count++ === 0) {
          throw Error('step error');
        }
        return xform[p.step](acc, input);
      },
      [p.result](value) { return xform[p.result](value); }
    });

    const mustBe1729Transducer = (xform) => ({
      [p.step](acc, input) {
        if (input !== 1729) { throw Error('not 1729!'); }
        return xform[p.step](acc, input);
      },
      [p.result](value) { return xform[p.result](value); }
    });

    it('provides a way to handle an error that happens in the step function of a transducer', (done) => {
      const exh = (ex) => {
        expect(ex.message).to.equal('step error');
        done();
      };

      const ch = chan(1, stepErrorTransducer, exh);
      go(function* () {
        yield put(ch, 1);
      });

      go(function* () {
        // The step function runs when a channel is taken from, so
        yield take(ch);
      });
    });

    it('provides a way to handle an error that happens in the result function of a transducer', (done) => {
      const exh = (ex) => {
        expect(ex.message).to.equal('result error');
        done();
      };

      const ch = chan(1, resultErrorTransducer, exh);

      go(function* () {
        yield put(ch, 1);
      });

      go(function* () {
        yield take(ch);
        // The result function doesn't run until the channel is closed, so we have to call close to make this work
        close(ch);
      });
    });

    it('provides a default handler that simply makes nothing available', (done) => {
      const ch = chan(1, oneTimeStepErrorTransducer);

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 1729);
      });

      go(function* () {
        // The one-time error transducer throws an error the first time, for the 1, which is ignored
        // The second put, with 1729, completes successfully
        expect(yield take(ch)).to.equal(1729);
        done();
      });
    });

    it('puts its return value onto the channel in place of whatever caused the error', (done) => {
      const exh = () => 2317;
      const ch = chan(1, mustBe1729Transducer, exh);

      go(function* () {
        yield put(ch);
        yield put(ch, 1729);
        yield put(ch, 42);
        yield put(ch, 27);
      });

      go(function* () {
        // only the put that actually put 1729 doens't error, the error handler returns 2317 for the others
        expect(yield take(ch)).to.equal(2317);
        expect(yield take(ch)).to.equal(1729);
        expect(yield take(ch)).to.equal(2317);
        expect(yield take(ch)).to.equal(2317);
        done();
      });
    });
  });
});
