const { expect } = require('../../helper');
const sinon = require('sinon');

const { chan, CLOSED } = require('../../../src/core/channel');
const { go, goSafe, put, take } = require('../../../src/generator/operations');
const { process } = require('../../../src/generator/process');

describe('Generator process', () => {
  describe('go', () => {
    it('can accept arguments for the supplied process', done => {
      const ch = chan();

      go(
        function*(x, y) {
          yield put(ch, x - y);
        },
        1729,
        10
      );

      go(function*() {
        expect(yield take(ch)).to.equal(1719);
        done();
      });
    });

    it('returns a channel that receives the return value from the process', done => {
      /* eslint-disable require-yield */
      const ch = go(function*() {
        return 1729;
      });
      /* eslint-enable require-yield */
      go(function*() {
        expect(yield take(ch)).to.equal(1729);
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });

    it('closes the return value if the process return value is CLOSED', done => {
      /* eslint-disable require-yield */
      const ch = go(function*() {
        return CLOSED;
      });
      /* eslint-enable require-yield */
      go(function*() {
        expect(yield take(ch)).to.equal(CLOSED);
        done();
      });
    });
  });

  describe('An error thrown from the process itself', () => {
    // This ONLY works if the error is thrown before the first yield
    // After the function is yielded once, it's running asynchronously and the try/catch block will have
    // exited already
    it('can be caught by the code that creates the process', () => {
      expect(() => {
        /* eslint-disable require-yield */
        go(function*() {
          throw Error('test error');
        });
        /* eslint-enable require-yield */
      }).to.throw('test error');
    });
  });

  describe('Process created with goSafe', () => {
    it('handles errors with an exception handling function', () => {
      const spy = sinon.spy();
      const exh = ex => {
        spy();
        expect(ex.message).to.equal('test error');
      };
      /* eslint-disable require-yield */
      const proc = function*() {
        throw Error('test error');
      };
      /* eslint-enable require-yield */

      expect(() => goSafe(proc, exh)).not.to.throw();
      expect(spy).to.be.calledOnce;
    });

    it('still throws like a go-produced process if the exception handler is not a function', () => {
      expect(() => {
        /* eslint-disable require-yield */
        goSafe(function*() {
          throw Error('test error');
        }, 42);
        /* eslint-enable require-yield */
      }).to.throw('test error');
    });

    it("still returns a channel which will close with the exception handler's return value on it", done => {
      const exh = ex => ex.message;

      /* eslint-disable require-yield */
      const proc = goSafe(function*() {
        throw Error('test error');
      }, exh);
      /* eslint-enable require-yield */

      go(function*() {
        expect(yield take(proc)).to.equal('test error');
        done();
      });
    });

    it('catches exceptions thrown even after a yield', done => {
      const ch = chan();
      const exh = ex => ex.message;

      const proc = goSafe(function*() {
        yield put(ch, 1729);
        throw Error('test error');
      }, exh);

      go(function*() {
        expect(yield take(ch)).to.equal(1729);
      });

      go(function*() {
        expect(yield take(proc)).to.equal('test error');
        done();
      });
    });

    it('can have arguments just like regular go', done => {
      const ch = chan();
      const exh = ex => ex.message;

      const proc = goSafe(
        function*(arg) {
          yield put(ch, arg);
          throw Error('test error');
        },
        exh,
        1729
      );

      go(function*() {
        expect(yield take(ch)).to.equal(1729);
      });

      go(function*() {
        expect(yield take(proc)).to.equal('test error');
        done();
      });
    });
  });

  describe('finished process', () => {
    it('returns when trying to run it again', done => {
      /* eslint-disable require-yield */
      const gen = function*() {
        return 1729;
      };
      /* eslint-enable require-yield */
      const onFinish = value => {
        expect(value).to.equal(1729);
        expect(proc.run()).to.be.undefined;
        done();
      };

      const proc = process(gen(), null, onFinish);
      proc.run();
    });
  });
});
