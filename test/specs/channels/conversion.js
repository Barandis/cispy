import { expect } from "../../helper";

import { go, chan, Channel } from "api";

async function fillChannel(channel, count, cl) {
  for (let i = 1; i <= count; ++i) {
    await channel.put(i);
  }
  if (cl) {
    channel.close();
  }
}

async function join(num, end, done) {
  for (let i = 0; i < num; ++i) {
    await end.take();
  }
  done();
}

async function expectChannel(channel, expected, end, start) {
  if (start) {
    await start.take();
  }
  const values = [];
  for (let i = 0, count = expected.length; i < count; ++i) {
    values.push(await channel.take());
  }
  expect(values).to.deep.equal(expected);
  if (end) {
    await end.put();
  }
}

describe("Channel conversion functions", () => {
  describe("reduce", () => {
    it("creates a one-value channel with the reduction value of the input channel", done => {
      const input = chan();
      const output = Channel.reduce((acc, input) => acc + input, input, 0);

      fillChannel(input, 5, true);

      output.takeAsync(value => {
        expect(value).to.equal(15);
        expect(output.closed).to.be.true;
        done();
      });
    });

    it("works to collapse channels into arrays", done => {
      const input = chan();
      const output = Channel.reduce(
        (acc, input) => {
          acc.push(input);
          return acc;
        },
        input,
        [],
      );

      fillChannel(input, 5, true);

      output.takeAsync(value => {
        expect(value).to.deep.equal([1, 2, 3, 4, 5]);
        expect(output.closed).to.be.true;
        done();
      });
    });
  });

  describe("onto", () => {
    it("sends the values from an array onto a channel", done => {
      const output = chan();
      const array = [1, 2, 3, 4, 5];
      const ctrl = chan();

      go(async () => {
        await output.put(-1);
        await output.put(0);
        Channel.onto(output, array);
      });

      expectChannel(output, [-1, 0, 1, 2, 3, 4, 5], ctrl);
      join(1, ctrl, done);
    });

    it("defaults to a new channel if given only an array", done => {
      const output = Channel.onto([1, 2, 3, 4, 5]);
      const ctrl = chan();

      expectChannel(output, [1, 2, 3, 4, 5], ctrl);
      join(1, ctrl, done);
    });
  });

  describe("into", () => {
    it("returns a channel with an array containing the input channel values", done => {
      const input = chan();
      const output = Channel.into([1, 2, 3, 4, 5], input);

      go(async () => {
        await input.put(6);
        await input.put(7);
        input.close();
      });

      output.takeAsync(value => {
        expect(value).to.deep.equal([1, 2, 3, 4, 5, 6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });

    it("will create a new array if none is supplied", done => {
      const input = chan();
      const output = Channel.into(input);

      go(async () => {
        await input.put(6);
        await input.put(7);
        input.close();
      });

      output.takeAsync(value => {
        expect(value).to.deep.equal([6, 7]);
        expect(output.closed).to.be.true;
        done();
      });
    });
  });
});
