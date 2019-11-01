const AppError = require('./app-error');

const assert = require('assert');

/** Validate info parameters for function fn.  If errors are
 *  encountered, then throw array of error messages.  Otherwise return
 *  an object built from info, with type conversions performed and
 *  default values plugged in.  Note that any unknown properties in
 *  info are passed unchanged into the returned object.
 */
function validate(fn, info) {
  const errors = [];
  if (info._id !== undefined) {
    const err = 'the _id parameter is reserved for internal use only';
    errors.push(new AppError('RESERVED', err));
  }
  const values = validateLow(fn, info, errors);
  if (errors.length > 0) throw errors;
  return values;
}

module.exports = validate;

const DEFAULT_COUNT = 5;    

function validateLow(fn, info, errors, name='') {
  const values = Object.assign({}, info);
  for (const [k, v] of Object.entries(FN_INFOS[fn])) {
    const validator = TYPE_VALIDATORS[v.type] || validateString;
    const xname = name ? `${name}.${k}` : k;
    const value = info[k];
    const isUndef = (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    );
    const val = 
      (isUndef)
      ? getDefaultValue(xname, v, errors)
     : validator(xname, value, v, errors);
    if (val !== undefined) values[k] = val;
  }
  return values;
}

function getDefaultValue(name, spec, errors) {
  if (spec.default !== undefined) {
    return spec.default;
  }
  else if (spec.isRequired) {
    errors.push(new AppError('MISSING', `missing value for ${name}`));
  }
  return;
}

function validateString(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    const err = `require type String for ${name} value ${value} ` +
		`instead of type ${typeof value}`
    errors.push(new AppError('TYPE', err));
    return;
  }
  else {
    return value;
  }
}

function validateNumber(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    return value;
  case 'string':
    if (value.match(/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/)) {
      return Number(value);
    }
    else {
      const err = `value ${value} for ${name} is not a number`;
      errors.push(new AppError('TYPE', err));
      return;
    }
  default:
    const err = `require type Number or String for ${name} value ${value} ` +
		`instead of type ${typeof value}`
    errors.push(new AppError('TYPE', err));
  }
}

function validateInteger(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    if (Number.isInteger(value)) {
      return value;
    }
    else {
      const err = `value ${value} for ${name} is not an integer`;
      errors.push(new AppError('TYPE', err));
      return;
    }
  case 'string':
    if (value.match(/^[-+]?\d+$/)) {
      return Number(value);
    }
    else {
      const err = `value ${value} for ${name} is not an integer`;
      errors.push(new AppError('TYPE', err));
      return;
    }
  default:
    const err = `require type Number or String for ${name} value ${value} ` +
                `instead of type ${typeof value}`;
    errors.push(new AppError('TYPE', err));
  }
}

function validateRange(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'object') {
    const err = `require type Object for ${name} value ${value} ` +
		`instead of type ${typeof value}`;
    errors.push(new AppError('TYPE', err));
  }
  return validateLow('_range', value, errors, name);
}

const STATUSES = new Set(['ok', 'error', 'outOfRange']);

function validateStatuses(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    const err = `require type String for ${name} value ${value} ` +
		`instead of type ${typeof value}`;
    errors.push(new AppError('TYPE', err));
  }
  if (value === 'all') return STATUSES;
  const statuses = value.split('|');
  const badStatuses = statuses.filter(s => !STATUSES.has(s));
  if (badStatuses.length > 0) {
    const err = `invalid status ${badStatuses} in status ${value}`;
    errors.push(new AppError('TYPE', err));
  }
  return new Set(statuses);
}

const TYPE_VALIDATORS = {
  'integer': validateInteger,
  'number': validateNumber,
  'range': validateRange,
  'statuses': validateStatuses,
};


/** Documents the info properties for different commands.
 *  Each property is documented by an object with the
 *  following properties:
 *     type: the type of the property.  Defaults to string.
 *     default: default value for the property.  If not
 *              specified, then the property is required.
 */
const FN_INFOS = {
  addSensorType: {
    id: { isRequired: true, }, 
    manufacturer: { isRequired: true, }, 
    modelNumber: { isRequired: true, }, 
    quantity: { isRequired: true, }, 
    unit: { isRequired: true, },
    limits: { type: 'range', isRequired: true, },
  },
  addSensor:   {
    id: { isRequired: true, },
    model: { isRequired: true, },
    period: { type: 'integer', isRequired: true, },
    expected: { type: 'range', isRequired: true, },
  },
  addSensorData: {
    sensorId: { isRequired: true, },
    timestamp: { type: 'integer', isRequired: true, },
    value: { type: 'number', isRequired: true, },
  },
  findSensorTypes: {
    id: { default: null },  //if specified, only matching sensorType returned.
    _index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    _count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
  },
  findSensors: {
    id: { default: null }, //if specified, only matching sensor returned.
    _index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    _count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    _doDetail: { //if truthy string, then sensorType property also returned
      default: null, 
    },
    period: { type: 'integer', },
  },
  findSensorData: {
    sensorId: { },
    timestamp: {
      type: 'integer',
      default: Date.now() + 999999999, //some future date
    },
    _count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    statuses: { //ok, error or outOfRange, combined using '|'; returned as Set
      type: 'statuses',
      default: new Set(['ok']),
    },
    _doDetail: {     //if truthy string, then sensor and sensorType properties
      default: null,//also returned
    },
  },
  _range: { //pseudo-command; used internally for validating ranges
    min: { type: 'number' },
    max: { type: 'number' },
  },
};  

