const BigDecimal = require('js-big-decimal')

class OrderBookRecord {
  constructor (price, volume, lastUpdateId) {
    this.price = new BigDecimal(price)
    this.volume = new BigDecimal(volume)
    this.lastUpdateId = lastUpdateId
  }
}

const Side = {
  BID: 0,
  ASK: 1
}

module.exports = {
  OrderBookRecord,
  Side
}
