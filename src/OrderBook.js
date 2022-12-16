const BigDecimal = require('js-big-decimal')
const { sortBid, sortAsk, excludeNoVolume, excludeOutdated, excludeDupes, getOBTopNAsStr } = require('./utils')
const { DataOutOfSync } = require('./errors')

class OrderBook {
  constructor ({ wsClient, httpClient, logger }) {
    this._wsClient = wsClient
    this._httpClient = httpClient
    this._logger = logger
    this.bids = []
    this.asks = []
    this.lastUpdateId = -1
    this._ready = false
    this._pendingReadyEvt = true
    this._handlers = {}
  }

  validateWsEvent (data) {
    if (!this.bids.length) {
      return
    }
    const { u, U } = data
    // 6. While listening to the stream, each new event's U should be equal to the previous event's u+1.
    if (U !== this.lastUpdateId + 1) {
      return new DataOutOfSync(`Missed data from websocket: lastUpdateId: ${this.lastUpdateId} U: ${U}, u: ${u}`)
    }
  }

  wsUpdate (data) {
    this._logger.debug('wsUpdate', data)
    const validateRes = this.validateWsEvent(data)
    if (validateRes instanceof DataOutOfSync) {
      this._logger.warn(validateRes.message)
      // purposedly deferred
      this.httpUpdate()
      return
    }
    const lastUpdateId = data.u

    // 2. Buffer the events you receive from the stream.
    // NB: new values should override old values!!! careful with dedup!
    this.bids = [...data.b.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.bids]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortBid)
    this.asks = [...data.a.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.asks]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortAsk)

    // 5. The first processed event should have U <= lastUpdateId+1 AND u >= lastUpdateId+1.
    if (this._ready && this._pendingReadyEvt) {
      const { U, u } = data
      if (U <= this.lastUpdateId + 1 && u >= this.lastUpdateId + 1) {
        this._dispatch('ready')
        this._pendingReadyEvt = false
      }
    }

    this.lastUpdateId = lastUpdateId
  }

  async httpUpdate () {
    this._logger.debug('httpUpdate')

    // 3. Get a depth snapshot from https://api.binance.com/api/v3/depth?symbol=BNBBTC&limit=1000 .
    const OBStr = await this._httpClient.get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
    const { bids, asks, lastUpdateId } = JSON.parse(OBStr)

    // 4. Drop any event where u is <= lastUpdateId in the snapshot.
    const validBids = this.bids.filter(x => excludeOutdated(x, lastUpdateId))
    const validAsks = this.asks.filter(x => excludeOutdated(x, lastUpdateId))

    this.bids = [...bids.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...validBids]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortBid)
    this.asks = [...asks.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...validAsks]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortAsk)

    this._ready = true
  }

  top_5_loop () {
    this._logger.debug('top_5_loop')

    if (this.asks.length === 0 && !this._ready) {
      this._logger.debug('no data')
    }

    this._logger.info(`Top 5 ask: ${getOBTopNAsStr(this.asks, 5)}`)
    this._logger.info(`Top 5 bid: ${getOBTopNAsStr(this.bids, 5)}`)

    setTimeout(() => this.top_5_loop(), 10000)
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

module.exports = { OrderBook }
