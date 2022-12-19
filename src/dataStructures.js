const BigDecimal = require('js-big-decimal')

class OrderBookRecord {
  constructor (price, volume, lastUpdateId) {
    this.price = new BigDecimal(price)
    this.volume = new BigDecimal(volume)
    this.lastUpdateId = lastUpdateId
  }
}

module.exports = {
  OrderBookRecord
}
