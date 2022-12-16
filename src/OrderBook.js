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
    this._gotFirstUpdate = false
  }

  validateWsEvent (data) {
    if (!this.bids.length) {
      return
    }
    const { u, U } = data
    if (!(U <= this.lastUpdateId + 1 && u >= this.lastUpdateId + 1)) {
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

    this.lastUpdateId = data.u

    // NB: new values should override old values!!! careful with dedup!
    this.bids = [...data.b.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.bids]).map(x => ({ ...x, lastUpdateId: this.lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortBid)
    this.asks = [...data.a.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.asks]).map(x => ({ ...x, lastUpdateId: this.lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortAsk)
  }

  async httpUpdate () {
    this._logger.debug('httpUpdate')

    const OBStr = await this._httpClient.get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
    const { bids, asks, lastUpdateId } = JSON.parse(OBStr)

    this.bids = [...bids.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.bids.filter(x => excludeOutdated(x, lastUpdateId))]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortBid)
    this.asks = [...asks.map(x => [(new BigDecimal(x[0])), (new BigDecimal(x[1])), ...this.asks.filter(x => excludeOutdated(x, lastUpdateId))]).map(x => ({ ...x, lastUpdateId }))]
      .filter(excludeNoVolume).filter(excludeDupes).sort(sortAsk)

    this._gotFirstUpdate = true
  }

  top_5_loop () {
    this._logger.debug('top_5_loop')
    setInterval(() => {
      if (this.asks.length === 0 && !this._gotFirstUpdate) {
        this._logger.debug('no data')
      }
      this._logger.info(`Top 5 ask: ${getOBTopNAsStr(this.asks, 5)}`)
      this._logger.info(`Top 5 bid: ${getOBTopNAsStr(this.bids, 5)}`)
    }, 10000)
  }
}

module.exports = { OrderBook }
