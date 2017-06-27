const { expect } = require('../../helper');

const { chan, close, CLOSED, generator, fixedBuffer, droppingBuffer, slidingBuffer } = require('../../../src/cispy');

const { go, put, take, sleep, util } = generator;
const { pipe, partition, merge, split, tap, untap, untapAll, map } = util;

const TAPS = '@@multitap/taps';

const even = (x) => x % 2 === 0;
const sum3 = (a, b, c) => a + b + c;

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

function fillChannelWith(channel, array, cl) {
  go(function* () {
    for (let i of array) {
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

describe('Flow control functions', () => {
  describe('pipe', () => {
    it('feeds all of the values from one channel to another', (done) => {
      const input = chan();
      const output = pipe(input, chan());

      go(function* () {
        expect(yield take(output)).to.equal(1729);
        done();
      });

      go(function* () { yield put(input, 1729); });
    });

    it('closes the output channel when the input channel closes', (done) => {
      const input = chan();
      const output = chan();
      pipe(input, output);

      go(function* () {
        expect(yield take(output)).to.equal(CLOSED);
        done();
      });

      go(function* () { close(input); });
    });

    it('keeps the outpuyt channel open with keeoOpen', (done) => {
      const input = chan();
      const output = chan();
      pipe(input, output, true);

      go(function* () {
        expect(yield take(output)).to.equal(1729);
        done();
      });

      go(function* () {
        close(input);
        yield sleep();
        yield put(output, 1729);
      });
    });

    it('breaks the pipe when the output channel closes', (done) => {
      const input = chan();
      const output = chan();
      const start = chan();
      const finished = chan();
      pipe(input, output);

      go(function* () {
        // First put piped to soon-to-be closed channel and is lost
        yield put(input, 1729);
        // Signal second process to close channel
        yield put(start);
        // Second put taken by third process
        yield put(input, 1723);
      });

      go(function* () {
        yield take(start);
        // Close the output, break the pipe
        close(output);
        // Signal the third process to take input
        yield put(finished);
      });

      go(function* () {
        yield take(finished);
        expect(yield take(input)).to.equal(1723);
        done();
      });
    });
  });

  describe('partition', () => {
    it('creates two output channels, splitting them by predicate', (done) => {
      const input = chan();
      const outputs = partition(even, input);
      const ctrl = chan();

      fillChannel(input, 10);

      expectChannel(outputs[0], [2, 4, 6, 8, 10], ctrl);
      expectChannel(outputs[1], [1, 3, 5, 7, 9], ctrl);

      join(2, ctrl, done);
    });

    it('accepts buffers to back the output channels', (done) => {
      const input = chan();
      const outputs = partition(even, input, slidingBuffer(3), droppingBuffer(3));
      const start = chan();
      const end = chan();

      go(function* () {
        for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
          yield put(input, i);
          yield sleep();
        }
        yield put(start);
        yield put(start);
      });

      expectChannel(outputs[0], [6, 8, 10], end, start);
      expectChannel(outputs[1], [1, 3, 5], end, start);

      join(2, end, done);
    });

    it('closes the output channels when the input is closed', (done) => {
      const input = chan();
      const outputs = partition(even, input);
      const end = chan();

      go(function* () {
        expect(yield take(outputs[0])).to.equal(CLOSED);
        yield put(end);
      });

      go(function* () {
        expect(yield take(outputs[1])).to.equal(CLOSED);
        yield put(end);
      });

      go(function* () {
        close(input);
        yield take(end);
        yield take(end);
        done();
      });
    });
  });

  describe('merge', () => {
    it('combines several input channels into one channel', (done) => {
      const inputs = [chan(), chan(), chan()];
      const output = merge(inputs);
      const values = Array(15).fill(false);

      fillChannelWith(inputs[0], [0, 1, 2, 3, 4]);
      fillChannelWith(inputs[1], [5, 6, 7, 8, 9]);
      fillChannelWith(inputs[2], [10, 11, 12, 13, 14]);

      go(function* () {
        for (let i = 0; i < 15; ++i) {
          const index = yield take(output);
          values[index] = true;
        }
        expect(values.every(x => x)).to.be.true;
        done();
      });
    });

    it('accepts a buffer to back the output channel', (done) => {
      const inputs = [chan(), chan(), chan()]
      const output = merge(inputs, slidingBuffer(3));

      fillChannelWith(inputs[0], [0, 1, 2, 3, 4]);
      fillChannelWith(inputs[1], [5, 6, 7, 8, 9]);
      fillChannelWith(inputs[2], [10, 11, 12, 13, 14]);

      go(function* () {
        yield sleep();
        yield sleep();
        for(let i = 0; i < 3; i++) {
          expect([2, 3, 4, 7, 8, 9, 12, 13, 14]).to.include(yield take(output));
        }
        done();
      });
    });

    it('closes the output when all inputs have been closed', (done) => {
      const inputs = [chan(), chan(), chan()];
      const output = merge(inputs);

      go(function* () {
        for (let ch of inputs) {
          close(ch);
        }
      });

      go(function* () {
        expect(yield take(output)).to.equal(CLOSED);
        done();
      });
    });
  });

  describe('split', () => {
    it('splits the input into some number of outputs', (done) => {
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

    it('defaults to two unbuffered outputs', (done) => {
      const input = chan();
      const outputs = split(input);
      const ctrl = chan();

      expect(outputs.length).to.equal(2);

      fillChannel(input, 5);

      expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
      expectChannel(outputs[1], [1, 2, 3, 4, 5], ctrl);

      join(2, ctrl, done);
    });

    it('can accept a series of output buffers', (done) => {
      const input = chan();
      const outputs = split(input, fixedBuffer(5), droppingBuffer(3), slidingBuffer(3));
      const start = chan();
      const end = chan();

      go(function* () {
        for (let i = 1; i <= 5; ++i) {
          yield put(input, i);
        }
        yield put(start);
        yield put(start);
        yield put(start);
      });

      expectChannel(outputs[0], [1, 2, 3, 4, 5], end, start);
      expectChannel(outputs[1], [1, 2, 3], end, start);
      expectChannel(outputs[2], [3, 4, 5], end, start);

      join(3, end, done);
    });

    it('closes all outputs when the input closes', (done) => {
      const input = chan();
      const outputs = split(input, 3);

      go(function* () {
        close(input);
        yield sleep();
        yield sleep();
        for (let i = 0, count = outputs.length; i < count; ++i) {
          expect(outputs[i].closed).to.be.true;
        }
        done();
      });
    });
  });

  context('multitap', () => {
    describe('tap', () => {
      it('taps the input and directs values to the tapper', (done) => {
        const input = chan();
        const output = tap(input);
        const ctrl = chan();

        expect(input).to.have.property(TAPS);

        fillChannel(input, 5);
        expectChannel(output, [1, 2, 3, 4, 5], ctrl);
        join(1, ctrl, done);
      });

      it('can tap the input multiple times', (done) => {
        const input = chan();
        const outputs = [tap(input), tap(input), tap(input)];
        const ctrl = chan();

        expect(input).to.have.property(TAPS);

        fillChannel(input, 5);

        expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[1], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[2], [1, 2, 3, 4, 5], ctrl);

        join(3, ctrl, done);
      });

      it('will not tap with the same channel more than once', () => {
        const input = chan();
        const output = chan();
        tap(input, output);
        tap(input, output);

        expect(input[TAPS].length).to.equal(1);
      });

      it('will not close tapping channels when tapped channel is closed', (done) => {
        const input = chan();
        const outputs = [tap(input), tap(input)];

        go(function* () {
          close(input);
          yield sleep();
          expect(outputs[0].closed).to.be.false;
          expect(outputs[1].closed).to.be.false;
          done();
        });
      });
    });

    describe('untap', () => {
      it('will remove the tap of a tapping channel', (done) => {
        const input = chan();
        const outputs = [tap(input), tap(input), tap(input)];
        const ctrl = chan();

        untap(input, outputs[1]);

        fillChannel(input, 5);
        expectChannel(outputs[0], [1, 2, 3, 4, 5], ctrl);
        expectChannel(outputs[2], [1, 2, 3, 4, 5], ctrl);

        go(function* () {
          for (let i = 1; i <= 5; ++i) {
            expect(yield take(outputs[1])).to.equal(-i);
          }
          done();
        });

        go(function* () {
          yield take(ctrl);
          yield take(ctrl);
          for (let i = 1; i <= 5; ++i) {
            yield put(outputs[1], -i);
          }
        });
      });

      it('will not untap a channel that isn\'t tapping', () => {
        const input = chan();
        const output1 = tap(input);
        const output2 = chan();

        expect(input[TAPS].length).to.equal(1);
        untap(input, output2);
        expect(input[TAPS].length).to.equal(1);
      });

      it('restores normal operation tot he tapped channel if the last tap is removed', (done) => {
        const input = chan();
        const output = tap(input);
        const ctrl = chan();

        untap(input, output);

        fillChannel(input, 5);
        fillChannelWith(output, [-1, -2, -3, -4, -5]);

        expectChannel(input, [1, 2, 3, 4, 5], ctrl);
        expectChannel(output, [-1, -2, -3, -4, -5], ctrl);

        go(function* () {
          yield take(ctrl);
          yield take(ctrl);
          expect(input).not.to.have.property(TAPS);
          done();
        });
      });

      it('will not add tap properties to input if it wasn\'t tapped already', () => {
        const input = chan();
        const output = chan();
        untap(input, output);
        expect(input).not.to.have.property(TAPS);
      });
    });

    describe('untapAll', () => {
      it('removes all taps from the tapped channel', (done) => {
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

      it('will not add tap properties to input if it wasn\'t already tapped', () => {
        const input = chan();
        untapAll(input);
        expect(input).not.to.have.property(TAPS);
      });
    });
  });

  describe('map', () => {
    it('combines multiple channels into one through a mapping function', (done) => {
      const inputs = [chan(), chan(), chan()];
      const output = map(sum3, inputs);
      const ctrl = chan();

      fillChannel(inputs[0], 5);
      fillChannel(inputs[1], 5);
      fillChannel(inputs[2], 5);

      expectChannel(output, [3, 6, 9, 12, 15], ctrl);
      join(1, ctrl, done);
    });

    it('accepts a buffer to back th eoutput channel', (done) => {
      const inputs = [chan(5), chan(5), chan(5)];
      const output = map(sum3, inputs, slidingBuffer(3));

      fillChannel(inputs[0], 5);
      fillChannel(inputs[1], 5);
      fillChannel(inputs[2], 5);

      go(function* () {
        yield sleep();
        yield sleep();
        for (let i = 1; i <= 3; ++i) {
          expect(yield take(output)).to.equal((i + 2) * 3);
        }
        done();
      });
    });

    it('closes the output when the first input closes', (done) => {
      const inputs = [chan(), chan(), chan()];
      const output = map(sum3, inputs);
      const ctrl = chan();

      go(function* () {
        for (let i = 1; i <= 5; ++i) {
          yield put(inputs[0], i);
        }
      });

      go(function* () {
        for (let i = 1; i <= 3; ++i) {
          yield put(inputs[1], i);
        }
        close(inputs[1]);
      });

      go(function* () {
        for (let i = 1; i <= 5; ++i) {
          yield put(inputs[2], i);
        }
      });

      expectChannel(output, [3, 6, 9, CLOSED, CLOSED], ctrl);
      join(1, ctrl, done);
    });
  });
});
