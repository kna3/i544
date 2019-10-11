'use strict';

const AppError = require('./app-error');
const validate = require('./validate');

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

class Sensors {


    /** Return a new instance of this class with database as
     *  per mongoDbUrl.  Note that mongoDbUrl is expected to
     *  be of the form mongodb://HOST:PORT/DB.
     */
    static async newSensors(mongoDbUrl) {
        const client = await mongo.connect(mongoDbUrl, MONGO_OPTIONS);
        const dbName =  mongoDbUrl.substring(mongoDbUrl.lastIndexOf("/") + 1);
        const db = client.db(dbName);
        return new Sensors(client,db);
    }

    constructor(client, db) {
        this.client = client;
        this.db = db;
        this.senorTypeCol = this.db.collection("sensorType");
        this.sensorCol = this.db.collection("sensor");
        this.sensorDataCol = this.db.collection("sensorData");

        /*this.sensorTypeMap = new Map();
        this.sensorsMap = new Map();
        this.sensorDataMap = new Map();*/

    }

    /** Release all resources held by this Sensors instance.
     *  Specifically, close any database connections.
     */
    async close() {
        this.client.close();
    }

    /** Clear database */
    async clear() {

    }

    /** Subject to field validation as per validate('addSensorType',
     *  info), add sensor-type specified by info to this.  Replace any
     *  earlier information for a sensor-type with the same id.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensorType(info) {
        const sensorType = validate('addSensorType', info);
        await this.senorTypeCol.updateOne({_id: sensorType.id}, {$set: {data: sensorType}}, {upsert: true});
    }

    /** Subject to field validation as per validate('addSensor', info)
     *  add sensor specified by info to this.  Note that info.model must
     *  specify the id of an existing sensor-type.  Replace any earlier
     *  information for a sensor with the same id.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensor(info) {
        const sensor = validate('addSensor', info);
        await this.sensorCol.updateOne({_id: sensor.id}, {$set: {data: sensor}}, {upsert: true});
    }

    /** Subject to field validation as per validate('addSensorData',
     *  info), add reading given by info for sensor specified by
     *  info.sensorId to this. Note that info.sensorId must specify the
     *  id of an existing sensor.  Replace any earlier reading having
     *  the same timestamp for the same sensor.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async addSensorData(info) {
        const sensorData = validate('addSensorData', info);
        await this.sensorDataCol.updateOne({_id: sensorData.sensorId}, {$set: {data: sensorData}}, {upsert: true});
        //@TODO
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensorTypes', info), return all sensor-types which
     *  satisfy search specifications in info.  Note that the
     *  search-specs can filter the results by any of the primitive
     *  properties of sensor types (except for meta-properties starting
     *  with '_').
     *
     *  The returned value should be an object containing a data
     *  property which is a list of sensor-types previously added using
     *  addSensorType().  The list should be sorted in ascending order
     *  by id.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  _index meta-property for the next search.  Note that the _index
     *  (when set to the lastIndex) and _count search-spec
     *  meta-parameters can be used in successive calls to allow
     *  scrolling through the collection of all sensor-types which meet
     *  some filter criteria.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensorTypes(info) {
        //@TODO
        const searchSpecs = validate('findSensorTypes', info);
        return { data: [], nextIndex: -1 };
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensors', info), return all sensors which satisfy
     *  search specifications in info.  Note that the search-specs can
     *  filter the results by any of the primitive properties of a
     *  sensor (except for meta-properties starting with '_').
     *
     *  The returned value should be an object containing a data
     *  property which is a list of all sensors satisfying the
     *  search-spec which were previously added using addSensor().  The
     *  list should be sorted in ascending order by id.
     *
     *  If info specifies a truthy value for a _doDetail meta-property,
     *  then each sensor S returned within the data array will have an
     *  additional S.sensorType property giving the complete sensor-type
     *  for that sensor S.
     *
     *  The returned object will contain a lastIndex property.  If its
     *  value is non-negative, then that value can be specified as the
     *  _index meta-property for the next search.  Note that the _index (when
     *  set to the lastIndex) and _count search-spec meta-parameters can be used
     *  in successive calls to allow scrolling through the collection of
     *  all sensors which meet some filter criteria.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensors(info) {
        //@TODO
        const searchSpecs = validate('findSensors', info);
        return { data: [], nextIndex: -1 };
    }

    /** Subject to validation of search-parameters in info as per
     *  validate('findSensorData', info), return all sensor readings
     *  which satisfy search specifications in info.  Note that info
     *  must specify a sensorId property giving the id of a previously
     *  added sensor whose readings are desired.  The search-specs can
     *  filter the results by specifying one or more statuses (separated
     *  by |).
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
     *  Note that the timestamp search-spec parameter and _count
     *  search-spec meta-parameters can be used in successive calls to
     *  allow scrolling through the collection of all readings for the
     *  specified sensor.
     *
     *  All user errors must be thrown as an array of AppError's.
     */
    async findSensorData(info) {
        //@TODO
        const searchSpecs = validate('findSensorData', info);
        return { data: [], };
    }



} //class Sensors

module.exports = Sensors.newSensors;

//Options for creating a mongo client
const MONGO_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};


function inRange(value, range) {
    return Number(range.min) <= value && value <= Number(range.max);
}
