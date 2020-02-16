import { expect } from "../helper";

import { EMPTY, queue, fixed, dropping, sliding } from "modules/buffers";

describe("Buffers", () => {
  context("queue", () => {
    let q;

    beforeEach(() => (q = queue()));

    it("begins as an empty queue", () => {
      expect(q.empty).to.be.true;
      expect(q.count).to.equal(0);
    });

    context("dequeue", () => {
      it("removes the oldest item from the queue", () => {
        for (const i of [1, 2, 3]) {
          q.enqueue(i);
        }
        expect(q.dequeue()).to.equal(1);
        expect(q.dequeue()).to.equal(2);
        expect(q.dequeue()).to.equal(3);
        expect(q.empty).to.be.true;
      });

      it("returns EMPTY if the queue is empty", () => {
        expect(q.dequeue()).to.equal(EMPTY);
      });
    });

    context("peek", () => {
      it("peeks at the oldest item in the queue without removing it", () => {
        for (const i of [1, 2, 3]) {
          q.enqueue(i);
        }
        expect(q.peek()).to.equal(1);
        expect(q.peek()).to.equal(1);
        expect(q.peek()).to.equal(1);
        expect(q.count).to.equal(3);
      });

      it("returns EMPTY if the queue is empty", () => {
        expect(q.peek()).to.equal(EMPTY);
      });
    });

    context("filter", () => {
      it("filters queued items by a predicate", () => {
        for (const i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
          q.enqueue(i);
        }
        expect(q.count).to.equal(10);
        q.filter(item => item % 2 === 0);
        expect(q.count).to.equal(5);

        expect(q.dequeue()).to.equal(2);
        expect(q.dequeue()).to.equal(4);
        expect(q.dequeue()).to.equal(6);
        expect(q.dequeue()).to.equal(8);
        expect(q.dequeue()).to.equal(10);
        expect(q.dequeue()).to.equal(EMPTY);
      });
    });
  });

  context("fixed", () => {
    let buffer;

    beforeEach(() => (buffer = fixed(3)));

    it("does not start full", () => {
      expect(buffer.full).to.be.false;
    });

    it("becomes full when enough items are added", () => {
      buffer.add(1, 2, 3);
      expect(buffer.full).to.be.true;
    });

    it("allows items to be added when full", () => {
      buffer.add(1, 2, 3);
      expect(() => buffer.add(3)).not.to.throw();
      expect(buffer.count).to.equal(4);
      expect(buffer.full).to.be.true;
    });

    context("count", () => {
      it("equals the number of items added, even if that exceeds size", () => {
        expect(buffer.count).to.equal(0);
        buffer.add(1);
        expect(buffer.count).to.equal(1);
        buffer.add(2);
        expect(buffer.count).to.equal(2);
        buffer.add(3);
        expect(buffer.count).to.equal(3);
        buffer.add(4);
        expect(buffer.count).to.equal(4);
      });
    });

    context("remove", () => {
      it("returns the oldest item", () => {
        buffer.add(1, 2, 3);

        expect(buffer.remove()).to.equal(1);
        expect(buffer.count).to.equal(2);
        expect(buffer.remove()).to.equal(2);
        expect(buffer.count).to.equal(1);
        expect(buffer.remove()).to.equal(3);
        expect(buffer.count).to.equal(0);
      });

      it("includes items added over the size limit", () => {
        buffer.add(1, 2, 3, 4);

        expect(buffer.full).to.be.true;
        expect(buffer.remove()).to.equal(1);
        expect(buffer.full).to.be.true;
        expect(buffer.remove()).to.equal(2);
        expect(buffer.full).to.be.false;
        expect(buffer.remove()).to.equal(3);
        expect(buffer.remove()).to.equal(4);
        expect(buffer.remove()).to.equal(EMPTY);
      });
    });
  });

  context("dropping", () => {
    let buffer;

    beforeEach(() => (buffer = dropping(3)));

    it("does not start full", () => {
      expect(buffer.full).to.be.false;
    });

    it("never gets full", () => {
      buffer.add(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      expect(buffer.full).to.be.false;
    });

    it("ignores items added after it reaches its size limit", () => {
      buffer.add(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      expect(buffer.count).to.equal(3);
      expect(buffer.remove()).to.equal(1);
      expect(buffer.remove()).to.equal(2);
      expect(buffer.remove()).to.equal(3);
    });

    context("count", () => {
      it("equals the number of added items, up to its limit", () => {
        expect(buffer.count).to.equal(0);
        buffer.add(1);
        expect(buffer.count).to.equal(1);
        buffer.add(2);
        buffer.add(3);
        expect(buffer.count).to.equal(3);
        buffer.add(4);
        expect(buffer.count).to.equal(3);
      });
    });

    context("remove", () => {
      it("returns the oldest item", () => {
        buffer.add(1, 2, 3);
        expect(buffer.remove()).to.equal(1);
        expect(buffer.remove()).to.equal(2);
        expect(buffer.remove()).to.equal(3);
      });

      it("returns EMPTY if the buffer has no items", () => {
        expect(buffer.remove()).to.equal(EMPTY);
      });
    });
  });

  context("sliding", () => {
    let buffer;

    beforeEach(() => (buffer = sliding(3)));

    it("does not start full", () => {
      expect(buffer.full).to.be.false;
    });

    it("never gets full", () => {
      buffer.add(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      expect(buffer.full).to.be.false;
    });

    it("discards the oldest item after it reaches its size limit", () => {
      buffer.add(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
      expect(buffer.count).to.equal(3);
      expect(buffer.remove()).to.equal(8);
      expect(buffer.remove()).to.equal(9);
      expect(buffer.remove()).to.equal(10);
    });

    context("count", () => {
      it("equals the number of added items, up to its limit", () => {
        expect(buffer.count).to.equal(0);
        buffer.add(1);
        expect(buffer.count).to.equal(1);
        buffer.add(2);
        buffer.add(3);
        expect(buffer.count).to.equal(3);
        buffer.add(4);
        expect(buffer.count).to.equal(3);
      });
    });

    context("remove", () => {
      it("returns the oldest item", () => {
        buffer.add(1, 2, 3);
        expect(buffer.remove()).to.equal(1);
        expect(buffer.remove()).to.equal(2);
        expect(buffer.remove()).to.equal(3);
      });

      it("returns EMPTY if the buffer has no items", () => {
        expect(buffer.remove()).to.equal(EMPTY);
      });
    });
  });
});
