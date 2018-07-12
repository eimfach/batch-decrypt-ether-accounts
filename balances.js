const querystring = require('querystring')
const http = require('http')
const mosayk = require('mosayk')
const apiUrl = 'http://api.etherscan.io/api'

const requestConfig = {
  module: 'account',
  action: 'balancemulti',
  address: [],
  tag: 'latest',
  apikey: ''
}

module.exports = Object.freeze({
  getBalance
})

async function getBalance ({url, apiKey, addresses}) {
  addresses = addresses.map((addr) => `0x${addr}`)
  const promiseApiRequests = new Promise(async function (resolve, reject) {
    if (addresses.length > 20) {
      let currentRequestCount = 0
      let result = []
      let requests = []

      for (let addressesSeq of mosayk.sequentialIterator(addresses, 20)) {
        if (currentRequestCount === 5) {
          await mosayk.timeout(5150)
        }
        currentRequestCount += 1
        const request =
          requestBalance({url, requestConfig, apiKey, address: addressesSeq})
            .then((data) => {
              result.push(data)
              currentRequestCount -= 1
            })
            .catch((err) => {})

        requests.push(request)
      }
      try {
        await mosayk.allFullfilled(requests) // TODO: List is empty at this point
      } catch (e) {

      } finally {
        resolve(result)
      }
    } else {
      try {
        let data = await requestBalance({url, requestConfig, apiKey, address: addresses})
        resolve(data)
      } catch (e) {
        reject(e)
      }
    }
  })

  return promiseApiRequests
}

function requestBalance ({url = apiUrl, requestConfig, apiKey, address}) {
  let query = querystring.stringify(Object.assign({}, requestConfig, {apiKey, address: address.join(',')}))
  const unescapedDomainUrl = querystring.unescape(`${url}?${query}`)
  const request = new Promise(function (resolve, reject) {
    http.get(unescapedDomainUrl, (res) => {
      res.setEncoding('utf-8')
      let rawData = ''
      res.on('data', (chunk) => { rawData += chunk })
      res.on('end', () => {
        resolve(JSON.parse(rawData))
      })
      res.on('error', (err) => { reject(err) })
    })
  })

  return request
}
