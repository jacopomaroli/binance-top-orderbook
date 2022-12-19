const { Logger, LogLevel } = require('./Logger')
const { HTTPClient } = require('./HTTPClient')
const { WSClient } = require('./WSClient')
// const { OrderBook } = require('./OrderBookMap')
const { OrderBook } = require('./OrderBookArray')
const { Side } = require('../src/dataStructures')

const config = {
  warmupUpdatesCount: 2
}

function top5Loop ({ logger, orderBook }) {
  logger.debug('top_5_loop')

  logger.info(`Top 5 ask: ${orderBook.getTopNAsStr(Side.ASK, 5)}`)
  logger.info(`Top 5 bid: ${orderBook.getTopNAsStr(Side.BID, 5)}`)

  setTimeout(() => top5Loop({ logger, orderBook }), 10000)
}

async function main ({ logger }) {
  logger.debug('Start')

  const wsClient = new WSClient({ logger })
  const httpClient = new HTTPClient({ logger })
  const orderBook = new OrderBook({ wsClient, httpClient, logger, config })

  wsClient.on('depthUpdate', (data) => orderBook.wsUpdate(data))
  orderBook.on('ready', () => top5Loop({ logger, orderBook }))
}

async function gCatcher () {
  const logger = new Logger({
    logLevel: LogLevel.INFO
  })

  try {
    await main({ logger })
  } catch (e) {
    logger.error(e, 'gCatcher()')
  }
}

gCatcher()
