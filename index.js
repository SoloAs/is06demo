const bodyParser = require('body-parser')
const winston = require('winston')
const request = require('request')
const express = require('express')
const app = express()
const tsFormat = () => (new Date()).toLocaleTimeString()
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true
    })
  ]
})

var api = "http://127.0.0.1:8081"

processCLIArgs = async () => {
    process.argv.forEach((val, index, array) => {
      if (index > 1) {
        let argument = val.split('=')
        argument[0] = argument[0].replace('--', '').toLowerCase()
        if (argument[0].includes('networkcontroller') || argument[0].includes('nc')) api = argument[1]
      }
    })
  }

initServer = async () => {
    try {
      await processCLIArgs()
      logger.info('Starting demo app initialization')
      logger.info('NC API is located on ' + api)
      await checkAPIAvailability(api)
      
      logger.info('Initialization is complete!')
    } catch (error) {
      logger.info('Error on initialization is thrown')
      throw error
    }
  }

  var server = app.listen(1337, () => {
    initServer()

  })



  checkAPIAvailability = async (api_link) => {
    request.get(api_link, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          logger.info('API is available.')
        } else {
          logger.error('API is not available. Exiting...')
          console.log(error)
          process.exit(1)
        }
      })
  }

