'use strict';

const axios = require('axios');

/** Wrapper which calls sensor web-services at baseUrl.  
 *  Constructed object ws provides 2 services:
 *
 *  ws.list(type, q): Returns web service results for query object q
 *  for type which must be 'sensor-types', 'sensors' or 'sensor-data'.
 *
 *  ws.update(type, obj): Updates web service with object obj
 *  for type which must be 'sensor-types', 'sensors'  or 'sensor-data'.
 *
 * If a web service error occurs and that error is understood, then the
 * error is rethrown with the following fields:
 * 
 *   status: The HTTP status code returned by the web service.
 *
 *   errors: A list of error objects returned by the web service.
 *   Each error object will have a 'code' field giving a succinct
 *   characterization of the error and a 'message' field giving the
 *   details of the error.  Additionally, it may have a 'widget' field
 *   giving the name of the field which was in error.
 *
 * If the error is not understood then it is simply rethrown. 
 */

function SensorsWs(baseUrl) {
  this.baseUrl = baseUrl;
}

module.exports = SensorsWs;


const URLS = {
  'sensor-types': (ws, obj) => `${ws.baseUrl}/sensor-types`,
  'sensors': (ws, obj) => `${ws.baseUrl}/sensors`,
  'sensor-data': (ws, obj) => `${ws.baseUrl}/sensors/${obj.sensorId}`, 
}

SensorsWs.prototype.list = async function(type, q = {}) {
  try {
    const url = URLS[type].call(null, this, q);
    const response = await axios.get(url, { params: q });
    return response.data;
  }
  catch (err) {
    rethrow(err);
  }
};

SensorsWs.prototype.update = async function(type, obj) {
  try {
    const url = URLS[type].call(null, this, obj);
    const response = await axios.post(url, obj);
    return response.data;
  }
  catch (err) {
    rethrow(err);
  }
};

function rethrow(err) {
  if (err.response && err.response.data && err.response.data.errors) {
    throw { status: err.response.status,
	    errors: err.response.data.errors,
	  };
  }
  else {
    throw err;
  }
}
