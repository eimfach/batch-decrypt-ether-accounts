const test = require('blue-tape')
const {teardown, setup} = require('./lib/testServer')
const balances = require('../balances')

test('balances.getBalance() returns a collection of balance results',
  async (assert) => {
    const {url} = await setup()
    const addresses = new Array(3)
    addresses.fill('123')

    const expected = [{account: '0x123'}, {account: '0x123'}, {account: '0x123'}]
    const actual =
      await balances.getBalance({url: `${url}/balance`, apiKey: 'dummy', addresses})

    await teardown()
    assert.deepEqual(actual, expected)
  }
)

test('balances.getBalance() expects exception if first given number is no valid hex',
  async (assert) => {
    const {url} = await setup()
    const addresses = ['123', 'AB23', '1AXYZABO', '2BXYZAB1']
    const expected = new Error('Invalid hex value given: ' + addresses[2])
    let actual = new Error()

    try {
      await balances.getBalance({url: `${url}/balance`, apiKey: 'dummy', addresses})
    } catch (e) {
      actual = e
    }
    await teardown()
    assert.deepEqual(expected.message, actual.message)
  }
)

test('balances.getBalance() has a treshold of 1 request/sec (odd)',
  async (assert) => {
    const expected = 1.0
    const actual = await requestTreshold(201)
    assert.equal(actual, expected)
  }
)

test('balances.getBalance() has a treshold of 1 request/sec (even)',
  async (assert) => {
    const expected = 1.0
    const actual = await requestTreshold(200)
    assert.equal(actual, expected)
  }
)

async function requestTreshold (items) {
  const {url} = await setup()
  const addresses = Array(items) // odd
  addresses.fill('123')
  await balances.getBalance({url: `${url}/balance`, apiKey: 'dummy', addresses})

  const {time, requests, requestDataLog} = await teardown()
  const dte = new Date(time)
  const secondsPassed = dte.getSeconds()
  let ratio = 0
  if (secondsPassed > 0) {
    ratio = requests / secondsPassed
  }

  return ratio
}
