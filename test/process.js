/* eslint-disable mocha/max-top-level-suites */
const chai = require('chai')
const { expect } = chai
const { OrderBookRecord } = require('../src/dataStructures')
const { OrderBook: OrderBookMap } = require('../src/OrderBookMap')
const { OrderBook: OrderBookArray } = require('../src/OrderBookArray')
const { sortBid, sortAsk } = require('../src/utils')

describe('OrderBookMap', function () {
  it('deduplicates/filter empty volume/sort as per specs', function () {
    const orderBook = new OrderBookMap({})
    const oldUpdateId = 123
    const newUpdateId = 456

    const obSideOld = new Map([
      ['1', new OrderBookRecord('1', 1, oldUpdateId)],
      ['2', new OrderBookRecord('2', 3, oldUpdateId)],
      ['3', new OrderBookRecord('3', 5, oldUpdateId)]
    ])
    const expected = new Map([
      ['1', new OrderBookRecord('1', 1, oldUpdateId)],
      ['2', new OrderBookRecord('2', 7, newUpdateId)]
    ])
    const obSideData = [['2', 7], ['3', 0]]

    const result = orderBook._getUpdatedOBSide(obSideOld, obSideData, newUpdateId, sortBid)
    expect(result).to.deep.eq(expected)
  })
})

describe('OrderBookArray', function () {
  it('deduplicates/filter empty volume/sort as per specs', function () {
    const orderBook = new OrderBookArray({})
    const oldUpdateId = 123
    const newUpdateId = 456

    const obSideOld = [
      new OrderBookRecord('1', 1, oldUpdateId),
      new OrderBookRecord('2', 3, oldUpdateId),
      new OrderBookRecord('3', 5, oldUpdateId)
    ]
    const expected = [
      new OrderBookRecord('1', 1, oldUpdateId),
      new OrderBookRecord('2', 7, newUpdateId)
    ]
    const obSideData = [['2', 7], ['3', 0]]

    const result = orderBook._getUpdatedOBSide(obSideOld, obSideData, newUpdateId, sortAsk)
    expect(result).to.deep.eq(expected)
  })
})
