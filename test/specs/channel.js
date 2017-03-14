import { expect } from '../helper';

import {
  go,
  chan,
  sleep,
  put,
  take,
  buffers,
  config,
  CLOSED
} from '../../src/api';

import * as t from 'xduce';

describe('CSP channel', () => {
  it('is not a timeout channel, no matter how it was created via chan', () => {
    expect(chan().timeout).to.be.false;
    expect(chan(0).timeout).to.be.false;
    expect(chan(3).timeout).to.be.false;
    expect(chan(buffers.fixed(3)).timeout).to.be.false;
    expect(chan(buffers.dropping(3)).timeout).to.be.false;
    expect(chan(buffers.sliding(3)).timeout).to.be.false;
    expect(chan(1, t.map(x => x)).timeout).to.be.false;
    expect(chan(1, t.map(x => x), e => { throw e; }).timeout).to.be.false;
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
    }
    catch (ex) {
      expect(ex.message).to.equal('No more than 1024 pending puts are allowed on a single channel');
    }
    finally {
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
    }
    catch (ex) {
      expect(ex.message).to.equal('No more than 1024 pending takes are allowed on a single channel');
    }
    finally {
      done();
    }
  });

  it('can configure how many pending puts/takes to allow', (done) => {
    config({maxQueuedOps: 2});
    const ch = chan();

    try {
      for (let i = 0; i < 3; ++i) {
        go(function* () {
          yield take(ch);
        });
      }
      expect.fail();
    }
    catch (ex) {
      expect(ex.message).to.equal('No more than 2 pending takes are allowed on a single channel');
    }
    finally {
      config({maxQueuedOps: 1024});
      done();
    }
  });

  describe('buffer option', () => {
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
      const ch = chan(buffers.fixed(3));
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
      const ch = chan(buffers.dropping(3));

      go(function* () {
        yield put(ch, 1);
        yield put(ch, 2);
        yield put(ch, 3);
        // This one is just dropped
        yield put(ch, 4);
        ch.close();
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
      const ch = chan(buffers.sliding(3));
      expect(ch.buffered).to.be.true;

      go(function* () {
        yield put (ch, 1);
        yield put (ch, 2);
        yield put (ch, 3);
        // This one causes the first value to be dropped
        yield put (ch, 4);
        ch.close();
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

  describe('transducers option', () => {
    const even = (x) => x % 2 === 0;

    it('can modify values on the channel before they\'re taken', (done) => {
      const ch = chan(1, t.map(x => x + 1));

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
        ch.close();
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
      const xform = t.compose(t.map(x => x * 3), t.filter(even), t.take(3));
      const ch = chan(10, xform);

      go(function* () {
        for (let i of [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]) {
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
        for (let i of [0, 1, 2, 3, 4]) {
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
});
