const { Logger, LogLevel } = require('./Logger')
const { HTTPClient } = require('./HTTPClient')
const { WSClient } = require('./WSClient')
const { OrderBook } = require('./OrderBook')

// const eventsBuffer = []

// const snapshot = {}
// const lastPrint = 0

// function printReport () {
//   const events = eventsBuffer
//   eventsBuffer = []
//   const now = performance.now()
//   const printReportTimeout = Math.max(now - lastPrint + LOOP_INTERVAL_MS, LOOP_INTERVAL_MS)
//   lastPrint = now
//   setTimeout(printReport, printReportTimeout)
// }

// async function main2 () {
//   let prevEvent = null
//   // 1. Open a stream to wss://stream.binance.com:9443/ws/bnbbtc@depth.
//   const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth')

//   ws.on('open', function open () {
//     console.log('websocket open')
//   })

//   // 2. Buffer the events you receive from the stream.
//   ws.on('message', function message (data) {
//     const event = JSON.parse(data.toString())
//     const { lastUpdateId } = snapshot
//     const { U, u } = event

//     // 4. Drop any event where u is <= lastUpdateId in the snapshot.
//     if (u <= lastUpdateId) {
//       return
//     }

//     // 5. The first processed event should have U <= lastUpdateId+1 AND u >= lastUpdateId+1.
//     const isFirstProcessedEvent = !prevEvent // if no prevEvent is present, this event is the first
//     if (isFirstProcessedEvent && !(U <= lastUpdateId + 1 && u >= lastUpdateId + 1)) {
//       return
//     }

//     // 6. While listening to the stream, each new event's U should be equal to the previous event's u+1.
//     if (prevEvent && event.U !== prevEvent.U + 1) {
//       console.error(`Error: Event's U should be equal to the previous event's u+1;\n(found: ${event.U}, expected: ${prevEvent.U + 1})`)
//     }

//     eventsBuffer.push(event)
//     prevEvent = event
//   })

//   console.log('hello')

//   // 3. Get a depth snapshot from https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=1000 .
//   const snapshotStr = await get('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=100')
//   snapshot = JSON.parse(snapshotStr)
//   console.log(snapshot)
//   console.log('done')

//   printReport()

//   // 7. The data in each event is the absolute quantity for a price level.
//   // 8. If the quantity is 0, remove the price level.
//   // 9. Receiving an event that removes a price level that is not in your local order book can happen and is normal.
// }

async function main ({ logger }) {
  logger.debug('Start')

  const wsClient = new WSClient({ logger })
  const httpClient = new HTTPClient({ logger })
  const orderBook = new OrderBook({ wsClient, httpClient, logger })

  wsClient.on('depthUpdate', (data) => orderBook.wsUpdate(data))
  wsClient.on('firstData', () => orderBook.httpUpdate())

  orderBook.top_5_loop()
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
