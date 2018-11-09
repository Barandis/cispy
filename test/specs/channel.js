/* eslint-disable max-lines */
const { expect } = require('../helper');
const sinon = require('sinon');

const { fixed, dropping, sliding } = require('../../src/modules/buffers');
const { chan, timeout, close, CLOSED } = require('../../src/modules/channel');
const { config, SET_TIMEOUT } = require('../../src/modules/dispatcher');
const { go, sleep, put, take, takeAsync, altsAsync } = require('../../src/modules/ops');

const { compose, protocols, transducers } = require('xduce');
const t = transducers;
const p = protocols;

describe('CSP channel', () => {
  describe('chan() creation function', () => {
    it('creates a non-timeout channel', () => {
      expect(chan().timeout).to.be.false;
      expect(chan(0).timeout).to.be.false;
      expect(chan(3).timeout).to.be.false;
      expect(chan(fixed(3)).timeout).to.be.false;
      expect(chan(dropping(3)).timeout).to.be.false;
      expect(chan(sliding(3)).timeout).to.be.false;
      expect(chan(1, t.map(x => x)).timeout).to.be.false;
      expect(
        chan(1, t.map(x => x), e => {
          throw e;
        }).timeout
      ).to.be.false;
    });

    it('cannot queue more than 1024 puts at once', done => {
      const ch = chan();

      for (let i = 0; i < 1024; ++i) {
        go(async () => {
          await put(ch, i);
        });
      }
      go(async () => {
        try {
          await put(ch, 1025);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal('No more than 1024 pending puts are allowed on a single channel');
        } finally {
          done();
        }
      });
    });

    it('cannot queue more than 1024 takes at once', done => {
      const ch = chan();

      for (let i = 0; i < 1024; ++i) {
        go(async () => {
          await take(ch);
        });
      }
      go(async () => {
        try {
          await take(ch);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal('No more than 1024 pending takes are allowed on a single channel');
        } finally {
          done();
        }
      });
    });

    it('can configure how many pending puts/takes to allow', done => {
      const ch = chan(0, null, null, { maxQueued: 2 });

      for (let i = 0; i < 2; ++i) {
        go(async () => {
          await take(ch);
        });
      }
      go(async () => {
        try {
          await take(ch);
          expect.fail();
        } catch (ex) {
          expect(ex.message).to.equal('No more than 2 pending takes are allowed on a single channel');
        } finally {
          done();
        }
      });
    });

    describe('buffer argument', () => {
      it('defaults to being unbuffered', done => {
        const ch = chan();
        expect(ch.buffered).to.be.false;

        go(async () => {
          await put(ch, 1729);
        });

        go(async () => {
          expect(await take(ch)).to.equal(1729);
          done();
        });
      });

      it('provides a fixed buffer if given a number', done => {
        const ch = chan(3);
        expect(ch.buffered).to.be.true;

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          await put(ch, 3);
          await put(ch, 4);
        });

        go(async () => {
          expect(await take(ch)).to.equal(1);
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(3);
          expect(await take(ch)).to.equal(4);
          done();
        });
      });

      it('creates an unbuffered channel if 0 is passed', done => {
        const ch = chan(0);
        expect(ch.buffered).to.be.false;

        go(async () => {
          await put(ch, 1729);
        });

        go(async () => {
          expect(await take(ch)).to.equal(1729);
          done();
        });
      });

      it('accepts fixed buffers', done => {
        const ch = chan(fixed(3));
        expect(ch.buffered).to.be.true;

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          await put(ch, 3);
          await put(ch, 4);
        });

        go(async () => {
          expect(await take(ch)).to.equal(1);
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(3);
          expect(await take(ch)).to.equal(4);
          done();
        });
      });

      it('accepts dropping buffers', done => {
        const ch = chan(dropping(3));

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          await put(ch, 3);
          // This one is just dropped
          await put(ch, 4);
          close(ch);
        });

        go(async () => {
          // This makes the four puts happen before the first take does, letting the channel fill before something
          // is taken off of it
          for (let i = 0; i < 4; ++i) {
            await sleep();
          }
          expect(await take(ch)).to.equal(1);
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(3);
          expect(await take(ch)).to.equal(CLOSED);
          done();
        });
      });

      it('accepts sliding buffers', done => {
        const ch = chan(sliding(3));
        expect(ch.buffered).to.be.true;

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          await put(ch, 3);
          // This one causes the first value to be dropped
          await put(ch, 4);
          close(ch);
        });

        go(async () => {
          // Run all 4 puts before the first take
          for (let i = 0; i < 4; ++i) {
            await sleep();
          }
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(3);
          expect(await take(ch)).to.equal(4);
          expect(await take(ch)).to.equal(CLOSED);
          done();
        });
      });
    });

    describe('transducers argument', () => {
      const even = x => x % 2 === 0;

      it("can modify values on the channel before they're taken", done => {
        const ch = chan(1, t.map(x => x + 1));

        go(async () => {
          await put(ch, 1);
        });

        go(async () => {
          expect(await take(ch)).to.equal(2);
          done();
        });
      });

      it('can accept transducers that return fewer values than were passed', done => {
        const ch = chan(1, t.filter(even));

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          close(ch);
        });

        go(async () => {
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(CLOSED);
          done();
        });
      });

      it('closes the channel if the transducer reduces the value early', done => {
        const ch = chan(3, t.take(2));

        go(async () => {
          await put(ch, 1);
          await put(ch, 2);
          await put(ch, 3);
        });

        go(async () => {
          expect(await take(ch)).to.equal(1);
          expect(await take(ch)).to.equal(2);
          expect(await take(ch)).to.equal(CLOSED);
          done();
        });
      });

      it('handles composed transformers', done => {
        const xform = compose(
          t.map(x => x * 3),
          t.filter(even),
          t.take(3)
        );
        const ch = chan(10, xform);

        go(async () => {
          for (const i of [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]) {
            await put(ch, i);
          }
        });

        go(async () => {
          expect(await take(ch)).to.equal(0);
          expect(await take(ch)).to.equal(6);
          expect(await take(ch)).to.equal(24);
          expect(await take(ch)).to.equal(CLOSED);
          done();
        });
      });

      it('correctly closes the channel even if another taker is active', done => {
        const ch = chan(
          10,
          compose(
            t.flatten(),
            t.take(3)
          )
        );
        const out = chan();
        const ctrl = chan();

        go(async () => {
          for (const i of [0, 1, 2, 3, 4]) {
            await put(ch, [i, i]);
          }
          await put(ctrl);
          await put(ctrl);
        });

        go(async () => {
          await take(ctrl);
          await take(ch);
          const value = await take(ch);
          await put(out, value === CLOSED ? 'closed' : value);
        });

        go(async () => {
          await take(ctrl);
          await take(ch);
          const value = await take(ch);
          await put(out, value === CLOSED ? 'closed' : value);
        });

        go(async () => {
          const value1 = await take(out);
          const value2 = await take(out);
          expect(value1 === 'closed' || value2 === 'closed').to.be.true;
          expect(value1 === 'closed' && value2 === 'closed').to.be.false;
          done();
        });
      });
    });

    describe('handler argument', () => {
      const stepErrorTransducer = xform => ({
        [p.step]() {
          throw Error('step error');
        },
        [p.result](value) {
          return xform[p.result](value);
        }
      });

      const resultErrorTransducer = xform => ({
        [p.step](acc, input) {
          return xform[p.step](acc, input);
        },
        [p.result]() {
          throw Error('result error');
        }
      });

      const oneTimeStepErrorTransducer = xform => ({
        count: 0,
        [p.step](acc, input) {
          if (this.count++ === 0) {
            throw Error('step error');
          }
          return xform[p.step](acc, input);
        },
        [p.result](value) {
          return xform[p.result](value);
        }
      });

      const mustBe1729Transducer = xform => ({
        [p.step](acc, input) {
          if (input !== 1729) {
            throw Error('not 1729!');
          }
          return xform[p.step](acc, input);
        },
        [p.result](value) {
          return xform[p.result](value);
        }
      });

      it('provides a way to handle an error that happens in the step function of a transducer', done => {
        const exh = ex => {
          expect(ex.message).to.equal('step error');
          done();
        };

        const ch = chan(1, stepErrorTransducer, exh);
        go(async () => {
          await put(ch, 1);
        });

        go(async () => {
          // The step function runs when a channel is taken from, so
          await take(ch);
        });
      });

      it('provides a way to handle an error that happens in the result function of a transducer', done => {
        const exh = ex => {
          expect(ex.message).to.equal('result error');
          done();
        };

        const ch = chan(1, resultErrorTransducer, exh);

        go(async () => {
          await put(ch, 1);
        });

        go(async () => {
          await take(ch);
          // The result function doesn't run until the channel is closed, so we have to call close to make this work
          close(ch);
        });
      });

      it('provides a default handler that simply makes nothing available', done => {
        const ch = chan(1, oneTimeStepErrorTransducer);

        go(async () => {
          await put(ch, 1);
          await put(ch, 1729);
        });

        go(async () => {
          // The one-time error transducer throws an error the first time, for the 1, which is ignored
          // The second put, with 1729, completes successfully
          expect(await take(ch)).to.equal(1729);
          done();
        });
      });

      it('puts its return value onto the channel in place of whatever caused the error', done => {
        const exh = () => 2317;
        const ch = chan(1, mustBe1729Transducer, exh);

        go(async () => {
          await put(ch);
          await put(ch, 1729);
          await put(ch, 42);
          await put(ch, 27);
        });

        go(async () => {
          // only the put that actually put 1729 doens't error, the error handler returns 2317 for the others
          expect(await take(ch)).to.equal(2317);
          expect(await take(ch)).to.equal(1729);
          expect(await take(ch)).to.equal(2317);
          expect(await take(ch)).to.equal(2317);
          done();
        });
      });
    });
  });

  describe('timeout', () => {
    let clock;

    before(() => config({ dispatchMethod: SET_TIMEOUT }));
    beforeEach(() => (clock = sinon.useFakeTimers()));
    afterEach(() => clock.restore());
    after(() => config({ dispatchMethod: null }));

    it('creates a channel that closes after a certain amount of time', () => {
      const spy = sinon.spy();
      const ch = timeout(500);

      takeAsync(ch, value => {
        expect(value).to.equal(CLOSED);
        spy();
      });

      expect(spy).not.to.be.called;
      clock.tick(600);
      expect(spy).to.be.called;
    });

    it('marks itself as a timeout channel', () => {
      expect(timeout(0).timeout).to.be.true;
    });

    it('is useful in limiting how long an alts call will wait', () => {
      const spy = sinon.spy();
      const chs = [chan(), chan(), timeout(500)];

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

  describe('close', () => {
    it('does nothing if the channel is already closed', () => {
      const ch = chan();
      close(ch);
      expect(ch.closed).to.be.true;
      close(ch);
      expect(ch.closed).to.be.true;
    });

    it('causes any pending and future puts to return false', done => {
      const ch = chan();

      go(async () => {
        // pending
        expect(await put(ch, 1)).to.be.false;
        // future
        expect(await put(ch, 1)).to.be.false;
        done();
      });

      go(async () => {
        await sleep();
        close(ch);
      });
    });

    it('still lets buffered puts return true until the buffer is full', done => {
      const ch = chan(1);

      go(async () => {
        // buffered
        expect(await put(ch, 1)).to.be.true;
        // pending
        expect(await put(ch, 1)).to.be.false;
        // future
        expect(await put(ch, 1)).to.be.false;
        done();
      });

      go(async () => {
        await sleep();
        close(ch);
      });
    });

    it('causes any pending and future takes to return CLOSED', done => {
      const ch = chan();

      go(async () => {
        // pending
        expect(await take(ch)).to.equal(CLOSED);
        // future
        expect(await take(ch)).to.equal(CLOSED);
        done();
      });

      go(async () => {
        await sleep();
        close(ch);
      });
    });

    it('lets buffered values return before returning CLOSED', done => {
      const ch = chan(1);
      const ctrl = chan();

      go(async () => {
        // channel has a value put onto it and is closed before the ctrl
        // channel says go
        await take(ctrl);
        // buffered
        expect(await take(ch)).to.equal(1729);
        // future
        expect(await take(ch)).to.equal(CLOSED);
        done();
      });

      go(async () => {
        await put(ch, 1729);
        close(ch);
        await put(ctrl);
      });
    });
  });
});
