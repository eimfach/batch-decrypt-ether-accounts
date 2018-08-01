const express = require('express')
const URL = require('url').URL

module.exports = (function () {
  let serverHandle

  return {teardown, setup}

  async function setup () {
    serverHandle = stage()
    const info = await serverHandle.start()

    return info
  }

  async function teardown () {
    return serverHandle.stop()
  }
})()

function stage () {
  const app = express()
  let host = 'http://127.0.0.1'
  let instance
  let requestCount = 0
  let startTime
  let endTime
  let requestDataLog = []

  app.set('port', 4987)

  app.get('/balance', function (request, response) {
    if (requestCount === 0) {
      startTime = new Date()
    }
    const reqUrl = new URL(request.url, host)

    const receivedAddresses = reqUrl.searchParams.get('address')
    if (receivedAddresses != null) {
      const addressList = receivedAddresses.split(',')
      requestDataLog.push(addressList)

      requestCount += 1
      response.send(addressList.map(
        (address) => ({ account: address })
      ))
    } else {
      response.writeHead(401)
    }
  })

  return {
    start, stop
  }

  function start () {
    const promiseStart = new Promise(function (resolve, reject) {
      const baseUrl = host + ':' + app.get('port')
      instance = app.listen(app.get('port'), function () {
        resolve({url: baseUrl})
      })
    })

    return promiseStart
  }

  function stop () {
    endTime = new Date()
    const closeConnection = new Promise(function (resolve, reject) {
      try {
        instance.on('close', () => {
          resolve({time: endTime - startTime, requests: requestCount, requestDataLog})
        })
        instance.close()
      } catch (e) {
        reject('error closing')
      }
    })

    return closeConnection
  }
}
