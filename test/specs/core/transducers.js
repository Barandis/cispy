const { expect } = require('../../helper');

const { chan, close, CLOSED } = require('../../../src/core/channel');
const { go, put, take } = require('../../../src/generator/operations');

const t = require('xduce');

const add1 = x => x + 1;
const even = x => x % 2 === 0;
const lt4 = x => x < 4;
const xprop = x => x.x;

function magComp(a, b) {
  const magnitude = x => Math.floor(Math.log(x) / Math.LN10 + 0.000000001);
  return magnitude(a) === magnitude(b);
}

function fillChannel(channel, count, cl) {
  go(function*() {
    for (let i = 1; i <= count; ++i) {
      yield put(channel, i);
    }
    if (cl) {
      close(channel);
    }
  });
}

function fillChannelWith(channel, array, cl) {
  go(function*() {
    for (const i of array) {
      yield put(channel, i);
    }
    if (cl) {
      close(channel);
    }
  });
}

function expectChannel(channel, expected, done) {
  go(function*() {
    const values = [];
    for (let i = 0, count = expected.length; i < count; ++i) {
      values.push(yield take(channel));
    }
    expect(values).to.deep.equal(expected);
    done();
  });
}

describe('Transducers', () => {
  it('cannot be used on an unbuffered channel', () => {
    expect(() => chan(0, t.map(add1))).to.throw('Only buffered channels can use transformers');
  });

  describe('identity', () => {
    it('works on channels', done => {
      const ch = chan(5, t.identity());
      fillChannel(ch, 10);
      expectChannel(ch, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], done);
    });
  });

  describe('flatten', () => {
    it('works on channels', done => {
      const ch = chan(5, t.flatten());
      fillChannelWith(ch, [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]);
      expectChannel(ch, [1, 2, 2, 3, 3, 4, 4, 5, 5, 6], done);
    });
  });

  describe('repeat', () => {
    it('works on channels', done => {
      const ch = chan(5, t.repeat(3));
      fillChannel(ch, 5);
      expectChannel(ch, [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5], done);
    });
  });

  describe('map', () => {
    it('works on channels', done => {
      const ch = chan(5, t.map(add1));
      fillChannel(ch, 5);
      expectChannel(ch, [2, 3, 4, 5, 6], done);
    });
  });

  describe('flatMap', () => {
    it('works on channels', done => {
      const ch = chan(5, t.flatMap(x => [x, x + 1]));
      fillChannel(ch, 5);
      expectChannel(ch, [1, 2, 2, 3, 3, 4, 4, 5, 5, 6], done);
    });
  });

  describe('filter', () => {
    it('works on channels', done => {
      const ch = chan(5, t.filter(even));
      fillChannel(ch, 10);
      expectChannel(ch, [2, 4, 6, 8, 10], done);
    });
  });

  describe('reject', () => {
    it('works on channels', done => {
      const ch = chan(5, t.reject(even));
      fillChannel(ch, 10);
      expectChannel(ch, [1, 3, 5, 7, 9], done);
    });
  });

  describe('compact', () => {
    it('works on channels', done => {
      const ch = chan(5, t.compact());
      fillChannelWith(ch, [1, 0, 2, null, 3, undefined, 4, '', 5]);
      expectChannel(ch, [1, 2, 3, 4, 5], done);
    });
  });

  describe('take', () => {
    it('works on channels', done => {
      const ch = chan(5, t.take(3));
      fillChannel(ch, 5);
      expectChannel(ch, [1, 2, 3, CLOSED, CLOSED], done);
    });
  });

  describe('takeWhile', () => {
    it('works on channels', done => {
      const ch = chan(5, t.takeWhile(lt4));
      fillChannel(ch, 5);
      expectChannel(ch, [1, 2, 3, CLOSED, CLOSED], done);
    });
  });

  describe('takeNth', () => {
    it('works on channels', done => {
      const ch = chan(5, t.takeNth(3));
      fillChannel(ch, 10);
      expectChannel(ch, [1, 4, 7, 10], done);
    });
  });

  describe('drop', () => {
    it('works on channels', done => {
      const ch = chan(5, t.drop(3));
      fillChannel(ch, 5);
      expectChannel(ch, [4, 5], done);
    });
  });

  describe('dropWhile', () => {
    it('works on channels', done => {
      const ch = chan(5, t.dropWhile(lt4));
      fillChannel(ch, 5);
      expectChannel(ch, [4, 5], done);
    });
  });

  describe('uniq', () => {
    it('works on channels', done => {
      const ch = chan(5, t.uniq());
      fillChannelWith(ch, [1, 1, 2, 3, 3, 3, 4, 5, 3, 1, 5]);
      expectChannel(ch, [1, 2, 3, 4, 5], done);
    });
  });

  describe('uniqBy', () => {
    it('works on channels', done => {
      const ch = chan(5, t.uniqBy(xprop));
      const array = [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
        { x: 3, y: 6 },
        { x: 4, y: 7 },
        { x: 5, y: 8 },
        { x: 3, y: 9 },
        { x: 1, y: 10 },
        { x: 5, y: 11 }
      ];
      const expected = [{ x: 1, y: 1 }, { x: 2, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 7 }, { x: 5, y: 8 }];
      fillChannelWith(ch, array);
      expectChannel(ch, expected, done);
    });
  });

  describe('uniqWith', () => {
    it('works on channels', done => {
      const ch = chan(5, t.uniqWith(magComp));
      fillChannelWith(ch, [6, 42, 632, 23, 56, 893, 1729, 32768, 1000]);
      expectChannel(ch, [6, 42, 632, 1729, 32768], done);
    });
  });

  describe('distinct', () => {
    it('works on channels', done => {
      const ch = chan(5, t.distinct());
      fillChannelWith(ch, [1, 1, 2, 3, 3, 3, 4, 5, 3, 1, 5]);
      expectChannel(ch, [1, 2, 3, 4, 5, 3, 1, 5], done);
    });
  });

  describe('distinctBy', () => {
    it('works on channels', done => {
      const ch = chan(5, t.distinctBy(xprop));
      const array = [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
        { x: 3, y: 6 },
        { x: 4, y: 7 },
        { x: 5, y: 8 },
        { x: 3, y: 9 },
        { x: 1, y: 10 },
        { x: 5, y: 11 }
      ];
      const expected = [
        { x: 1, y: 1 },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
        { x: 4, y: 7 },
        { x: 5, y: 8 },
        { x: 3, y: 9 },
        { x: 1, y: 10 },
        { x: 5, y: 11 }
      ];
      fillChannelWith(ch, array);
      expectChannel(ch, expected, done);
    });
  });

  describe('distinctWith', () => {
    it('works on channels', done => {
      const ch = chan(5, t.distinctWith(magComp));
      fillChannelWith(ch, [6, 42, 632, 23, 56, 893, 1729, 32768, 1000]);
      expectChannel(ch, [6, 42, 632, 23, 893, 1729, 32768, 1000], done);
    });
  });

  describe('chunk', () => {
    it('works on channels', done => {
      const ch = chan(5, t.chunk(3));
      fillChannel(ch, 8, true);
      expectChannel(ch, [[1, 2, 3], [4, 5, 6], [7, 8]], done);
    });
  });

  describe('chunkBy', () => {
    it('works on channels', done => {
      const ch = chan(5, t.chunkBy(even));
      fillChannelWith(ch, [0, 1, 1, 2, 3, 5, 8, 13, 21, 34], true);
      expectChannel(ch, [[0], [1, 1], [2], [3, 5], [8], [13, 21], [34]], done);
    });
  });
});
