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
var time = 2000

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

  initServer = () => {
    return new Promise(async (resolve, reject) => { 
        try {
          await processCLIArgs()
          logger.info('Starting demo app initialization.')
          logger.info('NC API is located on ' + api)
          await checkAPIAvailability(api)
          endpoints = await getEndpointList(api)
          flows = await getFlowList(api)
          logger.info('Initialization is complete!')
          resolve()
        } catch (error) {
          logger.error('Error on initialization is thrown!')
          reject(error)
        }
    })
  }

  run = () => {
    return new Promise(async (resolve, reject) => {
      var flow = await selectFlow(flows)
      while(true) {
        logger.info('----------------------------')
        let update = await selectReceiver(flow, endpoints)
        await changeReceiver(api, update, time)
        flow = await updateFlowInfo(api, flow.id)
      }
      resolve()
    })
  }

  var server = app.listen(1337, async () => {
    await initServer()
    await run()
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

  getFlowList = api_link => {
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

  updateFlowInfo = (api_link, flowId) => {
      return new Promise((resolve, reject) => {
        api_link += '/network-flows/' + flowId
        request.get(api_link, function (error, response, body) {
            if (!error && response.statusCode == 200) {
            logger.info('Updating ' + flowId + ' flow info.')
            flow = JSON.parse(body)
            if (!flow) 
                  reject(new Error('No flows available.')) 
              else 
                  resolve(flow)
            } else {
              logger.error('Can\'t get flow.')
              console.log(error)
              reject(error)
            }
          })
      })
  }


  selectFlow = flows => {
    return new Promise((resolve, reject) => {
      logger.info('Selecting flow.')
      let flow = flows[getRandomInt(flows.length)]
      if (flow)
        resolve(flow)
      else 
        reject(new Error('Lacking flow.'))
    })
  }  


  selectReceiver = (flow, endpoints) => {
    return new Promise((resolve, reject) => {
      logger.info('Selecting receiver.')
      let sender = (endpoints.filter(ep =>  ep.id === flow.sender_endpoint_id))[0]
      let removedReceiverID = flow.receiver_endpoint_ids[getRandomInt(flow.receiver_endpoint_ids.length)]
      let receivers = endpoints.filter(ep => (ep.role === 'receiver' || ep.role === 'both') &&
                                               ep.id !== removedReceiverID &&
                                              !flow.receiver_endpoint_ids.includes(ep.id) &&
                                              ep.attached_network_device.chassis_id === sender.attached_network_device.chassis_id)
      let update = {}
      if(receivers.length){
        let addedReceiverID = receivers[getRandomInt(receivers.length)].id
        update.added = addedReceiverID
      }
      update.removed = removedReceiverID
      update.flow = flow.id
      resolve(update)
    })
  }  

  changeReceiver = (api_link, update, time) => {
    return new Promise((resolve, reject) => {
      api_link += '/network-flows/' + update.flow + '/receivers'
      setTimeout(() => {
        if (!update.removed)
          logger.warn('No available receiver to remove. Moving on.')
        else
          request.delete(api_link + '/' + update.removed, function (error, response, body) {
            if (!error && (response.statusCode === 204 || response.statusCode === 200)) {
              logger.info('Removing receiver ' + update.removed)
            } else {
              logger.error('Can\'t remove receiver ' + update.removed + ': ' + error)
            }
          })

        setTimeout(() => {
          if (!update.added)
          {
            logger.warn('No available receiver to add. Moving on.')
            resolve()
          }
          else {
            let postBody = {}
            postBody.receiver_endpoint_ids = []
            postBody.receiver_endpoint_ids.push(update.added)
            request.post({
                headers: {'content-type': 'application/json'},
                url:     api_link,
                json:    postBody
            }, function(error, response, body){
              if (!error && (response.statusCode === 204 || response.statusCode === 200)) {
                logger.info('Adding receiver ' + update.added)
              } else {
                logger.error('Can\'t add receiver ' + update.added + ': ' + error)
              }
              resolve()
            })
          }
        }, time)
      }, time)
    })
  } 

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

