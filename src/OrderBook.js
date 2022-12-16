const BigDecimal = require('js-big-decimal')
const { sortBid, sortAsk, excludeNoVolume, excludeOutdated, excludeDupes, getOBTopNAsStr } = require('./utils')
const { DataOutOfSync } = require('./errors')
const { Emitter } = require('./Emitter')

class OrderBookRecord {
  constructor (price, volume, lastUpdateId) {
    this.price = new BigDecimal(price)
    this.volume = new BigDecimal(volume)
    this.lastUpdateId = lastUpdateId
  }
}

class OrderBook extends Emitter {
  constructor ({ wsClient, httpClient, logger }) {
    super()

    this._wsClient = wsClient
    this._httpClient = httpClient
    this._logger = logger
    this.bids = []
    this.asks = []
    this.lastUpdateId = -1
    this._ready = false
    this._pendingReadyEvt = true
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

  async _getOB () {
    const OBStr = await this._httpClient.get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
    return JSON.parse(OBStr)
  }

  // 7. The data in each event is the absolute quantity for a price level.
  // 8. If the quantity is 0, remove the price level.
  // 9. Receiving an event that removes a price level that is not in your local order book can happen and is normal.
  _getUpdatedOBSide (obSideOld, obSideData, lastUpdateId, sortFn) {
    const obSideNew = obSideData.map(x => new OrderBookRecord(x[0], x[1], lastUpdateId))

    // NB: new values should override old values!!! careful with merge order and dedup!
    // NB: we need to excludeNoVolume AFTER combining new + old and excludeDupes in order to remove 0 level
    return [...obSideNew, ...obSideOld].filter(excludeDupes).filter(excludeNoVolume).sort(sortFn)
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
    this.bids = this._getUpdatedOBSide(this.bids, data.b, lastUpdateId, sortBid)
    this.asks = this._getUpdatedOBSide(this.asks, data.a, lastUpdateId, sortAsk)

    // 5. The first processed event should have U <= lastUpdateId+1 AND u >= lastUpdateId+1.
    if (this._ready && this._pendingReadyEvt) {
      const { U, u } = data
      if (U <= this.lastUpdateId + 1 && u >= this.lastUpdateId + 1) {
        this._dispatch('ready')
        this._pendingReadyEvt = false
      }
    }

    // NB: this needs to be done after the readiness check
    // we don't want to check an event against itself with itself
    this.lastUpdateId = lastUpdateId
  }

  async httpUpdate () {
    this._logger.debug('httpUpdate')

    // 3. Get a depth snapshot from https://api.binance.com/api/v3/depth?symbol=BNBBTC&limit=1000 .
    const { bids, asks, lastUpdateId } = await this._getOB()

    // 4. Drop any event where u is <= lastUpdateId in the snapshot.
    const validBids = this.bids.filter(x => excludeOutdated(x, lastUpdateId))
    const validAsks = this.asks.filter(x => excludeOutdated(x, lastUpdateId))

    this.bids = this._getUpdatedOBSide(validBids, bids, lastUpdateId, sortBid)
    this.asks = this._getUpdatedOBSide(validAsks, asks, lastUpdateId, sortAsk)

    this._ready = true
  }

  top_5_loop () {
    this._logger.debug('top_5_loop')

    if (!this._ready || this.asks.length === 0) {
      this._logger.debug('no data')
    }

    this._logger.info(`Top 5 ask: ${getOBTopNAsStr(this.asks, 5)}`)
    this._logger.info(`Top 5 bid: ${getOBTopNAsStr(this.bids, 5)}`)

    setTimeout(() => this.top_5_loop(), 10000)
  }
}

module.exports = { OrderBook }
