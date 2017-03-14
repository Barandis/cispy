import { expect } from '../helper';
import * as t from 'xduce';

import {
  go,
  chan,
  put,
  take,
  raise,
  config,
  CLOSED
} from '../../src/api';

describe('Raise function', () => {
  it('raises an error from a string which is fed back into the process', (done) => {
    go(function* () {
      try {
        yield raise('Test error');
        expect.fail();
      }
      catch (ex) {
        expect(ex.message).to.equal('Test error');
      }
      finally {
        done();
      }
    });
  });

  it('raises an error from an Error object which is fed back into the process', (done) => {
    go(function* () {
      try {
        yield raise(Error('Test error'));
        expect.fail();
      }
      catch (ex) {
        expect(ex.message).to.equal('Test error');
      }
      finally {
        done();
      }
    });
  });

  it('treats the channel returned from go/spawn normally after the catch', (done) => {
    const ch = go(function* () {
      try {
        yield raise('Test error');
      }
      catch (ex) {}
      return 1729;
    });

    go(function* () {
      expect(yield take(ch)).to.equal(1729);
      expect(ch.closed).to.be.true;
      done();
    });
  });

  it('runs the next yield normally if the error was caught', (done) => {
    const ch = chan();

    go(function* () {
      try {
        yield raise('Test error');
      }
      catch (ex) {}
      yield put(ch, 1729);
    });

    go(function* () {
      expect(yield take(ch)).to.equal(1729);
      done();
    });
  });

  context('with a default handler', () => {
    afterEach(() => config({defaultHandler: null}));

    it('runs the default handler if the error isn\'t caught', (done) => {
      config({defaultHandler: (response) => {
        expect(response.error.message).to.equal('Test error');
        done();
      }});

      go(function* () { yield raise('Test error'); });
    });

    it('ignores the default handler if the error is caught', (done) => {
      config({defaultHandler: () => expect.fail()});

      go(function* () {
        try {
          yield raise('Test error');
        }
        catch (ex) {
          expect(ex.message).to.equal('Test error');
        }
        finally {
          done();
        }
      });
    });

    it('runs the next yield normally if the error is caught', (done) => {
      config({default: () => expect.fail()});
      const ch = chan();

      go(function* () {
        try {
          yield raise('Test error');
        }
        catch (ex) {}
        yield put(ch, 1729);
      });

      go(function* () {
        expect(yield take(ch)).to.equal(1729);
        done();
      });
    });
  });
});

describe('Transducer error handler', () => {
  it('handles errors in the step function', (done) => {
    const handler = (error) => {
      expect(error.message).to.equal('Transducer error');
      return 1729;
    };

    function raisingTransformer(xform) {
      return {
        [t.protocols.init]() {
          return xform[t.protocols.init]();
        },

        [t.protocols.step](acc, input) {
          throw Error('Transducer error');
        },

        [t.protocols.result](value) {
          return xform[t.protocols.result](value);
        }
      };
    }

    const xform = (xf) => raisingTransformer(xf);
    const ch = chan(5, xform, handler);

    go(function* () { yield put(ch, 1); });

    go(function* () {
      expect(yield take(ch)).to.equal(1729);
      done();
    });
  });

  it('handles errors in the result function', (done) => {
    const handler = (error) => {
      expect(error.message).to.equal('Transducer error');
      return 1729;
    };

    function raisingTransformer(xform) {
      return {
        [t.protocols.init]() {
          return xform[t.protocols.init]();
        },

        [t.protocols.step](acc, input) {
          return t.util.ensureReduced(xform[t.protocols.step](acc, input));
        },

        [t.protocols.result](value) {
          throw Error('Transducer error');
        }
      };
    }

    const xform = (xf) => raisingTransformer(xf);
    const ch = chan(5, xform, handler);

    go(function* () { yield put(ch, 1); });

    go(function* () {
      expect(yield take(ch)).to.equal(1);
      expect(yield take(ch)).to.equal(1729);
      done();
    });
  });
});
