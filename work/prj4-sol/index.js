#!/usr/bin/env nodejs

'use strict';

const assert = require('assert');
const process = require('process');
const Path = require('path');

const SensorsWs = require('./sensors-ws');
const sensors = require('./sensors.js');

function usage() {
  console.error(`usage: ${Path.basename(process.argv[1])} ` +
		`PORT SENSORS_WS_BASE_URL`);
  process.exit(1);
}

function getPort(portArg) {
  let port = Number(portArg);
  if (!port) usage();
  return port;
}

async function go(args) {
  try {
    const port = getPort(args[0]);
    const wsBaseUrl = args[1];
    const sensorsWs = new SensorsWs(wsBaseUrl);
    sensors(port, sensorsWs);
  }
  catch (err) {
    console.error(err);
  }
}
    

if (process.argv.length != 4) usage();
go(process.argv.slice(2));
