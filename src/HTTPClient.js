const https = require('https')

class HTTPClient {
  async get (url) {
    return new Promise((resolve, reject) => {
      https.get(url, (resp) => {
        let data = ''

        resp.on('data', (chunk) => {
          data += chunk
        })

        resp.on('end', () => {
          resolve(data)
        })
      }).on('error', (err) => {
        reject(err)
      })
    })
  }
}

module.exports = {
  HTTPClient
}
