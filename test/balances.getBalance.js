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

test('balances.getBalance() has a treshold of 1 request/sec',
  async (assert) => {
    const {url} = await setup()
    const addresses = Array(201)
    addresses.fill('123')
    try {
      await balances.getBalance({url: `${url}/balance`, apiKey: 'dummy', addresses})
    } catch (e) {
      await teardown()
      reject(e)
    }

    const {time, requests} = await teardown()
    const dte = new Date(time)
    const secondsPassed = dte.getSeconds()
    let ratio
    if (secondsPassed > 0) {
      ratio = requests / secondsPassed
    }

    const expected = 1.0
    const actual = ratio

    assert.equal(actual, expected)
  }

)
