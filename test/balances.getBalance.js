const test = require('blue-tape')
const {teardown, setup} = require('./lib/testServer')
const balances = require('../balances')
// TODO: finalize
//

test('balances.getBalance() returns a collection of balance results',
  (assert) =>
    new Promise(async function (resolve, reject) {
      try {
        const {url} = await setup()
        const addresses = Array(3)
        addresses.fill('123')

        const expected = [{}, {}, {}]
        const actual = await balances.getBalance({url: `${url}/3`, apiKey: 'dummy', addresses})

        assert.deepEqual(actual, expected)
        assert.end()
      } catch (e) {
        reject(e)
      } finally {
        teardown()
      }
      // TODO:  wait for promise asynchonically to resolve the test and calculate requests/sec and assert
    })
)
