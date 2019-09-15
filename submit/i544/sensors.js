'use strict';

const assert = require('assert');
class Sensors {

    constructor() {
        this.sensorTypeMap = new Map();
        this.sensorsMap = new Map();
        this.sensorDataMap = new Map();
        this.sensorTypeIndex = 0;
        this.sensorIndex = 0;
    }


    /** Clear out all data from this object. */
    async clear() {
        //@TODO
    }

    /** Subject to field validation as per FN_INFOS.addSensorType,
     *  add sensor-type specified by info to this.  Replace any
     *  earlier information for a sensor-type with the same id.
     *
     *  All user errors must be thrown as an array of objects.
     */
    async addSensorType(info) {
        const sensorType = validate('addSensorType', info);
        this.sensorTypeMap.set(sensorType.id, sensorType);
    }

    /** Subject to field validation as per FN_INFOS.addSensor, add
     *  sensor specified by info to this.  Replace any earlier
     *  information for a sensor with the same id.
     *
     *  All user errors must be thrown as an array of objects.
     */
    async addSensor(info) {
        const sensor = validate('addSensor', info);
        this.sensorsMap.set(sensor.id, sensor);
    }

    /** Subject to field validation as per FN_INFOS.addSensorData, add
     *  reading given by info for sensor specified by info.sensorId to
     *  this. Replace any earlier reading having the same timestamp for
     *  the same sensor.
     *
     *  All user errors must be thrown as an array of objects.
     */
    async addSensorData(info) {
        const sensorData = validate('addSensorData', info);
        let range = {};
        let limits = {};
        let status = '';
        if (this.sensorsMap.has(sensorData.sensorId)) {
            if (this.sensorTypeMap.has(this.sensorsMap.get(sensorData.sensorId).model)) {
                range = this.sensorsMap.get(sensorData.sensorId).expected;
                limits = this.sensorTypeMap.get(this.sensorsMap.get(sensorData.sensorId).model).limits;
                status = inRange(sensorData.value, range, limits);
                sensorData.status = status;
            }
        }
        if (!this.sensorDataMap.has(sensorData.sensorId)) {
            this.sensorDataMap.set(sensorData.sensorId, new Array());
            this.sensorDataMap.get(sensorData.sensorId).push(sensorData);
        } else {
            this.sensorDataMap.get(sensorData.sensorId).push(sensorData);
        }
    }

    /** Subject to validation of search-parameters in info as per
     *  FN_INFOS.findSensorTypes, return all sensor-types which
     *  satisfy search specifications in info.  Note that the
     *  search-specs can filter the results by any of the primitive
     *  properties of sensor types.
     *
     *  The returned value should be an object containing a data
     *  property which is a list of sensor-types previously added using
     *  addSensorType().  The list should be sorted in ascending order
     *  by id.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  index property for the next search.  Note that the index (when
     *  set to the lastIndex) and count search-spec parameters can be used
     *  in successive calls to allow scrolling through the collection of
     *  all sensor-types which meet some filter criteria.
     *
     *
     *  All user errors must be thrown as an array of objects.
     */
    async findSensorTypes(info) {
        const searchSpecs = validate('findSensorTypes', info);
        if (searchSpecs.id != null){
            if (this.sensorTypeMap.has(searchSpecs.id)) {
                return this.sensorTypeMap.get(searchSpecs.id);
            } else {
                let error = [];
                let errorMsg = `Sensor Type ID ${searchSpecs.id} not found/invalid`;
                error.push(errorMsg);
                throw error;
            }
        } else {
            let count = searchSpecs.count || DEFAULT_COUNT;
            let result = {};
            let tempArray = Array.from(this.sensorTypeMap.values());

            if (searchSpecs.quantity != null) {
                tempArray = tempArray.filter(sensorType => sensorType.quantity === searchSpecs.quantity);
            }
            if (searchSpecs.manufacturer != null){
                tempArray = tempArray.filter(sensorType => sensorType.manufacturer === searchSpecs.manufacturer);
            }
            if (searchSpecs.modelNumber != null) {
                tempArray = tempArray.filter(sensorType => sensorType.modelNumber === searchSpecs.modelNumber);
            }
            if (searchSpecs.unit != null) {
                tempArray = tempArray.filter(sensorType => sensorType.unit === searchSpecs.unit);
            }

            let tempCount = 0;
            let sensorTypes = [];
            this.sensorTypeIndex = searchSpecs.index || 0;
            for (let i = this.sensorTypeIndex; tempCount < count && i < tempArray.length; i++) {
                sensorTypes.push(tempArray[i]);
                tempCount++;
                this.sensorTypeIndex++;
            }
            sensorTypes.sort(compare);
            result.nextIndex = this.sensorTypeIndex;
            result.data = sensorTypes;
            return result;
        }

    }

