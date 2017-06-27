const chai = require('chai');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

function testAsync(fn) {
  return async (done) => {
    try {
      await fn();
      done();
    } catch (err) {
      done(err);
    }
  };
}

module.exports = {
  expect: chai.expect,
  testAsync
};
