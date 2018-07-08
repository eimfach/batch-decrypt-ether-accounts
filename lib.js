const os = require('os')
const fs = require('fs')

const config = (function (process, JSON, homedir) {
  const [,, ...argv] = process.argv
  const parsedParams = parseArgs(argv)

  const configDefaults = {
    backup: 0,
    continue: 1,
    limit: 10,
    pwfile: `${homedir}/.ethereum-accounts-batch-decrypt-passwords.json`,
    etherpath: `${homedir}/.ethereum`,
    showfalsy: 0
  }

  return {
    ...configDefaults,
    ...parsedParams
  }
})(process, JSON, os.homedir())

const api = (function (fs, os, {pwfile}) {
  const path = os.homedir() + '/.ethereum-accounts-batch-decrypt.log'
  // add try catch
  const filePointer =
    fs.openSync(path, 'r+', (err) => { throw err })

  const pwFilePointer =
    fs.openSync(pwfile, 'r+', (err) => { throw err })

  const logEntries = []

  return {
    logEntry: (success, account, privateKey, pw) => {
      logEntries.push(createEntry(success, account, privateKey, pw))
    },
    init: ({continue: cont, pwfile}) => {
      const result = {}
      if (cont) {
        const fileContent = fs.readFileSync(filePointer, {encoding: 'utf-8'})
        let entries
        try {
          entries = JSON.parse(fileContent)
        } catch (e) {
          entries = []
        }
        const successfullEntries = entries.filter((item) => item.success)

        logEntries.push(...successfullEntries)
        result.verifiedAccounts = successfullEntries.reduce(
          (previous, current) => { return [...previous, current.account] }
          , []
        )
      }

      const fileContent = fs.readFileSync(pwFilePointer, {encoding: 'utf-8'})
      result.passwords = JSON.parse(fileContent)

      return result
    },
    close: () => {
      try {
        if (logEntries.length) {
          fs.writeFileSync(filePointer, JSON.stringify(logEntries))

          if (config.backup) {
            fs.writeFileSync(path + '.backup.' + Date.now(), JSON.stringify(logEntries))
          }
        }
        fs.closeSync(filePointer)
      } catch (e) {
        console.log(e)
      } finally {
        console.log(logEntries)
      }
    }
  }

  function createEntry (success, account, privateKey, pw) {
    return {
      success, account, privateKey, pw
    }
  }
})(fs, os, {pwfile: config.pwfile})

function parseArgs (argv) {
  let parsedProperties = argv.map(
    (param) => {
      let [key, value] = param.split('=')
      return {
        [key]: value
      }
    }
  )
  return Object.assign({}, ...parsedProperties)
}

module.exports = Object.freeze({
  config,
  api
})
