const { sortBid, sortAsk, excludeNoVolume, excludeOutdated, getOBTopNAsStr } = require('./utils')
const { OrderBookRecord, Side } = require('../src/dataStructures')
const { DataOutOfSync } = require('./errors')
const { Emitter } = require('./Emitter')

class OrderBook extends Emitter {
  constructor ({ wsClient, httpClient, logger, config }) {
    super()

    this._wsClient = wsClient
    this._httpClient = httpClient
    this._logger = logger
    this._config = config
    this.bids = new Map()
    this.asks = new Map()
    this.lastUpdateId = -1
    this._ready = false
    this._pendingReadyEvt = true
    this._rcvUpdatesCount = 0
  }

  validateWsEvent (data) {
    if (!this.bids.length) {
      return
    }

    const { U } = data

    // 6. While listening to the stream, each new event's U should be equal to the previous event's u+1.
    if (U !== this.lastUpdateId + 1) {
      return new DataOutOfSync(`Missed data from websocket: lastUpdateId: ${this.lastUpdateId} U: ${U}`)
    }
  }

  async _getOB () {
    const OBStr = await this._httpClient.get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
    return JSON.parse(OBStr)
  }

  _maybeDispatchReadyEvt (data) {
    if (!this._ready || !this._pendingReadyEvt) {
      return
    }

    const { U, u } = data

    // 5. The first processed event should have U <= lastUpdateId+1 AND u >= lastUpdateId+1.
    if (U <= this.lastUpdateId + 1 && u >= this.lastUpdateId + 1) {
      this._dispatch('ready')
      this._pendingReadyEvt = false
    }
  }

  _dedupMap (obSideOld, obSideData, lastUpdateId) {
    const obSideNew = new Map(obSideData.map(x => [x[0], new OrderBookRecord(x[0], x[1], lastUpdateId)]))
    return [...new Map([...obSideOld, ...obSideNew])]
  }

  // 7. The data in each event is the absolute quantity for a price level.
  // 8. If the quantity is 0, remove the price level.
  // 9. Receiving an event that removes a price level that is not in your local order book can happen and is normal.
  _getUpdatedOBSide (obSideOld, obSideData, lastUpdateId, sortFn) {
    // NB: new values should override old values!!! careful with merge order and dedup!
    // NB: we need to excludeNoVolume AFTER combining new + old and excludeDupes in order to remove 0 level
    const processed = this._dedupMap(obSideOld, obSideData, lastUpdateId).filter((x) => excludeNoVolume(x[1])).sort((a, b) => sortFn(a[1], b[1]))
    return new Map(processed)
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

    this._maybeDispatchReadyEvt(data)

    // NB: this needs to be done after the readiness check
    // we don't want to check an event against itself
    this.lastUpdateId = lastUpdateId

    this._rcvUpdatesCount++
    if (this._rcvUpdatesCount === this._config.warmupUpdatesCount) {
      this.httpUpdate()
    }
  }

  async httpUpdate () {
    this._logger.debug('httpUpdate')

    // 3. Get a depth snapshot from https://api.binance.com/api/v3/depth?symbol=BNBBTC&limit=1000 .
    const { bids, asks, lastUpdateId } = await this._getOB()

    // 4. Drop any event where u is <= lastUpdateId in the snapshot.
    const validBids = new Map([...this.bids].filter(x => excludeOutdated(x[1], lastUpdateId)))
    const validAsks = new Map([...this.asks].filter(x => excludeOutdated(x[1], lastUpdateId)))

    this.bids = this._getUpdatedOBSide(validBids, bids, lastUpdateId, sortBid)
    this.asks = this._getUpdatedOBSide(validAsks, asks, lastUpdateId, sortAsk)

    this._ready = true
  }

  getTopNAsStr (side, n) {
    if (!this._ready || this.bids.length === 0 || this.asks.length === 0) {
      this._logger.debug('no data')
      return ''
    }

    if (side === Side.BID) {
      return getOBTopNAsStr([...this.bids.values()], n)
    }
    if (side === Side.ASK) {
      return getOBTopNAsStr([...this.asks.values()], n)
    }
  }
}

module.exports = {
  OrderBook
}
