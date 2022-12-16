const BigDecimal = require('js-big-decimal')

const bigDecimalZero = new BigDecimal('0')

const sortBid = (a, b) => b.price.subtract(a.price)

const sortAsk = (a, b) => a.price.subtract(b.price)

const excludeNoVolume = x => x.volume.compareTo(bigDecimalZero) === 1

const excludeOutdated = (x, lastUpdateId) => x.u > lastUpdateId

const getOBTopN = (side, n) => side.slice(0, n).map(x => x.price.getValue())

const getOBTopNAsStr = (side, n) => getOBTopN(side, n).join(', ')

const excludeDupes = (value, index, self) => {
  return self.findIndex(x => value.price.compareTo(x.price) === 0) === index
}

module.exports = {
  sortBid,
  sortAsk,
  excludeNoVolume,
  excludeOutdated,
  getOBTopN,
  getOBTopNAsStr,
  excludeDupes
}
