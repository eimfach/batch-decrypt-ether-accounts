const WebSocketServer = require('websocket').server
const http = require('http')
let server

process.on('message', ({type}) => {
  if (type === 'listen' && !server) {
    server = http.createServer(function (request, response) {
      // process HTTP request. Since we're writing just WebSockets
      // server we don't have to implement anything.
    })
    server.listen(76764, function () { })

    // create the server
    const wsServer = new WebSocketServer({
      httpServer: server
    })

    // WebSocket server
    wsServer.on('request', function (request) {
      const connection = request.accept(null, request.origin)

      // This is the most important callback for us, we'll handle
      // all messages from users here.
      connection.on('message', function (message) {
        if (message.type === 'utf8') {
          // process WebSocket message
        }
      })

      connection.on('close', function (connection) {
        // close user connection
        //
        process.exit(0)
      })
    })
  }
})

