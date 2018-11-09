/* eslint-disable max-lines */

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

const { expect } = require('../../helper');

const {
  chan,
  close,
  CLOSED,
  fixedBuffer,
  droppingBuffer,
  slidingBuffer,
  put,
  take,
  sleep,
  utils
} = require('../../../src/api');

const { pipe, partition, merge, split, tap, untap, untapAll, map } = utils;

const even = x => x % 2 === 0;
const sum3 = (a, b, c) => a + b + c;

async function fillChannel(channel, count, cl) {
  for (let i = 1; i <= count; ++i) {
    await put(channel, i);
  }
  if (cl) {
    close(channel);
  }
}

async function fillChannelWith(channel, array, cl) {
  for (const i of array) {
    await put(channel, i);
  }
  if (cl) {
    close(channel);
  }
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

async function join(num, end, done) {
  for (let i = 0; i < num; ++i) {
    await take(end);
  }
  done();
}

describe('Flow control functions', () => {
  describe('pipe', () => {
    it('feeds all of the values from one channel to another', done => {
      const input = chan();
      const output = pipe(
        input,
        chan()
      );

      (async () => {
        expect(await take(output)).to.equal(1729);
        expect(await take(output)).to.equal(2317);
        done();
      })();

      (async () => {
        await put(input, 1729);
        await put(input, 2317);
      })();
    });

    it('closes the output channel when the input channel closes', done => {
      const input = chan();
      const output = chan();
      pipe(
        input,
        output
      );

      (async () => {
        expect(await take(output)).to.equal(CLOSED);
        done();
      })();

      close(input);
    });

    it('keeps the output channel open with keepOpen', done => {
      const input = chan();
      const output = chan();
      pipe(
        input,
        output,
        true
      );

      (async () => {
        expect(await take(output)).to.equal(1729);
        done();
      })();

      (async () => {
        close(input);
        // This ensures that the take happens AFTER the close but
        // BEFORE the put
        await sleep();
        await await put(output, 1729);
      })();
    });

    it('breaks the pipe when the output channel closes', done => {
      const input = chan();
      const output = chan();
      const start = chan();
      const finished = chan();
      pipe(
        input,
        output
      );

      (async () => {
        // First put to soon-to-be closed channel and is lost
        await put(input, 1729);
        // Signal second process to close channel
        await put(start);
        // Second put taken by third process
        await put(input, 2317);
      })();

      (async () => {
        await take(start);
        // Close the output, break the pipe
        close(output);
        // Signal the third process to take input
        await put(finished);
      })();

      (async () => {
        await take(finished);
        expect(await take(input)).to.equal(2317);
        done();
      })();
    });
  });

  describe('partition', () => {
    it('creates two output channels, splitting them by predicate', done => {
      const input = chan();
      const [evens, odds] = partition(even, input);
      const ctrl = chan();

      fillChannel(input, 10);

      expectChannel(evens, [2, 4, 6, 8, 10], ctrl);
      expectChannel(odds, [1, 3, 5, 7, 9], ctrl);

      join(2, ctrl, done);
    });

    it('accepts buffers to back the output channels', done => {
      const input = chan();
      const [evens, odds] = partition(even, input, slidingBuffer(3), droppingBuffer(3));
      const start = chan();
      const end = chan();

      (async () => {
        for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
          await put(input, i);
          await sleep();
        }
        await put(start);
        await put(start);
      })();

      expectChannel(evens, [6, 8, 10], end, start);
      expectChannel(odds, [1, 3, 5], end, start);

      join(2, end, done);
    });

    it('closes the output channels when the input channel is closed', done => {
      const input = chan();
      const [evens, odds] = partition(even, input);
      const end = chan();

      (async () => {
        expect(await take(evens)).to.equal(CLOSED);
        await put(end);
      })();

      (async () => {
        expect(await take(odds)).to.equal(CLOSED);
        await put(end);
      })();

      (async () => {
        close(input);
        await take(end);
        await take(end);
        done();
      })();
    });
  });

  describe('merge', () => {
    it('combines several input channels into one output channel', done => {
      const inputs = [chan(), chan(), chan()];
      const output = merge(inputs);
      const values = Array(15).fill(false);

      fillChannelWith(inputs[0], [0, 1, 2, 3, 4]);
      fillChannelWith(inputs[1], [5, 6, 7, 8, 9]);
      fillChannelWith(inputs[2], [10, 11, 12, 13, 14]);

      (async () => {
        for (let i = 0; i < 15; ++i) {
          await sleep();
          const index = await take(output);
          values[index] = true;
          await sleep();
        }
        expect(values.every(x => x)).to.be.true;
        done();
      })();
    });

    it('accepts a buffer to back the output channel', done => {
      const inputs = [chan(), chan(), chan()];
      const output = merge(inputs, slidingBuffer(3));

      fillChannelWith(inputs[0], [0, 1, 2, 3, 4]);
      fillChannelWith(inputs[1], [5, 6, 7, 8, 9]);
      fillChannelWith(inputs[2], [10, 11, 12, 13, 14]);

      (async () => {
        await sleep();
        await sleep();
        for (let i = 0; i < 3; ++i) {
          expect([2, 3, 4, 7, 8, 9, 12, 13, 14]).to.include(await take(output));
        }
        done();
      })();
    });

    it('closes the output when all inputs have been closed', done => {
      const inputs = [chan(), chan(), chan()];
      const output = merge(inputs);

      for (const ch of inputs) {
        close(ch);
      }

      (async () => {
        expect(await take(output)).to.equal(CLOSED);
        done();
      })();
    });
  });

  describe('split', () => {
    it('splits the input into some number of outputs', done => {
      const input = chan();
      const outputs = split(input, 3);
      const ctrl = chan();

      expect(outputs.length).to.equal(3);

      fillChannel(input, 5);

      expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
      expectChannel(outputs[1], [1, 2, 3, 4, 5], ctrl);
      expectChannel(outputs[2], [1, 2, 3, 4, 5], ctrl);

      join(3, ctrl, done);
    });

    it('defaults to two unbuffered outputs', done => {
      const input = chan();
      const outputs = split(input);
      const ctrl = chan();

      expect(outputs.length).to.equal(2);

      fillChannel(input, 5);

      expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
      expectChannel(outputs[1], [1, 2, 3, 4, 5], ctrl);

      join(2, ctrl, done);
    });

    it('can accept a series of output buffers', done => {
      const input = chan();
      const outputs = split(input, fixedBuffer(5), droppingBuffer(3), slidingBuffer(3));
      const start = chan();
      const end = chan();

      (async () => {
        for (let i = 1; i <= 5; ++i) {
          await put(input, i);
        }
        await put(start);
        await put(start);
        await put(start);
      })();

      expectChannel(outputs[0], [1, 2, 3, 4, 5], end, start);
      expectChannel(outputs[1], [1, 2, 3], end, start);
      expectChannel(outputs[2], [3, 4, 5], end, start);

      join(3, end, done);
    });

    it('closes all output when the input closes', done => {
      const input = chan();
      const outputs = split(input, 3);

      (async () => {
        close(input);
        await sleep();
        await sleep();
        for (let i = 0, count = outputs.length; i < count; ++i) {
          expect(outputs[i].closed).to.be.true;
        }
        done();
      })();
    });
  });

  context('multitap', () => {
    describe('tap', () => {
      it('taps the input and directs values to the tapper', done => {
        const input = chan();
        const output = tap(input);
        const ctrl = chan();

        fillChannel(input, 5);
        expectChannel(output, [1, 2, 3, 4, 5], ctrl);
        join(1, ctrl, done);
      });

      it('can tap the input multiple times', done => {
        const input = chan();
        const outputs = [tap(input), tap(input), tap(input)];
        const ctrl = chan();

        fillChannel(input, 5);

        expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[1], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[2], [1, 2, 3, 4, 5], ctrl);

        join(3, ctrl, done);
      });

      it('will not tap with the same channel more than once', done => {
        const input = chan();
        const output = chan();
        const ctrl = chan();
        tap(input, output);
        tap(input, output);

        fillChannel(input, 5);
        expectChannel(output, [1, 2, 3, 4, 5], ctrl);
        join(1, ctrl, done);
      });

      it('will not close tapping channels when tapped channel is closed', () => {
        const input = chan();
        const outputs = [tap(input), tap(input)];

        close(input);
        expect(outputs[0].closed).to.be.false;
        expect(outputs[1].closed).to.be.false;
      });
    });

    describe('untap', () => {
      it('will remove the tap of a tapping channel', done => {
        const input = chan();
        const outputs = [tap(input), tap(input), tap(input)];
        const ctrl = chan();

        untap(input, outputs[1]);

        fillChannel(input, 5);
        expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[2], [1, 2, 3, 4, 5], ctrl);

        (async () => {
          for (let i = 1; i <= 5; ++i) {
            expect(await take(outputs[1])).to.equal(-i);
          }
          done();
        })();

        (async () => {
          await take(ctrl);
          await take(ctrl);
          for (let i = 1; i <= 5; ++i) {
            await put(outputs[1], -i);
          }
        })();
      });

      it("will not untap a channel that isn't tapping", done => {
        const input = chan();
        const output1 = tap(input);
        const output2 = chan();
        const ctrl = chan();

        untap(input, output2);

        fillChannel(input, 5);
        expectChannel(output1, [1, 2, 3, 4, 5], ctrl);
        join(1, ctrl, done);
      });

      it('restores normal operation to the tapped channel if the last tap is removed', done => {
        const input = chan();
        const output = tap(input);
        const ctrl = chan();

        untap(input, output);

        fillChannel(input, 5);
        fillChannelWith(output, [-1, -2, -3, -4, -5]);

        expectChannel(input, [1, 2, 3, 4, 5], ctrl);
        expectChannel(output, [-1, -2, -3, -4, -5], ctrl);

        join(2, ctrl, done);
      });
    });
    describe('untapAll', () => {
      it('removes all taps from the tapped channel', done => {
        const input = chan();
        const ctrl = chan();
        tap(input);
        tap(input);
        tap(input);
        untapAll(input);

        fillChannel(input, 5);
        expectChannel(input, [1, 2, 3, 4, 5], ctrl);
        join(1, ctrl, done);
      });
    });
  });

  describe('map', () => {
    it('combines multiple channels into one through a mapping function', done => {
      const inputs = [chan(), chan(), chan()];
      const output = map(sum3, inputs);
      const ctrl = chan();

      fillChannel(inputs[0], 5);
      fillChannel(inputs[1], 5);
      fillChannel(inputs[2], 5);

      expectChannel(output, [3, 6, 9, 12, 15], ctrl);
      join(1, ctrl, done);
    });

    it('accepts a buffer to back th eoutput channel', done => {
      const inputs = [chan(5), chan(5), chan(5)];
      const output = map(sum3, inputs, slidingBuffer(3));

      fillChannel(inputs[0], 5);
      fillChannel(inputs[1], 5);
      fillChannel(inputs[2], 5);

      (async () => {
        await sleep();
        await sleep();
        for (let i = 1; i <= 3; ++i) {
          expect(await take(output)).to.equal((i + 2) * 3);
        }
        done();
      })();
    });

    it('closes the output when the first input closes', done => {
      const inputs = [chan(), chan(), chan()];
      const output = map(sum3, inputs);
      const ctrl = chan();

      (async () => {
        for (let i = 1; i <= 5; ++i) {
          await put(inputs[0], i);
        }
      })();

      (async () => {
        for (let i = 1; i <= 3; ++i) {
          await put(inputs[1], i);
        }
        close(inputs[1]);
      })();

      (async () => {
        for (let i = 1; i <= 5; ++i) {
          await put(inputs[2], i);
        }
      })();

      expectChannel(output, [3, 6, 9, CLOSED, CLOSED], ctrl);
      join(1, ctrl, done);
    });
  });
});
