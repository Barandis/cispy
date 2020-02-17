/* eslint-disable max-lines */
import { expect } from "../helper";
import sinon from "sinon";

import { fixed, dropping, sliding } from "modules/buffers";
import { chan, CLOSED } from "modules/channel";
import { config, SET_TIMEOUT } from "modules/dispatcher";
import { go, sleep, altsAsync } from "modules/ops";

import { compose, protocols as p, transducers as t } from "xduce";

describe("Channel", () => {
  describe("chan() creation function", () => {
    it("creates a non-timeout channel", () => {
      expect(chan().timeout).to.be.false;
      expect(chan(0).timeout).to.be.false;
      expect(chan(3).timeout).to.be.false;
      expect(chan(fixed(3)).timeout).to.be.false;
      expect(chan(dropping(3)).timeout).to.be.false;
      expect(chan(sliding(3)).timeout).to.be.false;
      expect(chan(1, { transducer: t.map(x => x) }).timeout).to.be.false;
      expect(
        chan(1, {
          transducer: t.map(x => x),
          handler: e => {
            throw e;
          },
        }).timeout,
      ).to.be.false;
    });

    it("cannot queue more than 1024 sends at once", done => {
      const ch = chan();

      for (let i = 0; i < 1024; ++i) {
        go(async () => {
          await ch.put(i);
        });
      }
      go(async () => {
        try {
          await ch.put(1025);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal(
            "No more than 1024 pending sends are allowed on a single channel",
          );
        } finally {
          done();
        }
      });
    });

    it("cannot queue more than 1024 receives at once", done => {
      const ch = chan();

      for (let i = 0; i < 1024; ++i) {
        go(async () => {
          await ch.take();
        });
      }
      go(async () => {
        try {
          await ch.take();
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal(
            "No more than 1024 pending receives are allowed on a single channel",
          );
        } finally {
          done();
        }
      });
    });

    it("can configure how many pending sends/receives to allow", done => {
      const ch = chan(0, { maxQueued: 2 });

      for (let i = 0; i < 2; ++i) {
        go(async () => {
          await ch.take();
        });
      }
      go(async () => {
        try {
          await ch.take();
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal(
            "No more than 2 pending receives are allowed on a single channel",
          );
        } finally {
          done();
        }
      });
    });

    describe("buffer argument", () => {
      it("defaults to being unbuffered", done => {
        const ch = chan();
        expect(ch.buffered).to.be.false;

        go(async () => {
          await ch.put(1729);
        });

        go(async () => {
          expect(await ch.take()).to.equal(1729);
          done();
        });
      });

      it("provides a fixed buffer if given a number", done => {
        const ch = chan(3);
        expect(ch.buffered).to.be.true;

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          await ch.put(3);
          await ch.put(4);
        });

        go(async () => {
          expect(await ch.take()).to.equal(1);
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(3);
          expect(await ch.take()).to.equal(4);
          done();
        });
      });

      it("creates an unbuffered channel if 0 is passed", done => {
        const ch = chan(0);
        expect(ch.buffered).to.be.false;

        go(async () => {
          await ch.put(1729);
        });

        go(async () => {
          expect(await ch.take()).to.equal(1729);
          done();
        });
      });

      it("accepts fixed buffers", done => {
        const ch = chan(fixed(3));
        expect(ch.buffered).to.be.true;

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          await ch.put(3);
          await ch.put(4);
        });
        go(async () => {
          expect(await ch.take()).to.equal(1);
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(3);
          expect(await ch.take()).to.equal(4);
          done();
        });
      });

      it("accepts dropping buffers", done => {
        const ch = chan(dropping(3));

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          await ch.put(3);
          // This one is just dropped
          await ch.put(4);
          ch.close();
        });

        go(async () => {
          // This makes the four puts happen before the first take does, letting
          // the channel fill before something is taken off of it
          for (let i = 0; i < 4; ++i) {
            await sleep();
          }
          expect(await ch.take()).to.equal(1);
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(3);
          expect(await ch.take()).to.equal(CLOSED);
          done();
        });
      });

      it("accepts sliding buffers", done => {
        const ch = chan(sliding(3));
        expect(ch.buffered).to.be.true;

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          await ch.put(3);
          // This one causes the first value to be dropped
          await ch.put(4);
          ch.close();
        });

        go(async () => {
          // Run all 4 puts before the first take
          for (let i = 0; i < 4; ++i) {
            await sleep();
          }
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(3);
          expect(await ch.take()).to.equal(4);
          expect(await ch.take()).to.equal(CLOSED);
          done();
        });
      });
    });

    describe("transducers option", () => {
      const even = x => x % 2 === 0;

      it("can modify values on the channel before they're received", done => {
        const ch = chan(1, { transducer: t.map(x => x + 1) });

        go(async () => {
          await ch.put(1);
        });

        go(async () => {
          expect(await ch.take()).to.equal(2);
          done();
        });
      });

      it("can accept transducers that return fewer values than were passed", done => {
        const ch = chan(1, { transducer: t.filter(even) });

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          ch.close();
        });

        go(async () => {
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(CLOSED);
          done();
        });
      });

      it("closes the channel if the transducer reduces the value early", done => {
        const ch = chan(3, { transducer: t.take(2) });

        go(async () => {
          await ch.put(1);
          await ch.put(2);
          await ch.put(3);
        });

        go(async () => {
          expect(await ch.take()).to.equal(1);
          expect(await ch.take()).to.equal(2);
          expect(await ch.take()).to.equal(CLOSED);
          done();
        });
      });

      it("handles composed transformers", done => {
        const xform = compose(
          t.map(x => x * 3),
          t.filter(even),
          t.take(3),
        );
        const ch = chan(10, { transducer: xform });

        go(async () => {
          for (const i of [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]) {
            await ch.put(i);
          }
        });

        go(async () => {
          expect(await ch.take()).to.equal(0);
          expect(await ch.take()).to.equal(6);
          expect(await ch.take()).to.equal(24);
          expect(await ch.take()).to.equal(CLOSED);
          done();
        });
      });

      it("correctly closes the channel even if another taker is active", done => {
        const ch = chan(10, {
          transducer: compose(t.flatten(), t.take(3)),
        });
        const out = chan();
        const ctrl = chan();

        go(async () => {
          for (const i of [0, 1, 2, 3, 4]) {
            await ch.put([i, i]);
          }
          await ctrl.put();
          await ctrl.put();
        });

        go(async () => {
          await ctrl.take();
          await ch.take();
          const value = await ch.take();
          await out.put(value === CLOSED ? "closed" : value);
        });

        go(async () => {
          await ctrl.take();
          await ch.take();
          const value = await ch.take();
          await out.put(value === CLOSED ? "closed" : value);
        });

        go(async () => {
          const value1 = await out.take();
          const value2 = await out.take();
          expect(value1 === "closed" || value2 === "closed").to.be.true;
          expect(value1 === "closed" && value2 === "closed").to.be.false;
          done();
        });
      });
    });

    describe("handler option", () => {
      const stepErrorTransducer = xform => ({
        [p.step]() {
          throw Error("step error");
        },
        [p.result](value) {
          return xform[p.result](value);
        },
      });

      const resultErrorTransducer = xform => ({
        [p.step](acc, input) {
          return xform[p.step](acc, input);
        },
        [p.result]() {
          throw Error("result error");
        },
      });

      const oneTimeStepErrorTransducer = xform => ({
        count: 0,
        [p.step](acc, input) {
          if (this.count++ === 0) {
            throw Error("step error");
          }
          return xform[p.step](acc, input);
        },
        [p.result](value) {
          return xform[p.result](value);
        },
      });

      const mustBe1729Transducer = xform => ({
        [p.step](acc, input) {
          if (input !== 1729) {
            throw Error("not 1729!");
          }
          return xform[p.step](acc, input);
        },
        [p.result](value) {
          return xform[p.result](value);
        },
      });

      it("provides a way to handle an error that happens in the step function of a transducer", done => {
        const exh = ex => {
          expect(ex.message).to.equal("step error");
          done();
        };

        const ch = chan(1, { transducer: stepErrorTransducer, handler: exh });
        go(async () => {
          await ch.put(1);
        });

        go(async () => {
          await ch.take();
        });
      });

      it("provides a way to handle an error that happens in the result function of a transducer", done => {
        const exh = ex => {
          expect(ex.message).to.equal("result error");
          done();
        };

        const ch = chan(1, { transducer: resultErrorTransducer, handler: exh });

        go(async () => {
          await ch.put(1);
        });

        go(async () => {
          await ch.take();
          // The result function doesn't run until the channel is closed, so we
          // have to call close to make this work
          ch.close();
        });
      });

      it("provides a default handler that simply makes nothing available", done => {
        const ch = chan(1, { transducer: oneTimeStepErrorTransducer });

        go(async () => {
          await ch.put(1);
          await ch.put(1729);
        });

        go(async () => {
          // The one-time error transducer throws an error the first time, for
          // the 1, which is ignored The second put, with 1729, completes
          // successfully
          expect(await ch.take()).to.equal(1729);
          done();
        });
      });

      it("puts its return value onto the channel in place of whatever caused the error", done => {
        const exh = () => 2317;
        const ch = chan(1, { transducer: mustBe1729Transducer, handler: exh });

        go(async () => {
          await ch.put();
          await ch.put(1729);
          await ch.put(42);
          await ch.put(27);
        });

        go(async () => {
          // only the put that actually put 1729 doens't error, the error
          // handler returns 2317 for the others
          expect(await ch.take()).to.equal(2317);
          expect(await ch.take()).to.equal(1729);
          expect(await ch.take()).to.equal(2317);
          expect(await ch.take()).to.equal(2317);
          done();
        });
      });
    });
  });

  describe("timeout channels", () => {
    let clock;

    before(() => config({ dispatchMethod: SET_TIMEOUT }));
    beforeEach(() => (clock = sinon.useFakeTimers()));
    afterEach(() => clock.restore());
    after(() => config({ dispatchMethod: null }));

    it("creates a channel that closes after a certain amount of time", () => {
      const spy = sinon.spy();
      const ch = chan(0, { timeout: 500 });

      ch.takeAsync(value => {
        expect(value).to.equal(CLOSED);
        spy();
      });

      expect(spy).not.to.be.called;
      clock.tick(600);
      expect(spy).to.be.called;
    });

    it("marks itself as a timeout channel", () => {
      expect(chan(0, { timeout: 0 }).timeout).to.be.true;
    });

    it("is useful in limiting how long an alts call will wait", () => {
      const spy = sinon.spy();
      const chs = [chan(), chan(), chan(0, { timeout: 500 })];

      altsAsync(chs, () => {
        spy();
      });

      expect(spy).not.to.be.called;

      clock.tick(250);
      expect(spy).not.to.be.called;

      clock.tick(300);
      expect(spy).to.be.called;
    });
  });

  describe("close", () => {
    it("does nothing if the channel is already closed", () => {
      const ch = chan();
      ch.close();
      expect(ch.closed).to.be.true;
      ch.close();
      expect(ch.closed).to.be.true;
    });

    it("causes any pending and future sends to return false", done => {
      const ch = chan();

      go(async () => {
        // pending
        expect(await ch.put(1)).to.be.false;
        // future
        expect(await ch.put(1)).to.be.false;
        done();
      });

      go(async () => {
        await sleep();
        ch.close();
      });
    });

    it("still lets buffered sends return true until the buffer is full", done => {
      const ch = chan(1);

      go(async () => {
        // buffered
        expect(await ch.put(1)).to.be.true;
        // pending
        expect(await ch.put(1)).to.be.false;
        // future
        expect(await ch.put(1)).to.be.false;
        done();
      });

      go(async () => {
        await sleep();
        ch.close();
      });
    });

    it("causes any pending and future receives to return CLOSED", done => {
      const ch = chan();

      go(async () => {
        // pending
        expect(await ch.take()).to.equal(CLOSED);
        // future
        expect(await ch.take()).to.equal(CLOSED);
        done();
      });

      go(async () => {
        await sleep();
        ch.close();
      });
    });

    it("lets buffered values return before returning CLOSED", done => {
      const ch = chan(1);
      const ctrl = chan();

      go(async () => {
        // channel has a value put onto it and is closed before the ctrl channel
        // says go
        await ctrl.take();
        // buffered
        expect(await ch.take()).to.equal(1729);
        // future
        expect(await ch.take()).to.equal(CLOSED);
        done();
      });

      go(async () => {
        await ch.put(1729);
        ch.close();
        await ctrl.put();
      });
    });
  });
});
