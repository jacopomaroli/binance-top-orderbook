class Emitter {
  constructor () {
    this._handlers = {}
  }

  _dispatch (handlerName, ...data) {
    if (!this._handlers[handlerName]) {
      return
    }
    for (const handler of this._handlers[handlerName]) {
      handler(...data)
    }
  }

  on (handlerName, handlerFn) {
    (this._handlers[handlerName] = this._handlers[handlerName] || []).push(handlerFn)
  }

  off (handlerName, handlerFn) {
    const index = this._handlers[handlerName].indexOf(handlerFn)
    if (index > -1) {
      this._handlers[handlerName].splice(index, 1)
    }
  }
}

module.exports = {
  Emitter
}
