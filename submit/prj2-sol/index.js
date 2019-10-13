#!/usr/bin/env nodejs

'use strict';

const assert = require('assert');
const fs = require('fs');
const Path = require('path');
const readline = require('readline');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const newSensors = require('./sensors');

/** Top level routine */
async function go(args) {
  assert(args.length >= 1);
  let sensors;
  try {
    const cmd = Command.newCommand(args.slice(1));
    if (!cmd) {
      usage();
    }
    else {
      sensors = await newSensors(args[0]);
      await cmd.run(sensors);
    }
  }
  catch (err) {
    handleErrors(err);
  }
  finally {
    if (sensors) sensors.close();
  }
}

class Command {
  constructor(handler, args) {
    this.handler = handler; this.args = args;
  }

  static newCommand(args) {
    const spec = COMMANDS[args[0]];
    if (!spec) {
      console.error(`bad command '${args[0]}'`); usage();
    }
    return new Command(spec.handler, args.splice(1));
  }

  async run(sensors) {
    await this.handler(sensors, this.args);
  }
  
}

async function addHandler(sensors, args) {
  const cmdArg = getCmdArg(args[0]);
  const nameValues = getNameValues(args.slice(1));
  const fn = ADD_FNS[cmdArg](sensors);
  await fn.call(sensors, nameValues);
}

async function findHandler(sensors, args) {
  const cmdArg = getCmdArg(args[0]);
  const nameValues = getNameValues(args.slice(1));
  const fn = FIND_FNS[cmdArg](sensors);
  const results = await fn.call(sensors, nameValues);
  console.log(JSON.stringify(results, null, 2));
}


/** handler for clear command */
async function clearHandler(sensors, args=[]) {
  if (args.length > 0) {
    console.error('sorry; clear does not accept any arguments');
  }
  else {
    await sensors.clear();
  }
}

/** handler for help command */
function helpHandler(sensors, args=[]) {
  if (args.length > 0) {
    console.error('sorry; help does not accept any arguments');
  }
  usage();
}


/** handler for load command */
async function loadHandler(sensors, args) {
  if (args.length < 2) {
    console.error(`load requires arg ${CMD_ARGS_STRING} and JSON file name`);
    usage();
  }
  const cmdArg = getCmdArg(args[0]);
  const errors = [];
  const fn = ADD_FNS[cmdArg](sensors);
  for (const path of args.slice(1)) {
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
	  console.log(err);
	}
      }
      recN++;
    }
    if (errors.length > 0) {
      throw errors;
    }
  } //for (const path of args.slice(1))
}


const CMD_ARGS = {
  SENSOR_TYPE: 'sensor-type',
  SENSOR: 'sensor',
  SENSOR_DATA: 'sensor-data',
};

const CMD_ARGS_VALUES = Object.values(CMD_ARGS);
const CMD_ARGS_STRING = CMD_ARGS_VALUES.join('|');

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
    msg: `${CMD_ARGS_STRING} [NAME=VALUE...]`,
    handler: findHandler,
  },
  help: {
    msg: 'output this message',
    handler: helpHandler,
  },  
  load: {
    msg: `${CMD_ARGS_STRING} JSON_FILE...`,
    handler: loadHandler,
  },
};

function getCmdArg(arg = 'missing arg') {
  const type = CMD_ARGS_VALUES.indexOf(arg) >= 0 && arg;
  if (!type) {
    throw([`${arg}: must be one of ${CMD_ARGS_VALUES}`]);
  }
  return type;
}


const ADD_FNS = {
  [CMD_ARGS.SENSOR_TYPE]: (sensors) => sensors.addSensorType,
  [CMD_ARGS.SENSOR]: (sensors) => sensors.addSensor,
  [CMD_ARGS.SENSOR_DATA]: (sensors) => sensors.addSensorData,
};


const FIND_FNS = {
  [CMD_ARGS.SENSOR_TYPE]: (sensors) => sensors.findSensorTypes,
  [CMD_ARGS.SENSOR]: (sensors) => sensors.findSensors,
  [CMD_ARGS.SENSOR_DATA]: (sensors) => sensors.findSensorData,
};

  

async function readJson(dataPath) {
  try {
    const text = await readFile(dataPath, 'utf8');
    return JSON.parse(text);
  }
  catch (err) {
    throw [ `cannot read ${dataPath}: ${err}` ];
  }
}

function getNameValues(defArgs) {
  const nameValues = {};
  for (const def of defArgs) {
    const splits = def.trim().split('=');
    if (splits.length != 2) {
      throw [`bad NAME=VALUE argument '${def}'`];
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
    for (const e of err) { console.error(e.toString()); }
  }
  else {
    console.error(err);
  }
}

/** output usage message */
function usage() {
  let msg =
    `usage: ${Path.basename(process.argv[1])} MONGO_DB_URL CMD [ARGS...]\n`;
  msg += 'Command CMD can be\n';
  Object.entries(COMMANDS).
    forEach(([k, v]) => {
      msg += `${k.padEnd(CMD_WIDTH)}${v.msg}\n`;
    });
  console.error(msg);
  process.exit(1);
}

//top-level code
if (process.argv.length < 4) {
  usage();
}


(async () => await go(process.argv.slice(2)))();

