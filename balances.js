const querystring = require('querystring')
const http = require('http')
const mosayk = require('mosayk')
const apiUrl = 'http://api.etherscan.io/api'

const requestConfig = {
  module: 'account',
  action: 'balancemulti',
  address: [],
  tag: 'latest',
  apiKey: ''
}

module.exports = Object.freeze({
  getBalance
})

async function getBalance ({url, apiKey, addresses}) {
  for (let address of addresses) {
    if (!mosayk.number.isValidHex(address)) {
      throw new Error('Invalid hex value given: ' + address)
    }
  }
  addresses = addresses.map((addr) => `0x${addr}`)

  if (addresses.length > 20) {
    let result = []
    let requests = []
    const addressSequences = mosayk.iterable.sequence(addresses, 20)
    for (let addressesSeq of addressSequences) {
      const request =
          requestBalance({url, requestConfig, apiKey, address: addressesSeq})
            .catch(err => err)

      await mosayk.promise.timeout(1000)
      requests.push(request)
    }
    result = [...(await mosayk.promise.allFullfilled(requests))]
  } else {
    result = await requestBalance({url, requestConfig, apiKey, address: addresses})
  }

  return result
}

function requestBalance ({url = apiUrl, requestConfig, apiKey, address}) {
  let query = querystring.stringify(Object.assign({}, requestConfig, {apiKey, address: address.join(',')}))
  const unescapedDomainUrl = querystring.unescape(`${url}?${query}`)

  const request = new Promise(function (resolve, reject) {
    http.get(unescapedDomainUrl, (response) => {
      let rawData = ''

      response.setEncoding('utf-8')
      response.on('data', (chunk) => { rawData += chunk })
      response.on('end', () => {
        const contentType = response.headers['content-type']
        if (contentType !== 'application/json; charset=utf-8') {
          reject(new Error('Invalid Content-Type: ' + contentType + ' on: ' + unescapedDomainUrl))
        } else {
          resolve(JSON.parse(rawData))
        }
      })
      response.on('error', reject)
    })
  })

  return request
}
