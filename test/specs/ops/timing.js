import { expect } from '../../helper';
import sinon from 'sinon';

import {
  chan,
  go,
  put,
  take,
  sleep,
  buffers,
  config,
  close,
  CLOSED
} from '../../../src/cispy';

import {
  debounce,
  throttle
} from '../../../src/generator/operations/timing';

const {fixed, dropping, sliding} = buffers;

describe('Channel timing functions', () => {
  before(() => config({dispatchMethod: 'setTimeout'}));
  after(() => config({dispatchMethod: null}));

  describe('debounce', () => {
    let clock;

    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => clock.restore());

    it('can accept a buffer value for the output channel', (done) => {
      const input = chan();
      const output = debounce(input, fixed(1), 100);
      const spy = sinon.spy();

      go(function* () {
        expect(yield take(output)).to.equal(1729);
        spy();
      });

      go(function* () {
        expect(spy).not.to.be.called;
        yield put(input, 1729);

        clock.tick(75);
        expect(spy).not.to.be.called;

        clock.tick(50);
        expect(spy).to.be.called;

        done();
      });

      clock.tick(1);
    });

    it('closes the output channel when the input channel closes', (done) => {
      const input = chan();
      const output = debounce(input, 100);

      go(function* () {
        expect(yield take(output)).to.equal(CLOSED);
        done();
      });

      go(function* () { close(input); });

      clock.tick(1);
    });

    describe('with trailing option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100);
      });

      it('holds the input value until the delay expires', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);

          clock.tick(75);
          expect(spy).not.to.be.called;

          clock.tick(50);
          expect(spy).to.be.called;

          done();
        });

        clock.tick(1);
      });

      it('restarts the delay if another value is put on the input channel', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1723);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(75);
          expect(spy).not.to.be.called;

          yield put(input, 1723);
          clock.tick(75);
          expect(spy).not.to.be.called;

          clock.tick(50);
          expect(spy).to.be.called;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with leading option and no trailing option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, {leading: true, trailing: false});
      });

      it('returns the input value immediately', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(1);
          expect(spy).to.be.called;
          done();
        });

        clock.tick(1);
      });

      it('will not allow another input value through until the delay expires', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          expect(yield take(output)).to.equal(3271);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          expect(spy).not.to.be.called;
          clock.tick(75);

          yield put(input, 1723);
          expect(spy).not.to.be.called;
          clock.tick(75);

          yield put(input, 9271);
          expect(spy).not.to.be.called;
          clock.tick(150);

          yield put(input, 3271);
          clock.tick(1);
          expect(spy).to.be.called;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with both leading and trailing options', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, {leading: true});
      });

      it('returns the input value immediately', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(1);
          expect(spy).to.be.called;
          done();
        });

        clock.tick(1);
      });

      it('does not return a single input value after the delay expires', (done) => {
        go(function* () {
          expect(yield take(output)).to.equal(1729);
          expect(yield take(output)).to.equal(1723);
          done();
        });

        go(function* () {
          yield put(input, 1729);
          clock.tick(125);
          yield put(input, 1723);
        });

        clock.tick(1);
      });

      it('does return a second input value after the delay expires', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
          expect(yield take(output)).to.equal(1723);
          spy();
          expect(yield take(output)).to.equal(9271);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(50);
          expect(spy).to.be.calledOnce;

          yield put(input, 1723);
          clock.tick(50);
          expect(spy).to.be.calledOnce;

          clock.tick(75);
          expect(spy).to.be.calledTwice;

          yield put(input, 9271);
          clock.tick(1);
          expect(spy).to.be.calledThrice;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with maxDelay option', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, {maxDelay: 250});
      });

      it('interrupts the debounce delay after maxDelay elapses', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).to.be.called;

          done();
        });

        clock.tick(1);
      });

      it('restarts the maxDelay if the delay is allowed to elapse', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(150);
          expect(spy).to.be.calledOnce;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).to.be.calledOnce;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).to.be.calledOnce;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).to.be.calledOnce;

          yield put(input, 1729);
          clock.tick(75);
          expect(spy).to.be.calledTwice;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with cancel option', () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = debounce(input, 100, {cancel});
      });

      it('cancels debouncing and closes the output channel if something is put onto the cancel channel', (done) => {
        go(function* () {
          expect(yield take(output)).to.equal(1729);
          expect(yield take(output)).to.equal(CLOSED);
          done();
        });

        go(function* () {
          yield put(input, 1729);
          clock.tick(125);
          yield put(input, 1723);
          clock.tick(50); // not long enough for the 1723 to pass the debounce timer
          yield put(cancel);
        });

        clock.tick(1);
      });
    });
  });

  describe('throttle', () => {
    let clock;

    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => clock.restore());

    it('can accept a buffer value for the output channel', (done) => {
      const input = chan();
      const output = throttle(input, fixed(1), 100);
      const spy = sinon.spy();

      go(function* () {
        expect(yield take(output)).to.equal(1729);
        spy();
      });

      go(function* () {
        expect(spy).not.to.be.called;
        yield put(input, 1729);

        clock.tick(75);
        expect(spy).to.be.called;

        done();
      });

      clock.tick(1);
    });

    it('closes the output channel when the input channel closes', (done) => {
      const input = chan();
      const output = throttle(input, 100);

      go(function* () {
        expect(yield take(output)).to.equal(CLOSED);
        done();
      });

      go(function* () { close(input); });

      clock.tick(1);
    });

    describe('with leading and trailing options', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100);
      });

      it('returns the first input value immediately', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(1);
          expect(spy).to.be.called;
          done();
        });

        clock.tick(1);
      });

      it('does not return a single input value after the delay expires', (done) => {
        go(function* () {
          expect(yield take(output)).to.equal(1729);
          expect(yield take(output)).to.equal(1723);
          done();
        });

        go(function* () {
          yield put(input, 1729);
          clock.tick(125);
          yield put(input, 1723);
          clock.tick(1);
        });

        clock.tick(1);
      });

      it('does return a second input value after the delay expires', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
          expect(yield take(output)).to.equal(1723);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(50);
          expect(spy).to.be.calledOnce;

          yield put(input, 1723);
          clock.tick(25);
          expect(spy).to.be.calledOnce;

          clock.tick(50);
          expect(spy).to.be.calledTwice;

          done();
        });

        clock.tick(1);
      });

      it('restarts the timer without waiting for a new initial input', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
          expect(yield take(output)).to.equal(1723);
          spy();
          expect(yield take(output)).to.equal(9271);
          spy();
          expect(yield take(output)).to.equal(3271);
          spy();
        });

        go(function* () {
          yield put(input, 1729);
          clock.tick(50);
          expect(spy).to.be.calledOnce;

          yield put(input, 1723);
          expect(spy).to.be.calledOnce;

          clock.tick(75);
          expect(spy).to.be.calledTwice;
          yield put(input, 9271);
          expect(spy).to.be.calledTwice;

          clock.tick(100);
          expect(spy).to.be.calledThrice;
          yield put(input, 3271);
          expect(spy).to.be.calledThrice;

          clock.tick(100);
          expect(spy.callCount).to.equal(4);

          done();
        });

        clock.tick(1);
      });
    });

    describe('with leading option only', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, {trailing: false});
      });

      it('returns the first value immediately', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(1);
          expect(spy).to.be.called;
          done();
        });

        clock.tick(1);
      });

      it('drops any input that is put before the delay elapses', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(5);
          expect(spy).to.be.calledOnce;

          for (let i = 0; i < 10; ++i) {
            yield put(input, 9999);
            clock.tick(10);
            expect(spy).to.be.calledOnce;
          }

          yield put(input, 1729);
          clock.tick(1);
          expect(spy).to.be.calledTwice;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with trailing option only', () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, {leading: false});
      });

      it('returns a single value after the delay has elapsed', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1729);
          clock.tick(1);
          expect(spy).not.to.be.called;

          clock.tick(50);
          expect(spy).not.to.be.called;

          clock.tick(75);
          expect(spy).to.be.called;

          done();
        });

        clock.tick(1);
      });

      it('returns only the last input to happen before the delay has elapsed', (done) => {
        const spy = sinon.spy();

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          spy();
        });

        go(function* () {
          expect(spy).not.to.be.called;
          yield put(input, 1723);
          clock.tick(25);
          expect(spy).not.to.be.called;

          yield put(input, 9271);
          clock.tick(25);
          expect(spy).not.to.be.called;

          yield put(input, 3271);
          clock.tick(25);
          expect(spy).not.to.be.called;

          yield put(input, 1729);
          clock.tick(10);
          expect(spy).not.to.be.called;

          clock.tick(40);
          expect(spy).to.be.calledOnce;

          done();
        });

        clock.tick(1);
      });
    });

    describe('with cancel option', () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = throttle(input, 100, {cancel});
      });

      it('cancels throttling and closes the output channel if something is put onto the cancel channel', (done) => {

        go(function* () {
          expect(yield take(output)).to.equal(1729);
          expect(yield take(output)).to.equal(CLOSED);
          done();
        });

        go(function* () {
          yield put(input, 1729);
          yield put(input, 1723);
          clock.tick(50); // not long enough for the 1723 to pass the throttle timer
          yield put(cancel);
        });

        clock.tick(1);
      });
    });
  });
});
