#!/usr/bin/env nodejs

'use strict';

const assert = require('assert');
const Path = require('path');
const process = require('process');
const { promisify } = require('util');
const readFile = promisify(require('fs').readFile);
const writeFile = promisify(require('fs').writeFile);

const sensorServices = require('./sensors-ws');
const newSensors = require('./sensors');

const USAGE = `usage: ${Path.basename(process.argv[1])} PORT MONGO_DB_URL ` +
  '[ SENSOR_TYPES_JSON SENSORS_JSON SENSOR_DATA_JSON ]';

function usage() {
  console.error(USAGE);
  process.exit(1);
}

function getPort(portArg) {
  let port = Number(portArg);
  if (!port) usage();
  return port;
}

async function readJson(path) {
  const str = await readFile(path, 'utf8');
  return JSON.parse(str);
}

async function loadJsonFiles(sensors, jsonPaths) {
  await sensors.clear();
  const fns =
	[ sensors.addSensorType, sensors.addSensor, sensors.addSensorData ];
  assert(jsonPaths.length === fns.length);
  const errors = [];
  for (let i = 0; i < fns.length; i++) {
    const [fn, path] = [fns[i], jsonPaths[i]];
    const data = await readJson(path);
    let recN = 1;
    for (const datum of data) {
      try {
	await fn.call(sensors, datum);
      }
      catch (err) {
	const msgHdr = `${Path.basename(path)}: record: ${recN}: `;
	if (typeof err === 'object' && err instanceof Array) {
	  err.forEach(e => errors.push(`${msgHdr}${e}`));
	}
	else {
	  throw err;
	}
      }
      recN++;
    }
  } //for (let i = 0; i < fns.length; i++)
  if (errors.length > 0) {
    throw errors;
  }
}

async function go(args) {
  try {
    const port = getPort(args[0]);
    const sensors = await newSensors(args[1]);
    if (args.length > 2) await loadJsonFiles(sensors, args.slice(2));
    sensorServices.serve(port, sensors);
  }
  catch (err) {
    //hopefully we should never get here.
    console.error(err);
  }
}
    

if (process.argv.length != 4 && process.argv.length != 7) usage();
go(process.argv.slice(2));
