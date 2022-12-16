const BigDecimal = require('js-big-decimal')

const bigDecimalZero = new BigDecimal('0')

const sortBid = (a, b) => b[0].subtract(a[0])

const sortAsk = (a, b) => a[0].subtract(b[0])

const excludeNoVolume = x => x[1].compareTo(bigDecimalZero) === 1

const excludeOutdated = (x, lastUpdateId) => x.u > lastUpdateId

const getOBTopN = (side, n) => side.slice(0, n).map(x => x[0].getValue())

const getOBTopNAsStr = (side, n) => getOBTopN(side, n).join(', ')

const excludeDupes = (value, index, self) => {
  return self.findIndex(x => value[0].compareTo(x[0]) === 0) === index
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
