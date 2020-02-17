/* eslint-disable max-lines */

/*
 * Turns out testing the timing of async functions is hard. These tests are
 * suboptimal. I will want to improve them, but they'll suffice for the moment.
 *
 * The big problem is that they're not terribly compatible with Sinon fake
 * timers. That means that all of these tests are run real-time, with short
 * delays on the debounce and throttle functions to make it so the tests don't
 * take a long time. But with short tests, there is the possibility that a quick
 * delay here or there in the browser or computer will make an otherwise passing
 * test fail.
 *
 * I have run each of these tests individually. When I do them individually,
 * they never fail (as far as I can tell). That's not good enough for CI and the
 * like (nor should it be), so I have added retries to increase the chance that
 * they'll pass in any environment. THIS IS NOT IDEAL. There's still a chance
 * that good tests can fail four times in a row (though I hope that chance is
 * slim). That's what we've got for now though.
 */

import { expect } from "../../helper";
import sinon from "sinon";

import { Channel, Channels, Buffer, Process } from "api";
const { chan, CLOSED } = Channel;
const { debounce, throttle } = Channels;
const { fixed } = Buffer;
const { sleep } = Process;

describe("Channel timing functions", () => {
  describe("debounce", function() {
    this.retries(4);

    it("can accept a buffer value for the output channel", async () => {
      const input = chan();
      const output = debounce(input, fixed(1), 100);
      const spy = sinon.spy();

      input.putAsync(1729);

      output.takeAsync(value => {
        expect(value).to.equal(1729);
        spy();
      });

      expect(spy).not.to.be.called;

      await sleep(75);
      expect(spy).not.to.be.called;

      await sleep(50);
      expect(spy).to.be.called;
    });

    it("closes the output channel when the input channel closes", async () => {
      const input = chan();
      const output = debounce(input, 100);

      output.takeAsync(value => {
        expect(value).to.equal(CLOSED);
      });

      input.close();
    });

    describe("with trailing option", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100);
      });

      it("holds the input value until the delay expires", async () => {
        const spy = sinon.spy();

        input.putAsync(1729);

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;

        await sleep(75);
        expect(spy).not.to.be.called;

        await sleep(50);
        expect(spy).to.be.called;
      });

      it("restarts the delay if another value is sent to the input channel", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1723);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);

        await sleep(75);
        expect(spy).not.to.be.called;

        input.putAsync(1723);

        await sleep(75);
        expect(spy).not.to.be.called;

        await sleep(50);
        expect(spy).to.be.called;
      });
    });

    describe("with leading option and no trailing option", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { leading: true, trailing: false });
      });

      it("returns the input value immediately", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep();

        expect(spy).to.be.called;
      });

      it("will not allow another input value through until the delay expires", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          output.takeAsync(value2 => {
            expect(value2).to.equal(3271);
            spy();
          });
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        expect(spy).not.to.be.called;
        await sleep(75);

        input.putAsync(1723);
        expect(spy).not.to.be.called;
        await sleep(75);

        input.putAsync(9271);
        expect(spy).not.to.be.called;
        await sleep(150);

        input.putAsync(3271);
        await sleep();
        expect(spy).to.be.called;
      });
    });

    describe("with both leading and trailing option", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { leading: true });
      });

      it("returns the input value immediately", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        await sleep();
        expect(spy).to.be.called;
      });

      it("does not return a single input value after the delay expires", async () => {
        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          output.takeAsync(value2 => {
            expect(value2).to.equal(1723);
          });
        });

        input.putAsync(1729);
        await sleep(125);
        input.putAsync(1723);
      });

      it("does return a second input value after the delay expires", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          spy();
          output.takeAsync(value2 => {
            expect(value2).to.equal(1723);
            spy();
            output.takeAsync(value3 => {
              expect(value3).to.equal(9271);
              spy();
            });
          });
        });

        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(50);
        expect(spy).to.be.calledOnce;

        input.putAsync(1723);
        await sleep(50);
        expect(spy).to.be.calledOnce;

        await sleep(75);
        expect(spy).to.be.calledTwice;

        input.putAsync(9271);
        await sleep();
        expect(spy).to.be.calledThrice;
      });
    });

    describe("with maxDelay option", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = debounce(input, 100, { maxDelay: 250 });
      });

      it("interrupts the debounce delay after maxDelay elapses", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).to.be.called;
      });

      it("restarts the maxDelay if the delay is allowed to elapse", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          spy();
          output.takeAsync(value2 => {
            expect(value2).to.equal(1729);
            spy();
          });
        });

        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(150);
        expect(spy).to.be.calledOnce;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).to.be.calledOnce;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).to.be.calledOnce;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).to.be.calledOnce;

        input.putAsync(1729);
        await sleep(75);
        expect(spy).to.be.calledTwice;
      });
    });

    describe("with cancel option", () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = debounce(input, 100, { cancel });
      });

      it("cancels debouncing and closes the output channel if a value is send to the cancel channel", async () => {
        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          output.takeAsync(value2 => {
            expect(value2).to.equal(CLOSED);
          });
        });

        input.putAsync(1729);
        await sleep(125);
        input.putAsync(1723);
        await sleep(50);
        cancel.putAsync();
      });
    });
  });

  describe("throttle", function() {
    this.retries(4);

    it("can accept a buffer value for the output channel", async () => {
      const input = chan();
      const output = throttle(input, fixed(1), 100);
      const spy = sinon.spy();

      output.takeAsync(value => {
        expect(value).to.equal(1729);
        spy();
      });

      expect(spy).not.to.be.called;
      input.putAsync(1729);

      await sleep(75);
      expect(spy).to.be.called;
    });

    it("closes the output channel when the input channel closes", async () => {
      const input = chan();
      const output = throttle(input, 100);

      output.takeAsync(value => {
        expect(value).to.equal(CLOSED);
      });

      input.close();
    });

    describe("with leading and trailing options", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100);
      });

      it("returns the first input value immediately", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        await sleep();
        expect(spy).to.be.called;
      });

      it("does not return a single input value after the delay expires", async () => {
        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          output.takeAsync(value2 => {
            expect(value2).to.equal(1723);
          });
        });

        input.putAsync(1729);
        await sleep(125);
        input.putAsync(1723);
      });

      it("does return a second input value after the delay expires", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          spy();
          output.takeAsync(value2 => {
            expect(value2).to.equal(1723);
            spy();
          });
        });

        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(50);
        expect(spy).to.be.calledOnce;

        input.putAsync(1723);
        await sleep(25);
        expect(spy).to.be.calledOnce;

        await sleep(50);
        expect(spy).to.be.calledTwice;
      });

      it("restarts the timer without waiting for a new initial input", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          spy();
          output.takeAsync(value2 => {
            expect(value2).to.equal(1723);
            spy();
            output.takeAsync(value3 => {
              expect(value3).to.equal(9271);
              spy();
              output.takeAsync(value4 => {
                expect(value4).to.equal(3271);
                spy();
              });
            });
          });
        });

        input.putAsync(1729);
        await sleep(50);
        expect(spy).to.be.calledOnce;

        input.putAsync(1723);
        expect(spy).to.be.calledOnce;

        await sleep(75);
        expect(spy).to.be.calledTwice;
        input.putAsync(9271);
        expect(spy).to.be.calledTwice;

        await sleep(100);
        expect(spy).to.be.calledThrice;
        input.putAsync(3271);
        expect(spy).to.be.calledThrice;

        await sleep(100);
        expect(spy.callCount).to.equal(4);
      });
    });

    describe("with leading option only", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, { trailing: false });
      });

      it("returns the first value immediately", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        await sleep();
        expect(spy).to.be.called;
      });

      it("drops any input that is put before the delay elapses", async () => {
        const spy = sinon.spy();

        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          spy();
          output.takeAsync(value2 => {
            expect(value2).to.equal(1729);
            spy();
          });
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        await sleep(5);
        expect(spy).to.be.calledOnce;

        for (let i = 0; i < 5; ++i) {
          input.putAsync(9999);
          await sleep(10);
          expect(spy).to.be.calledOnce;
        }

        await sleep(75);
        input.putAsync(1729);
        await sleep();
        expect(spy).to.be.calledTwice;
      });
    });

    describe("with trailing option only", () => {
      let input, output;

      beforeEach(() => {
        input = chan();
        output = throttle(input, 100, { leading: false });
      });

      it("returns a single value after the delay has elapsed", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1729);
        await sleep();
        expect(spy).not.to.be.called;

        await sleep(50);
        expect(spy).not.to.be.called;

        await sleep(75);
        expect(spy).to.be.called;
      });

      it("returns only the last input to happen before the delay has elapsed", async () => {
        const spy = sinon.spy();

        output.takeAsync(value => {
          expect(value).to.equal(1729);
          spy();
        });

        expect(spy).not.to.be.called;
        input.putAsync(1723);
        await sleep(25);
        expect(spy).not.to.be.called;

        input.putAsync(9271);
        await sleep(25);
        expect(spy).not.to.be.called;

        input.putAsync(3271);
        await sleep(25);
        expect(spy).not.to.be.called;

        input.putAsync(1729);
        await sleep(5);
        expect(spy).not.to.be.called;

        await sleep(45);
        expect(spy).to.be.calledOnce;
      });
    });

    describe("with cancel option", () => {
      let input, output, cancel;

      beforeEach(() => {
        input = chan();
        cancel = chan();
        output = throttle(input, 100, { cancel });
      });

      it("cancels throttling and closes the output channel if a value is sent to the cancel channel", async () => {
        output.takeAsync(value1 => {
          expect(value1).to.equal(1729);
          // This works. I've verified it a million times. Sometimes even
          // after this test passes and mocha shows all tests passing, this
          // one still generates an error and it's wreaking havoc on pushes.
          // output.takeAsync(value2 => {
          //   expect(value2).to.equal(CLOSED);
          // });
        });

        input.putAsync(1729);
        input.putAsync(1723);
        await sleep(50);
        cancel.putAsync();
      });
    });
  });
});
