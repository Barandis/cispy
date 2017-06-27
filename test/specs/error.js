import { expect } from '../helper';
import sinon from 'sinon';

import {
  go,
  goSafe,
  chan,
  put,
  putUnblocked,
  take,
  takeOrThrow
} from '../../src/api';

describe('An error thrown from the process itself', () => {
  // This ONLY works if the error is thrown before the first yield
  // After the function is yielded once, it's running asynchronously and the try/catch block will have
  // exited already
  it('can be caught by the code that creates the process', () => {
    expect(() => {
      /* eslint-disable require-yield */
      go(function* () {
        throw Error('test error');
      });
      /* eslint-enable require-yield */
    }).to.throw('test error');
  });
});

describe('Process created with goSafe', () => {
  it('handles errors with an exception handling function', () => {
    const spy = sinon.spy();
    const exh = (ex) => {
      spy();
      expect(ex.message).to.equal('test error');
    };
    /* eslint-disable require-yield */
    const proc = function* () {
      throw Error('test error');
    };
    /* eslint-enable require-yield */

    expect(() => goSafe(proc, exh)).not.to.throw();
    expect(spy).to.be.calledOnce;
  });

  it('still throws like a go-produced process if the exception handler is not a function', () => {
    expect(() => {
      /* eslint-disable require-yield */
      goSafe(function* () {
        throw Error('test error');
      }, 42);
      /* eslint-enable require-yield */
    }).to.throw('test error');
  });

  it("still returns a channel which will close with the exception handler's return value on it", (done) => {
    const exh = (ex) => ex.message;

    /* eslint-disable require-yield */
    const proc = goSafe(function* () {
      throw Error('test error');
    }, exh);
    /* eslint-enable require-yield */

    go(function* () {
      expect(yield take(proc)).to.equal('test error');
      done();
    });
  });

  it('catches exceptions thrown even after a yield', (done) => {
    const ch = chan();
    const exh = (ex) => ex.message;

    const proc = goSafe(function* () {
      yield put(ch, 1729);
      throw Error('test error');
    }, exh);

    go(function* () {
      expect(yield take(ch)).to.equal(1729);
    });

    go(function* () {
      expect(yield take(proc)).to.equal('test error');
      done();
    });
  });

  it('can have arguments just like regular go', (done) => {
    const ch = chan();
    const exh = (ex) => ex.message;

    const proc = goSafe(function* (arg) {
      yield put(ch, arg);
      throw Error('test error');
    }, exh, 1729);

    go(function* () {
      expect(yield take(ch)).to.equal(1729);
    });

    go(function* () {
      expect(yield take(proc)).to.equal('test error');
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
      putUnblocked(ctrl);
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
