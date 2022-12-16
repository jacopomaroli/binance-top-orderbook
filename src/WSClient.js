const WebSocket = require('ws')

class WSClient {
  constructor ({ logger }) {
    this._logger = logger
    this._init()
    this._handlers = {}
  }

  _init () {
    // 1. Open a stream to wss://stream.binance.com:9443/ws/bnbbtc@depth.
    this._ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth')

    this._ws.on('open', () => {
      this._logger.debug('ws open')
      this._keepalive()
      this._firstData = false
    })

    this._ws.on('close', () => {
      this._logger.warn('ws closed')
      this._firstData = false
    })

    this._ws.on('error', () => {
      this._logger.debug('ws error')
    })

    this._ws.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString())
        if (!this._handlers[event.e]) {
          this._logger.warn(`Unhandled event: ${event.e}`)
          return
        }
        this._dispatch(event.e, event)
        if (!this._firstData) {
          this._firstData = true
          this._dispatch('firstData')
        }
      } catch (e) {
        this._logger.warn('Could not parse message', e)
      }
    })
  }

  _keepalive () {
    setInterval(() => {
      if (this._ws.readyState !== WebSocket.OPEN) {
        return
      }
      this._ws.ping()
    }, 15000)
  }

  _dispatch (handlerName, ...data) {
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
  WSClient
}
