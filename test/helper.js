import chai from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

export const expect = chai.expect;

export function testAsync(fn) {
  return async (done) => {
    try {
      await fn();
      done();
    } catch (err) {
      done(err);
    }
  };
}
