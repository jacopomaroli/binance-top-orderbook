const WebSocket = require('ws')
const { Emitter } = require('./Emitter')

class WSClient extends Emitter {
  constructor ({ logger }) {
    super()

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
    })

    this._ws.on('close', () => {
      this._logger.warn('ws closed')
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
}

module.exports = {
  WSClient
}
