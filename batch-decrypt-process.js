const keyth = require('keythereum')
const querystring = require('querystring')

process.on('message', async function ({account, etherpath, passwords}) {
  try {
    let {privateKey, pw} = await batchDecryptPrivateKey(etherpath, account, passwords)

    process.send({success: true, privateKey, account, pw})
  } catch (e) {
    process.send({success: false, errMsg: e.message, privateKey: 'no result', pw: 'out of: ' + passwords.map((pw) => querystring.unescape(pw)).join('  |  '), account})
    process.exit(1)
  }
  process.exit(0)
})

async function batchDecryptPrivateKey (path, account, passwords) {
  console.log('[pid:' + process.pid + ' pub: ' + account + '] verifiyingPrivateKey()')
  const keyobj = keyth.importFromFile(account, path)

  const promisePrivateKey = new Promise(function (resolve, reject) {
    for (let pw of passwords) {
      try {
        keyth.recover(pw, keyobj)
        resolve({privateKey: '...', pw: passwords[0]})
      } catch (e) {
      }
    }
    reject(new Error('No password matched'))
  })

  return promisePrivateKey
}
