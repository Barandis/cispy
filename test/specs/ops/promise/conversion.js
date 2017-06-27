import { expect } from '../../../helper';

import {
  chan,
  close,
  promise
} from '../../../../src/cispy';

import {
  reduce,
  onto,
  into
} from '../../../../src/promise/util/conversion';

const { put, take } = promise;

function fillChannel(channel, count, cl) {
  (async () => {
    for (let i = 1; i <= count; ++i) {
      await put(channel, i);
    }
    if (cl) {
      close(channel);
    }
  })();
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

describe('Promise-based channel conversion functions', () => {
  describe('reduce', () => {
    it('returns the reduction value of the input channel', async () => {
      const input = chan();

      fillChannel(input, 5, true);
      const value = await reduce((acc, input) => acc + input, input, 0);

      expect(value).to.equal(15);
    });
  });

  describe('onto', () => {
    it('puts the values from an array onto a channel', async () => {
      const output = chan();
      const array = [1, 2, 3, 4, 5];

      (async () => {
        await put(output, -1);
        await put(output, 0);
        onto(output, array);
      })();

      await expectChannel(output, [-1, 0, 1, 2, 3, 4, 5]);
    });

    it('defaults to a new channel if given only an array', async () => {
      const output = onto([1, 2, 3, 4, 5]);
      await expectChannel(output, [1, 2, 3, 4, 5]);
    });
  });

  describe('into', () => {
    it('returns an array containing the input channel values', async () => {
      const input = chan();

      (async () => {
        await put(input, 6);
        await put(input, 7);
        close(input);
      })();

      const output = await into([1, 2, 3, 4, 5], input);
      expect(output).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
    });

    it('will create a new array if none is supplied', async () => {
      const input = chan();

      (async () => {
        await put(input, 6);
        await put(input, 7);
        close(input);
      })();

      const output = await into(input);
      expect(output).to.deep.equal([6, 7]);
    });
  });
});
