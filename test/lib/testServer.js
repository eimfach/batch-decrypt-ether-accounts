const express = require('express')

module.exports = (function () {
  let serverHandle

  return {teardown, setup}

  async function setup () {
    serverHandle = stage()
    const info = await serverHandle.start()

    return info
  }

  function teardown () {
    serverHandle.stop()
  }
})()

function stage () {
  const app = express()
  let instance
  let requestCount = 0
  let startTime
  let endTime

  app.set('port', (process.env.PORT || 5000))

  app.get('/3', function (request, response) {
    if (requestCount === 0) {
      startTime = new Date()
    }
    requestCount += 1
    response.send('[{}, {}, {}]')
  })

  return {
    start, stop
  }

  function start () {
    const promiseStart = new Promise(function (resolve, reject) {
      instance = app.listen(app.get('port'), function () {
        resolve({url: 'http://localhost:' + app.get('port')})
      })
    })

    return promiseStart
  }

  function stop () {
    instance.close()
    endTime = new Date()
    return {time: endTime - startTime, requests: requestCount}
  }
}