    /** Subject to validation of search-parameters in info as per
     *  FN_INFOS.findSensors, return all sensors which
     *  satisfy search specifications in info.  Note that the
     *  search-specs can filter the results by any of the primitive
     *  properties of a sensor.
     *
     *  The returned value should be an object containing a data
     *  property which is a list of all sensors satisfying the
     *  search-spec which were previously added using addSensor().  The
     *  list should be sorted in ascending order by id.
     *
     *  If info specifies a truthy value for a doDetail property,
     *  then each sensor S returned within the data array will have
     *  an additional S.sensorType property giving the complete
     *  sensor-type for that sensor S.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  index property for the next search.  Note that the index (when
     *  set to the lastIndex) and count search-spec parameters can be used
     *  in successive calls to allow scrolling through the collection of
     *  all sensors which meet some filter criteria.
     *
     *  All user errors must be thrown as an array of objects.
     */
    async findSensors(info) {
        const searchSpecs = validate('findSensors', info);
        if (searchSpecs.id != null) {
            if (this.sensorsMap.has(searchSpecs.id)) {
                return this.sensorsMap.get(searchSpecs.id);
            } else {
                let error = [];
                let errorMsg = `Sensor ID ${searchSpecs.id} not found/invalid`;
                error.push(errorMsg);
                throw error;
            }
        } else {
            let count = searchSpecs.count || DEFAULT_COUNT;
            let result = {};
            let tempArray = Array.from(this.sensorsMap.values());

            if (searchSpecs.model != null) {
                tempArray = tempArray.filter(sensorType => sensorType.model === searchSpecs.model);
            }
            if (searchSpecs.period != null) {
                tempArray = tempArray.filter(sensorType => sensorType.period === searchSpecs.period);
            }

            let doDetail = false;
            if (searchSpecs.doDetail != null && searchSpecs.doDetail === "true") {
                doDetail = true;
            }
            let tempCount = 0;
            this.sensorIndex = searchSpecs.index || 0;
            let sensors = [];
            for (let i = this.sensorIndex; tempCount < count && i < tempArray.length; i++) {
                if(doDetail) {
                    let copyTempArr = Object.assign({},tempArray[i]);
                    copyTempArr.sensorType = this.sensorTypeMap.get(tempArray[i].model);
                    tempArray[i] = copyTempArr;
                }
                sensors.push(tempArray[i]);
                tempCount++;
                this.sensorIndex++;
            }
            sensors.sort(compare);
            result.nextIndex = this.sensorIndex;
            result.data = sensors;

            return result;
        }
    }


    /** Subject to validation of search-parameters in info as per
     *  FN_INFOS.findSensorData, return all sensor reading which satisfy
     *  search specifications in info.  Note that info must specify a
     *  sensorId property giving the id of a previously added sensor
     *  whose readings are desired.  The search-specs can filter the
     *  results by specifying one or more statuses (separated by |).
     *
     *  The returned value should be an object containing a data
     *  property which is a list of objects giving readings for the
     *  sensor satisfying the search-specs.  Each object within data
     *  should contain the following properties:
     *
     *     timestamp: an integer giving the timestamp of the reading.
     *     value: a number giving the value of the reading.
     *     status: one of "ok", "error" or "outOfRange".
     *
     *  The data objects should be sorted in reverse chronological
     *  order by timestamp (latest reading first).
     *
     *  If the search-specs specify a timestamp property with value T,
     *  then the first returned reading should be the latest one having
     *  timestamp <= T.
     *
     *  If info specifies a truthy value for a doDetail property,
     *  then the returned object will have additional
     *  an additional sensorType giving the sensor-type information
     *  for the sensor and a sensor property giving the sensor
     *  information for the sensor.
     *
     *  Note that the timestamp and count search-spec parameters can be
     *  used in successive calls to allow scrolling through the
     *  collection of all readings for the specified sensor.
     *
     *  All user errors must be thrown as an array of objects.
     */
    async findSensorData(info) {
        const searchSpecs = validate('findSensorData', info);

        if (searchSpecs.sensorId != null) {
            if (this.sensorDataMap.has(searchSpecs.sensorId)) {
                let count = searchSpecs.count || DEFAULT_COUNT;
                let doDetail = searchSpecs.doDetail || false;
                let sensorData = Array.from(this.sensorDataMap.get(searchSpecs.sensorId));
                let dataToSend = [];
                let result = {};
		if (searchSpecs.statuses != null) {
                    let statuses = searchSpecs.statuses;
                    sensorData = sensorData.filter(sd => statuses.has(sd.status));
                }

                for(let i = 0; i < count; i++){
                    let tempSensorData = Object.assign({}, sensorData[i]);
                    delete tempSensorData.sensorId;
                    dataToSend.push(tempSensorData);
                }
                result.data = dataToSend;
                if(doDetail) {
                    let sensorInfo = this.sensorsMap.get(searchSpecs.sensorId);
                    result.sensorType = this.sensorTypeMap.get(sensorInfo.model);
                    result.sensor = sensorInfo;

                }
                return result;
            } else {
                let error = [];
                let errorMsg = `Sensor-Data ID ${searchSpecs.id} not found/invalid`;
                error.push(errorMsg);
                throw error;
            }
        }
    }
}

