# Binance top orderbook
This project aims to demonstrate how to maintain a local orderbook and periodically show the top 5 price levels for each side (Bid - Ask)

# How to run
This project supports make. Please run the following to install deps and run the project
- make deps
- make run

If you don't have make just run
- npm install
- npm start

## Vanilla JS vs BigDecimal precision
Javascript (as many other programming languages) is subject to the limitations of [IEEE_754](https://en.wikipedia.org/wiki/IEEE_754#Basic_and_interchange_formats).\
Numbers are stored in memory as an integer times a power of two.\
Numbers like `0.1` (indeed `1/10`) can't be represented in binary, the same way decimals fail to represent numbers like `1/3`.

I therefore decided to use BigDecimal which handles arithmetic operations using `Column Method`
