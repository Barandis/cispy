const { expect } = require('../../../helper');

const { chan, close, takeAsync, go, put, take, util } = require('../../../../src/cispy');

const { reduce, onto, into } = util;

function fillChannel(channel, count, cl) {
  go(function* () {
    for (let i = 1; i <= count; ++i) {
      yield put(channel, i);
    }
    if (cl) {
      close(channel);
    }
  });
}

function expectChannel(channel, expected, end, start) {
  go(function* () {
    if (start) {
      yield take(start);
    }
    const values = [];
    for (let i = 0, count = expected.length; i < count; ++i) {
      values.push(yield take(channel));
    }
    expect(values).to.deep.equal(expected);
    yield put(end);
  });
}

function join(num, end, done) {
  go(function* () {
    for (let i = 0; i < num; ++i) {
      yield take(end);
    }
    done();
  });
}

describe('Channel conversion functions', () => {
  describe('reduce', () => {
    it('creates a one-value channel with the reduction value of the input channel', (done) => {
      const input = chan();
      const output = reduce((acc, input) => acc + input, input, 0);

      fillChannel(input, 5, true);

      takeAsync(output, (value) => {
        expect(value).to.equal(15);
        expect(output.closed).to.be.true;
        done();
      });
    });
  });

  describe('onto', () => {
    it('puts the values from an array onto a channel', (done) => {
      const output = chan();
      const array = [1, 2, 3, 4, 5];
      const ctrl = chan();

      go(function* () {
        yield put(output, -1);
        yield put(output, 0);
        onto(output, array);
      });

      expectChannel(output, [-1, 0, 1, 2, 3, 4, 5], ctrl);
      join(1, ctrl, done);
    });

    it('defaults to a new channel if given only an array', (done) => {
      const output = onto([1, 2, 3, 4, 5]);
      const ctrl = chan();

      expectChannel(output, [1, 2, 3, 4, 5], ctrl);
      join(1, ctrl, done);
    });
  });

  describe('into', () => {
    it('returns a channel with an array containing the input channel values', (done) => {
      const input = chan();
      const output = into([1, 2, 3, 4, 5], input);

      go(function* () {
        yield put(input, 6);
        yield put(input, 7);
        close(input);
      });

      go(function* () {
        expect(yield take(output)).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });

    it('will create a new array if none is supplied', (done) => {
      const input = chan();
      const output = into(input);

      go(function* () {
        yield put(input, 6);
        yield put(input, 7);
        close(input);
      });

      go(function* () {
        expect(yield take(output)).to.deep.equal([6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });
  });
});
