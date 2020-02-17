/* eslint-disable max-lines */

import { expect } from "../helper";
import sinon from "sinon";

import { chan, CLOSED, DEFAULT } from "modules/channel";
import { select } from "modules/channels";
import { sleep } from "modules/process";
import { config, SET_TIMEOUT } from "modules/dispatcher";

async function cycle() {
  return Promise.resolve();
}

describe("Channel operations", () => {
  describe("sleep", () => {
    let clock;

    before(() => config({ dispatchMethod: SET_TIMEOUT }));
    beforeEach(() => (clock = sinon.useFakeTimers()));
    afterEach(() => clock.restore());
    after(() => config({ dispatchMethod: null }));

    it("causes an async function to block for a certain amount of time", async () => {
      const spy = sinon.spy();

      sleep(500).then(() => {
        spy();
      });

      expect(spy).not.to.be.called;

      clock.tick(250);
      await cycle();
      expect(spy).not.to.be.called;

      clock.tick(300);
      await cycle();
      expect(spy).to.be.called;
    });
  });

  describe("take", () => {
    it("returns a value that was sent to a channel", done => {
      const ch = chan();

      async function receiver() {
        const value = await ch.take();
        expect(value).to.equal(1729);
        done();
      }

      async function sender() {
        await ch.put(1729);
      }

      receiver();
      sender();
    });

    it("returns the value even if it is an error obejct", done => {
      const ch = chan();
      const obj = Error("test error");

      async function receiver() {
        expect(await ch.take()).to.equal(obj);
        done();
      }

      async function sender() {
        await ch.put(obj);
      }

      receiver();
      sender();
    });

    it("returns a value that was sendAsync onto a channel", done => {
      const ch = chan();

      async function receiver() {
        expect(await ch.take()).to.equal(1729);
        done();
      }

      ch.putAsync(1729);
      receiver();
    });

    it("blocks until there is a value on the channel", done => {
      const spy = sinon.spy();
      const ch = chan();

      async function receiver() {
        await ch.take();
        spy();
      }

      async function sender() {
        // ensures the take happens first
        await sleep();
        expect(spy).not.to.be.called;
        await ch.put(1729);
        // necessary because put doesn't block when there's a pending take
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      receiver();
      sender();
    });
  });

  describe("put", () => {
    it("sends a value to a channel for receive", done => {
      const ch = chan();

      async function sender() {
        await ch.put(1729);
      }

      async function receiver() {
        expect(await ch.take()).to.equal(1729);
        done();
      }

      sender();
      receiver();
    });

    it("sends a value onto a channel for receiveAsync", done => {
      const ch = chan();

      async function sender() {
        await ch.put(1729);
      }

      ch.takeAsync(value => {
        expect(value).to.equal(1729);
        done();
      });

      sender();
    });

    it("does not require being in an async function if nothing is being done with the return value", done => {
      const ch = chan();

      ch.put(1729);

      async function receiver() {
        expect(await ch.take()).to.equal(1729);
        done();
      }

      receiver();
    });

    it("does not allow sending CLOSED to a channel", done => {
      const ch = chan();

      async function test() {
        try {
          await ch.put(CLOSED);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal("Cannot put CLOSED on a channel");
        } finally {
          done();
        }
      }

      test();
    });

    it("returns true if invoked on an open channel", done => {
      const ch = chan();

      async function sender() {
        // necessary so the send doesn't block, but we don't await it because we
        // don't want the take itself to block and we don't care about its value
        ch.take();
        expect(await ch.put(1729)).to.be.true;
        done();
      }

      sender();
    });

    it("returns false if invoked on a closed channel", done => {
      const ch = chan();

      async function sender() {
        ch.close();
        expect(await ch.put(1729)).to.be.false;
        done();
      }

      sender();
    });

    it("blocks until a value is received off the channel", done => {
      const spy = sinon.spy();
      const ch = chan();

      async function sender() {
        await ch.put(1729);
        spy();
      }

      async function receiver() {
        await sleep();
        expect(spy).not.to.be.called;
        await ch.take();
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      sender();
      receiver();
    });
  });

  describe("select", () => {
    function numTrue(array) {
      return array.filter(x => x).length;
    }

    let chs;

    beforeEach(() => (chs = [chan(), chan(), chan()]));

    it("accepts a value off exactly one channel at a time", done => {
      chs[1].put(1);
      chs[0].put(0);
      chs[2].put(2);

      async function test() {
        const called = [false, false, false];

        const alt1 = await select(chs);
        called[alt1.value] = true;
        expect(numTrue(called)).to.equal(1);

        const alt2 = await select(chs);
        called[alt2.value] = true;
        expect(numTrue(called)).to.equal(2);

        const alt3 = await select(chs);
        called[alt3.value] = true;
        expect(numTrue(called)).to.equal(3);

        done();
      }

      test();
    });

    it("sends values to exactly one channel at a time", done => {
      const called = [false, false, false];

      (async () => {
        for (let i = 1; i <= 3; ++i) {
          await select([
            [chs[0], 0],
            [chs[1], 1],
            [chs[2], 2],
          ]);
          await sleep();
          expect(numTrue(called)).to.equal(i);
          await sleep();
        }
        done();
      })();

      (async () => {
        expect(await chs[0].take()).to.equal(0);
        called[0] = true;
      })();

      (async () => {
        expect(await chs[1].take()).to.equal(1);
        called[1] = true;
      })();

      (async () => {
        expect(await chs[2].take()).to.equal(2);
        called[2] = true;
      })();
    });

    it("can handle receives and sends in the same call", done => {
      const called = [false, false, false];

      (async () => {
        for (let i = 1; i <= 3; ++i) {
          await select([chs[0], [chs[1], 1], chs[2]]);
          await sleep();
          expect(numTrue(called)).to.equal(i);
        }
        done();
      })();

      (async () => {
        await chs[0].put();
        called[0] = true;
      })();

      (async () => {
        expect(await chs[1].take()).to.equal(1);
        called[1] = true;
      })();

      (async () => {
        await chs[2].put();
        called[2] = true;
      })();
    });

    it("throws an error if no operations are provided", done => {
      async function test() {
        try {
          await select([]);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal("Alts called with no operations");
        } finally {
          done();
        }
      }
      test();
    });

    it("can take a priority option to explicitly order operations", done => {
      chs[1].put(1);
      chs[2].put(2);
      chs[0].put(0);

      async function test() {
        await sleep();

        const alt1 = await select(chs, { priority: true });
        expect(alt1.value).to.equal(0);
        expect(alt1.channel).to.equal(chs[0]);

        const alt2 = await select(chs, { priority: true });
        expect(alt2.value).to.equal(1);
        expect(alt2.channel).to.equal(chs[1]);

        const alt3 = await select(chs, { priority: true });
        expect(alt3.value).to.equal(2);
        expect(alt3.channel).to.equal(chs[2]);

        done();
      }
      test();
    });

    it("blocks if none of the operations is ready yet", done => {
      const spy = sinon.spy();

      async function setup() {
        for (let i = 0; i < 3; ++i) {
          await select([chs[0], [chs[1], 1], chs[2]]);
          spy();
          await sleep();
        }
      }

      async function test() {
        await sleep();
        expect(spy).not.to.be.called;
        await chs[0].put(0);
        await sleep();
        await sleep();
        expect(spy).to.be.called;
        done();
      }

      setup();
      test();
    });

    it("returns a default if one is provided and it would otherwise block", done => {
      async function test() {
        const { value, channel } = await select(chs, { default: 1729 });
        expect(value).to.equal(1729);
        expect(channel).to.equal(DEFAULT);
        done();
      }
      test();
    });

    it("does not return the default if there is a value available", done => {
      const chs = [chan(1), chan(1), chan(1)];
      const ctrl = chan();

      async function setup() {
        await chs[0].put(1729);
        await ctrl.put();
      }

      async function test() {
        await ctrl.take();
        const { value, channel } = await select(chs, { default: 1723 });
        expect(value).to.equal(1729);
        expect(channel).to.equal(chs[0]);
        done();
      }

      setup();
      test();
    });
  });

  describe("takeOrThrow", () => {
    it("acts like a receive if no error object is received from the channel", done => {
      const ch = chan();
      ch.put(1729);

      async function receiver() {
        expect(await ch.takeOrThrow()).to.equal(1729);
        done();
      }
      receiver();
    });

    it("throws the error if an error object is received from the channel", done => {
      const ch = chan();
      const ctrl = chan();
      const spy = sinon.spy();
      const err = Error("test error");

      async function taker() {
        try {
          await ch.takeOrThrow();
          expect.fail();
        } catch (ex) {
          expect(ex).to.equal(err);
          spy();
          await ctrl.put();
        }
      }

      async function test() {
        await ctrl.take();
        expect(spy).to.be.calledOnce;
        done();
      }

      ch.put(err);
      taker();
      test();
    });

    it("lets the function continue running if it catches the error", done => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error("test error");

      async function proc() {
        try {
          await ch.takeOrThrow();
        } catch (ex) {
          expect(ex.message).to.equal("test error");
          spy();
        }
        return 1729;
      }

      async function test() {
        expect(await proc()).to.equal(1729);
        expect(spy).to.be.calledOnce;
        done();
      }

      ch.put(err);
      test();
    });

    it("allows the function to run further operations if it catches the error", done => {
      const ch = chan();
      const spy = sinon.spy();
      const err = Error("test error");

      async function proc() {
        try {
          await ch.takeOrThrow();
        } catch (ex) {
          expect(ex.message).to.equal("test error");
          spy();
        }
        expect(await ch.takeOrThrow()).to.equal(1729);
      }

      async function test() {
        await proc();
        expect(spy).to.be.calledOnce;
        done();
      }

      async function setup() {
        await ch.put(err);
        await ch.put(1729);
      }

      setup();
      test();
    });
  });
});
