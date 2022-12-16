const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

class Logger {
  constructor (opts) {
    this._defaults = {
      logLevel: LogLevel.INFO
    }
    this._opts = { ...this._defaults, ...opts }
  }

  _date () {
    return (new Date()).toISOString()
  }

  debug (...params) {
    if (this._opts.logLevel > LogLevel.DEBUG) {
      return
    }
    console.log(`${this._date()} - [debug] -`, ...params)
  }

  info (...params) {
    if (this._opts.logLevel > LogLevel.INFO) {
      return
    }
    console.log(`${this._date()} - [info] -`, ...params)
  }

  warn (...params) {
    if (this._opts.logLevel > LogLevel.WARN) {
      return
    }
    console.log(`${this._date()} - [warn] -`, ...params)
  }

  error (...params) {
    if (this._opts.logLevel > LogLevel.ERROR) {
      return
    }
    console.error(`${this._date()} - [error] -`, ...params)
  }
}

module.exports = {
  Logger,
  LogLevel
}
