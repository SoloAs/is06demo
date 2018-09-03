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


// TODO: handle promise rejection

var api = "http://127.0.0.1:8081/x-nmos/netctrl/v1.0"
var endpoints = []
var flows = []

processCLIArgs = async () => {
    process.argv.forEach((val, index, array) => {
      if (index > 1) {
        let argument = val.split('=')
        argument[0] = argument[0].replace('--', '').toLowerCase()
        if (argument[0].includes('networkcontroller') || argument[0].includes('nc')) api = argument[1]
        if (api[api.length-1] !== '/') api += '/'
        api += 'x-nmos/netctrl/v1.0'
      }
    })
  }

  initServer = async () => {
    try {
      await processCLIArgs()
      logger.info('Starting demo app initialization.')
      logger.info('NC API is located on ' + api)
      await checkAPIAvailability(api)
      endpoints = await getEndpointList(api)
      console.log(endpoints)
      flows = await getFlowList(api)
      console.log(flows)
      
      
      logger.info('Initialization is complete!')
    } catch (error) {
      logger.error('Error on initialization is thrown!')
      throw error
    }
  }

  var server = app.listen(1337, () => {
    initServer()

  })



  checkAPIAvailability = (api_link) => {
      return new Promise((resolve, reject) => {
        request.get(api_link, function (error, response, body) {
            if (!error && response.statusCode == 200) {
              logger.info('API is available.')
              resolve()
            } else {
              logger.error('API is not available. Exiting...')
              reject(error)
              process.exit(1)
            }
          })
      })
  }

  getEndpointList = (api_link) => {
      return new Promise((resolve, reject) => {
        api_link += '/endpoints'
        var endpoints = []
        request.get(api_link, function (error, response, body) {
            if (!error && response.statusCode == 200) {
            logger.info('Obtaining endpoints.')
            endpoints = JSON.parse(body)
            if (endpoints.length === 0) 
                reject(new Error('No Endpoints available.')) 
            else 
                resolve(endpoints)
            } else {
            logger.error('Can\'t get endpoints.')
            console.log(error)
            reject(error)
            process.exit(1)
            }
        })
    })
  }

  getFlowList = (api_link) => {
    return new Promise((resolve, reject) => {
      api_link += '/network-flows'
      var flows = []
      request.get(api_link, function (error, response, body) {
          if (!error && response.statusCode == 200) {
          logger.info('Obtaining flows.')
          flows = JSON.parse(body)
          if (flows.length === 0) 
                reject(new Error('No flows available.')) 
            else 
                resolve(flows)
          } else {
            logger.error('Can\'t get flows.')
            console.log(error)
            reject(error)
            process.exit(1)
          }
        })
    })
  }


  selectReceiver = (flows, endpoints) => {
    return new Promise((resolve, reject) => {
      let flow = flows[getRandomInt(flow.length)]
      let sender = endpoints.filter(ep => ep.id === flows.sender_endpoint_id)[0]
      let removedReceiverID = flow.receiver_endpoints_ids[getRandomInt(flow.receiver_endpoint_ids.length)]
      let receivers = endpoints.filter(ep => (ep.role === 'receiver' || ep.role === 'both') &&
                                              ep.id !== removedReceiverID &&
                                              ep.attached_network_device.chassis_id === sender.attached_network_device.chassis_id)
      let addedReceiverID = receivers[getRandomInt(receivers.length)].id 
      let update = {}
      update.removed = removedReceiverID
      updated.added = addedReceiverID
      resolve(update)
    })
  }  

  changeReceiver = (api_link) => {
    return new Promise((resolve, reject) => {
      api_link += '/endpoints'
      
    })
  } 

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

