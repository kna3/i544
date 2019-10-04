#!/usr/bin/env nodejs

'use strict';

const assert = require('assert');
const fs = require('fs');
const Path = require('path');
const readline = require('readline');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const Sensors = require('./sensors');

/** Top level routine */
async function go(args) {
  assert(args.length === 1 || args.length === 4);
  const dataDir = args[0];
  const sensors = new Sensors();
  if (args.length == 4) {
    const [_, sensorTypesFile, sensorsFile, sensorDataFile] = args;
    try {
      await loadHandler(dataDir, sensors,
			[CMD_ARGS.SENSOR_TYPE, sensorTypesFile]);
      await loadHandler(dataDir, sensors, [CMD_ARGS.SENSOR, sensorsFile]);
      await loadHandler(dataDir, sensors,
			[CMD_ARGS.SENSOR_DATA, sensorDataFile]);
    }
    catch (err) {
      handleErrors(err);
    }
  }
  help();
  await interact(dataDir, sensors);
}

const PROMPT = '>> ';

async function interact(dataDir, sensors) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
    prompt: PROMPT,
  });
  rl.prompt();
  rl.on('line', async (line) => await doLine(dataDir, sensors, line, rl));
}

async function doLine(dataDir, sensors, line, rl) {
  line = line.trim();
  const args = line.split(/\s+/);
  if (line.length > 0 && args.length > 0) {
    try {
      const cmd = args[0];
      const cmdInfo = COMMANDS[args[0]];
      if (!cmdInfo) {
	console.error(`invalid command "${cmd}"`);
	help(sensors);
      }
      else {
	const result = await cmdInfo.handler(dataDir, sensors, args.slice(1));
	if (result && (result.length > 0 || Object.keys(result).length > 0)) {
	  console.log(JSON.stringify(result, null, 2));
	}
      }
    }
    catch (err) {
      handleErrors(err);
    }
  }
  rl.prompt();
}


const CMD_ARGS = {
  SENSOR_TYPE: 'sensor-type',
  SENSOR: 'sensor',
  SENSOR_DATA: 'sensor-data',
};

const CMD_ARGS_VALUES = Object.values(CMD_ARGS);
const CMD_ARGS_STRING = CMD_ARGS_VALUES.join('|');

function getCmdArg(arg = 'undefined') {
  const type = CMD_ARGS_VALUES.indexOf(arg) >= 0 && arg;
  if (!type) {
    throw(`bad first arg "${arg}": must be one of ${CMD_ARGS_VALUES}`);
  }
  return type;
}

const ADD_FNS = {
  [CMD_ARGS.SENSOR_TYPE]: (sensors) => sensors.addSensorType,
  [CMD_ARGS.SENSOR]: (sensors) => sensors.addSensor,
  [CMD_ARGS.SENSOR_DATA]: (sensors) => sensors.addSensorData,
};

/** handler for add command */
async function addHandler(_dataDir, sensors, args) {
  const cmdArg = getCmdArg(args[0]);
  const fn = ADD_FNS[cmdArg](sensors);
  await fn.call(sensors, getNameValues(args.slice(1)));
}


/** handler for clear command */
function clearHandler(_dataDir, sensors, args=[]) {
  if (args.length > 0) {
    console.error('sorry; clear does not accept any arguments');
  }
  else {
    sensors.clear();
  }
  return {}
}

const FIND_FNS = {
  [CMD_ARGS.SENSOR_TYPE]: (sensors) => sensors.findSensorTypes,
  [CMD_ARGS.SENSOR]: (sensors) => sensors.findSensors,
  [CMD_ARGS.SENSOR_DATA]: (sensors) => sensors.findSensorData,
};

/** handler for find command */
async function findHandler(_dataDir, sensors, args) {
  const cmdArg = getCmdArg(args[0]);
  const fn = FIND_FNS[cmdArg](sensors);
  return await fn.call(sensors, getNameValues(args.slice(1)));
}

/** handler for help command */
function help(_dataDir, _sensors=null, args=[]) {
  if (args.length > 0) {
    console.error('sorry; help does not accept any arguments');
  }
  Object.entries(COMMANDS).
    forEach(([k, v]) => {
      console.error(`${k.padEnd(CMD_WIDTH)}${v.msg}`);
    });
  return {}
}

/** handler for load command */
async function loadHandler(dataDir, sensors, args) {
  if (args.length != 2) {
    console.error(`load requires arg ${CMD_ARGS_STRING} and JSON file name`);
    return help();
  }
  const cmdArg = getCmdArg(args[0]);
  const path = args[1];
  const data = await readJson(dataDir, path);
  const fn = ADD_FNS[cmdArg](sensors);
  let recN = 1;
  const errors = [];
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
	console.log(err);
      }
    }
    recN++;
  }
  if (errors.length > 0) {
    throw errors;
  }
  return {};
}

const CMD_WIDTH = 6;

/** command dispatch table and command help messages */
const COMMANDS = { 
  add: {
    msg: `${CMD_ARGS_STRING} NAME=VALUE...`,
    handler: addHandler,
  },
  clear: {
    msg: 'clear all sensor data',
    handler: clearHandler,
  },
  find: {
    msg: `${CMD_ARGS_STRING} NAME=VALUE...`,
    handler: findHandler,
  },
  help: {
    msg: 'output this message',
    handler: help,
  },  
  load: {
    msg: `${CMD_ARGS_STRING} JSON_FILE`,
    handler: loadHandler,
  },
};


async function readJson(dataDir, dataFile) {
  try {
    const text = await readFile(Path.join(dataDir, dataFile), 'utf8');
    return JSON.parse(text);
  }
  catch (err) {
    throw [ `cannot read ${dataFile} in ${dataDir}: ${err}` ];
  }
}

function getNameValues(defArgs) {
  const nameValues = {};
  for (const def of defArgs) {
    const splits = def.trim().split('=');
    if (splits.length != 2) {
      throw `bad NAME=VALUE argument '${def}'`;
    }
    const [name, value] = splits;
    const fields = name.split('.');
    let p = nameValues;
    for (let i = 0; i < fields.length - 1; i++) {
      const f = fields[i];
      p[f] = p[f] || {};
      p = p[f];
    }
    p[fields.slice(-1)[0]] = value;
  }
  return nameValues;
}

function handleErrors(err) {
  if (typeof err === 'object' && err instanceof Array) {
    for (const e of err) { console.error(e); }
  }
  else {
    console.error(err);
  }
}

//top-level code
if (process.argv.length != 3 && process.argv.length != 6) {
  console.error('usage: %s DATA_DIR ' +
		'[SENSOR_TYPES_JSON SENSORS_JSON SENSOR_DATA_JSON]',
		Path.basename(process.argv[1]));
  process.exit(1);
}


(async () => await go(process.argv.slice(2)))();

