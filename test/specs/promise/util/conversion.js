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

const { chan, close, put, take, takeAsync, util } = require('../../../../src/promise');

const { reduce, onto, into } = util;

async function fillChannel(channel, count, cl) {
  for (let i = 1; i <= count; ++i) {
    await put(channel, i);
  }
  if (cl) {
    close(channel);
  }
}

async function join(num, end, done) {
  for (let i = 0; i < num; ++i) {
    await take(end);
  }
  done();
}

async function expectChannel(channel, expected, end, start) {
  if (start) {
    await take(start);
  }
  const values = [];
  for (let i = 0, count = expected.length; i < count; ++i) {
    values.push(await take(channel));
  }
  expect(values).to.deep.equal(expected);
  if (end) {
    await put(end);
  }
}

describe.skip('Promise-based channel conversion functions', () => {
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

    it('works to collapse channels into arrays', (done) => {
      const input = chan();
      const output = reduce((acc, input) => {
        acc.push(input);
        return acc;
      }, input, []);

      fillChannel(input, 5, true);

      takeAsync(output, (value) => {
        expect(value).to.deep.equal([1, 2, 3, 4, 5]);
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

      (async () => {
        await put(output, -1);
        await put(output, 0);
        onto(output, array);
      })();

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

      (async () => {
        await put(input, 6);
        await put(input, 7);
        close(input);
      })();

      takeAsync(output, (value) => {
        expect(value).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });

    it('will create a new array if none is supplied', (done) => {
      const input = chan();
      const output = into(input);

      (async () => {
        await put(input, 6);
        await put(input, 7);
        close(input);
      })();

      takeAsync(output, (value) => {
        expect(value).to.deep.equal([6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });
  });
});
