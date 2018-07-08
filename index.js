const fs = require('fs')
const {api, config} = require('./lib')
// TODO: add tests, use tape.js

const childProcess = require('child_process')
const start = Date.now()

let processExitCode = 0

const etherPath = '/Volumes/ocz-vertex2/Ethereum'
const threadCount = 4

const subProcessMap = new Map()

const initalizationData = (function (api, config) {
  return api.init({continue: config.continue})
})(api, config)

setProcessEventListeners(process)

const promisePrivateKeyPointers = new Promise(function (resolve, reject) {
  fs.readdir(config.etherpath + '/keystore', 'utf-8', (err, files) => {
    if (err) {
      reject(err)
    } else {
      let accountPubKeys = new Set(files.map((file) => { return file.split('--').reverse()[0] }))

      if (initalizationData.verifiedAccounts.length) {
        console.log(`Found ${initalizationData.verifiedAccounts.length} validated accounts, continue processing at last state ...`)
        while (initalizationData.verifiedAccounts.length) {
          let verifiedPubKey = initalizationData.verifiedAccounts.shift()
          accountPubKeys.delete(verifiedPubKey)
        }
      }

      resolve([...accountPubKeys.values()].slice(0, config.limit))
    }
  })
})

promisePrivateKeyPointers
  .then(async accounts => { /* verify all private keys with given pw */
    let successBatch = {}
    const batchItemPromises = []
    const batchItemsList = []
    let currentProcessCount = 0

    console.log('preparing batch list for all accounts, this may take a moment ...')
    for (let account of accounts) {
      let resolveWrapper
      const wrapperPromise = new Promise(function (resolve, reject) {
        resolveWrapper = resolve
      })

      const batchItem =
        {
          start: () => {
            const delegationPromise = createDelegationPromise(account)
            resolveWrapper(delegationPromise)

            return Promise.resolve()
          },
          delegationPromise: wrapperPromise
        }

      successBatch[account] = batchItem
    }

    for (let batchItemKey of Object.keys(successBatch)) {
      batchItemsList.push(successBatch[batchItemKey])
      batchItemPromises.push(successBatch[batchItemKey].delegationPromise)
    }

    const promiseBatchProcessing = new Promise(function (resolve, reject) {
      const batchItemsIterator = batchItemsList[Symbol.iterator]()
      setTimeout(batchProcess)

      function batchProcess () {
        if (currentProcessCount < threadCount) {
          let batchItem = batchItemsIterator.next()
          if (batchItem.done) {
            resolve(Promise.all(batchItemPromises))
            return
          }
          batchItem.value
            .start()
            .then(() => {
              setTimeout(() => {
                currentProcessCount += 1
                batchProcess()
              }, 0)
              return batchItem.value.delegationPromise
            })
            .catch(err => { console.log(err.message) })
            .finally(() => {
              currentProcessCount -= 1
            })
        } else {
          setTimeout(batchProcess, 10)
        }
      }
    })

    return promiseBatchProcessing
  })
  .then(() => {
    console.log('----------------------------------\n\n\n\n\n[SUCCESS] \n\n\nEvery account is valid with given Password\n\n\n[SUCCESS]\n\n\n\n\n----------------------------------')
  })
  .catch(err => {
    processExitCode = 1

    process.on('exit', (code, signal) => {
      console.log('----------------------------------\n\n\n\n\n[FAILURE] \n\n\nSome accounts were invalid\n\n\n[FAILURE]\n\n\n\n\n----------------------------------')
      console.log('Message: ', err)
      console.log('Exit Code: ', code)
      console.log('Exit Signal: ', signal)
    })
  })
  .finally(() => {
    process.exit(processExitCode)
  })

function appendListenersToSubProcess (subprocess, getSuccessMsg, getFailMsg, onError, onExit) {
  subprocess.on('message', ({requestSignal: signal, privateKey, account, pw, success, errMsg}) => {
    if (privateKey && account && pw) {
      if (!success) {
        console.log(getFailMsg({errMsg, account}))
        api.logEntry(false, account, privateKey, pw)
        onError(errMsg)
      } else {
        console.log(getSuccessMsg({privateKey, account}))
        api.logEntry(true, account, privateKey, pw)
        onExit()
      }
    }
    if (signal) {
      subprocess.send(signal)
      console.log('[' + subprocess.pid + '] sent ' + signal)
    }
    if (!signal && !(privateKey && account && pw)) {
      onError('[WARNING] received invalid message from subprocess')
    }
  })

  subprocess.on('error', (err) => onError(err))

  subprocess.on('exit', () => {
    subProcessMap.delete(subprocess.pid)
  })
}

function createDelegationPromise (account) {
  const delegation = new Promise(function (resolve, reject) {
    const subprocess = childProcess.fork('verify-private-key-process')
    subProcessMap.set(subprocess.pid, subprocess)

    const getSuccessMsg = ({privateKey, account}) => '[SUCCESS ' + account.slice(0, 8) + '...]\t\t' +
    privateKey.slice(0, 8) + '...\t'
    const getFailMsg = ({errMsg, account}) => '[FAILURE ' + account.slice(0, 8) + '...]\t\t' + errMsg
    appendListenersToSubProcess(subprocess, getSuccessMsg, getFailMsg, reject, resolve)

    subprocess.send({account, etherPath, passwords: initalizationData.passwords})
  })
  return delegation
}

function setProcessEventListeners (process) {
  process.on('SIGINT', () => {
    console.log('SIGINT: Await writing and closing log ...')
    try {
      api.close()
      for (let subproc of subProcessMap) {
        subproc[1].kill()
      }
    } catch (e) {
      console.log(e)
    }
  })
  process.on('exit', (code) => {
    console.log('Exit Code ' + code + ': Await writing and closing log ...')
    try {
      api.close()
      for (let subproc of subProcessMap) {
        subproc[1].kill()
      }
    } catch (e) {
      console.log(e)
    } finally {
      const d = (new Date(Date.now() - start))
      const time = `${d.getHours()}h ${d.getMinutes()}m ${d.getSeconds()}s`
      console.log('Time consumed: ', time)
    }
  })
}