module.exports = Sensors;

//@TODO add auxiliary functions as necessary

const DEFAULT_COUNT = 5;

/** Validate info parameters for function fn.  If errors are
 *  encountered, then throw array of error messages.  Otherwise return
 *  an object built from info, with type conversions performed and
 *  default values plugged in.  Note that any unknown properties in
 *  info are passed unchanged into the returned object.
 */
function validate(fn, info) {
    const errors = [];
    const values = validateLow(fn, info, errors);
    if (errors.length > 0) throw errors;
    return values;
}

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
        values[k] =
            (isUndef)
                ? getDefaultValue(xname, v, errors)
                : validator(xname, value, v, errors);
    }
    return values;
}

function getDefaultValue(name, spec, errors) {
    if (spec.default !== undefined) {
        return spec.default;
    }
    else {
        errors.push(`missing value for ${name}`);
        return;
    }
}

function validateString(name, value, spec, errors) {
    assert(value !== undefined && value !== null && value !== '');
    if (typeof value !== 'string') {
        errors.push(`require type String for ${name} value ${value} ` +
            `instead of type ${typeof value}`);
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
                errors.push(`value ${value} for ${name} is not a number`);
                return;
            }
        default:
            errors.push(`require type Number or String for ${name} value ${value} ` +
                `instead of type ${typeof value}`);
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
                errors.push(`value ${value} for ${name} is not an integer`);
                return;
            }
        case 'string':
            if (value.match(/^[-+]?\d+$/)) {
                return Number(value);
            }
            else {
                errors.push(`value ${value} for ${name} is not an integer`);
                return;
            }
        default:
            errors.push(`require type Number or String for ${name} value ${value} ` +
                `instead of type ${typeof value}`);
    }
}

function validateRange(name, value, spec, errors) {
    assert(value !== undefined && value !== null && value !== '');
    if (typeof value !== 'object') {
        errors.push(`require type Object for ${name} value ${value} ` +
            `instead of type ${typeof value}`);
    }
    return validateLow('_range', value, errors, name);
}

const STATUSES = new Set(['ok', 'error', 'outOfRange']);

function validateStatuses(name, value, spec, errors) {
    assert(value !== undefined && value !== null && value !== '');
    if (typeof value !== 'string') {
        errors.push(`require type String for ${name} value ${value} ` +
            `instead of type ${typeof value}`);
    }
    if (value === 'all') return STATUSES;
    const statuses = value.split('|');
    const badStatuses = statuses.filter(s => !STATUSES.has(s));
    if (badStatuses.length > 0) {
        errors.push(`invalid status ${badStatuses} in status ${value}`);
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
        id: { },
        manufacturer: { },
        modelNumber: { },
        quantity: { },
        unit: { },
        limits: { type: 'range', },
    },
    addSensor:   {
        id: { },
        model: { },
        period: { type: 'integer' },
        expected: { type: 'range' },
    },
    addSensorData: {
        sensorId: { },
        timestamp: { type: 'integer' },
        value: { type: 'number' },
    },
    findSensorTypes: {
        id: { default: null },  //if specified, only matching sensorType returned.
        index: {  //starting index of first result in underlying collection
            type: 'integer',
            default: 0,
        },
        count: {  //max # of results
            type: 'integer',
            default: DEFAULT_COUNT,
        },
    },
    findSensors: {
        id: { default: null }, //if specified, only matching sensor returned.
        index: {  //starting index of first result in underlying collection
            type: 'integer',
            default: 0,
        },
        count: {  //max # of results
            type: 'integer',
            default: DEFAULT_COUNT,
        },
        doDetail: { //if truthy string, then sensorType property also returned
            default: null,
        },
    },
    findSensorData: {
        sensorId: { },
        timestamp: {
            type: 'integer',
            default: Date.now() + 999999999, //some future date
        },
        count: {  //max # of results
            type: 'integer',
            default: DEFAULT_COUNT,
        },
        statuses: { //ok, error or outOfRange, combined using '|'; returned as Set
            type: 'statuses',
            default: new Set(['ok']),
        },
        doDetail: {     //if truthy string, then sensor and sensorType properties
            default: null,//also returned
        },
    },
    _range: { //pseudo-command; used internally for validating ranges
        min: { type: 'number' },
        max: { type: 'number' },
    },
};

function compare(a, b) {
    const idA = a.id.toUpperCase();
    const idB = b.id.toUpperCase();

    let comparison = 0;
    if (idA > idB) {
        comparison = 1;
    } else if (idA < idB) {
        comparison = -1;
    }
    return comparison;
}

function inRange(value, range, limits) {
    if (value <= limits.min || value >= limits.max) {
        return "error";
    }
    if (value >= range.min && value <= range.max) {
        return "ok";
    } else {
        return "outOfRange"
    }
}
