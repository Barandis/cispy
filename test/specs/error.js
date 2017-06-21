import { expect } from '../helper';
import sinon from 'sinon';

import {
  go,
  goSafe,
  chan,
  put,
  take
} from '../../src/api';

describe('An error thrown from the process itself', () => {
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
