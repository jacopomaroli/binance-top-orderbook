const { Logger, LogLevel } = require('./Logger')
const { HTTPClient } = require('./HTTPClient')
const { WSClient } = require('./WSClient')
const { OrderBook } = require('./OrderBookMap')
// const { OrderBook } = require('./OrderBookArray')

async function main ({ logger }) {
  logger.debug('Start')

  const wsClient = new WSClient({ logger })
  const httpClient = new HTTPClient({ logger })
  const orderBook = new OrderBook({ wsClient, httpClient, logger })

  wsClient.on('depthUpdate', (data) => orderBook.wsUpdate(data))
  wsClient.on('firstData', () => orderBook.httpUpdate())
  orderBook.on('ready', () => orderBook.top_5_loop())
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
