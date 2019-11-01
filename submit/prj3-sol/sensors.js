const AppError = require('./app-error');
const validate = require('./validate');

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

class Sensors {

  constructor(client, db) {
    this.client = client;
    this.db = client.db(db);
    for (const k of COLLECTIONS) {
      this[k] = this.db.collection(k);
    }
  }

  /** Return a new instance of this class with database as
   *  per mongoDbUrl.  Note that mongoDbUrl is expected to
   *  be of the form mongodb://HOST:PORT/DB.
   */
  static async newSensors(mongoDbUrl) {
    const splits = mongoDbUrl.split('://');
    const dbIndex = mongoDbUrl.lastIndexOf('/');
    if (dbIndex < 0 || splits.length !== 2 || splits[0] !== 'mongodb') {
      const msg = `bad mongodb url '${mongoDbUrl}'`;
      throw [ new AppError('BAD_MONGO_URL', msg) ];
    }
    const url = mongoDbUrl.slice(0, dbIndex);
    const db = mongoDbUrl.slice(dbIndex + 1);
    const client = await mongo.connect(url, MONGO_OPTIONS);
    return new Sensors(client, db);    
  }

  /** Release all resources held by this Sensors instance.
   *  Specifically, close any database connections.
   */
  async close() {
    await this.client.close();
  }

  /** Clear database */
  async clear() {
    for (const k of COLLECTIONS) {
      await this[k].deleteMany({});
    }
  }

  /** Subject to field validation as per validate('addSensorType',
   *  info), add sensor-type specified by info to this.  Replace any
   *  earlier information for a sensor-type with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorType(info) {
    const sensorType = validate('addSensorType', info);
    await this._add(this.sensorTypes, sensorType);
  }
  
  /** Subject to field validation as per validate('addSensor', info)
   *  add sensor specified by info to this.  Note that info.model must
   *  specify the id of an existing sensor-type.  Replace any earlier
   *  information for a sensor with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensor(info) {
    const sensor = validate('addSensor', info);
    const model = sensor.model;
    assert(model !== undefined);
    const sensorType = (await this._get(this.sensorTypes, { id: model }))[0];
    if (sensorType === undefined) {
      throw [ new AppError('X_ID', `unknown sensor type "${model}"`) ];
    }
    await this._add(this.sensors, sensor);
  }

  /** Subject to field validation as per validate('addSensorData',
   *  info), add reading given by info for sensor specified by
   *  info.sensorId to this. Note that info.sensorId must specify the
   *  id of an existing sensor.  Replace any earlier reading having
   *  the same timestamp for the same sensor.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorData(info) {
    const sensorData = validate('addSensorData', info);
    const { sensorId, timestamp } = sensorData;
    assert(sensorId !== undefined);
    const sensor = (await this._get(this.sensors, { id: sensorId }))[0];
    if (sensor === undefined) {
      throw [ new AppError('X_ID', `unknown sensor "${sensorId}"`) ];
    }
    const collection = this.sensorData;
    let doUpdateTimestamps = false;
    let sensorTimestamps = (await this._get(collection, { id: sensorId }))[0];
    if (sensorTimestamps === undefined) {
      sensorTimestamps = {
	id: sensorId,
	earliest: timestamp,
	latest: timestamp,
      };
      doUpdateTimestamps = true;
    }
    else {
      const diffTime = (timestamp - sensorTimestamps.earliest);
      if (diffTime % sensor.period !== 0) {
	throw [ new AppError('BAD_TIMESTAMP', 'incorrect period for sensor') ];
      }
    }
    const id = sensorDataId(sensorId, timestamp);
    await this._add(collection, Object.assign( { id }, sensorData));
    let didUpdate = false;
    if (timestamp < sensorTimestamps.earliest) {
      sensorTimestamps.earliest = timestamp;
      doUpdateTimestamps = true;
    }
    if (timestamp > sensorTimestamps.latest) {
      sensorTimestamps.latest = timestamp;
      doUpdateTimestamps = true;
    }
    if (doUpdateTimestamps) {
      await this._add(collection, sensorTimestamps);
    }
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
   *  The returned object will contain a nextIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property to get subsequent results for the same query.
   *
   *  The returned object will contain a previousIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property to get previous  results for the same query.
   *
   *  Note that the _index (when set to nextIndex or previousIndex)
   *  along with the _count search-spec meta-parameters can be used in
   *  successive calls to allow scrolling back-and-forth in the
   *  collection of all sensor-types which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorTypes(info={}) {
    const searchSpecs = validate('findSensorTypes', info);
    const data = await this._get(this.sensorTypes, searchSpecs);
    if (info.id !== undefined && data.length === 0) {
      throw [ new AppError('NOT_FOUND',
			   `no results for sensor-type id '${info.id}'`) ];
    }
    return { data,
	     nextIndex: nextIndex(searchSpecs, data),
	     previousIndex: previousIndex(searchSpecs, data),
	   };
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
   *  The returned object will contain a nextIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property to get subsequent results for the same query.
   *
   *  The returned object will contain a previousIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property to get previous  results for the same query.
   *
   *  Note that the _index (when set to nextIndex or previousIndex)
   *  along with the _count search-spec meta-parameters can be used in
   *  successive calls to allow scrolling back-and-forth in the
   *  collection of all sensor-types which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensors(info={}) {
    const searchSpecs = validate('findSensors', info);
    const sensors = await this._get(this.sensors, searchSpecs);
    if (info.id !== undefined && sensors.length === 0) {
      throw [ new AppError('NOT_FOUND',
			   `no results for sensor id '${info.id}'`) ];
    }
    if (searchSpecs._doDetail) {
      for (const sensor of sensors) {
	const sensorTypes =
	  await this._get(this.sensorTypes, { id: sensor.model });
	assert(sensorTypes.length === 1);
	sensor.sensorType = sensorTypes[0];
      }
    }
    return { data: sensors,
	     nextIndex: nextIndex(searchSpecs, sensors),
	     previousIndex: previousIndex(searchSpecs, sensors),
	   };
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
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorData(info={}) {
    const searchSpecs = validate('findSensorData', info);
    const { sensorId, timestamp, statuses } = searchSpecs;
    const count = searchSpecs._count;
    const sensor = (await this._get(this.sensors, { id: sensorId }))[0];
    if (!sensor) {
      throw [ new AppError('X_ID', `unknown sensor id "${sensorId}"`) ];
    }
    const sensorType =
      (await this._get(this.sensorTypes, {id: sensor.model}))[0];
    assert(sensorType);
    const sensorTimestamps =
      (await this._get(this.sensorData, { id: sensorId }))[0];
    if (!sensorTimestamps) {
      const err = `no sensor data for sensor "${sensorId}"`;
      throw [ new AppError('NOT_FOUND', err) ];
    }
    const [period, latest] = [Number(sensor.period), sensorTimestamps.latest];
    const startTime =
	  (timestamp > latest)
	  ? latest
	  : latest - Math.ceil((latest - timestamp)/period)*period;
    const data = [];
    for (let t = startTime;
	 t >= sensorTimestamps.earliest && data.length < count;
	 t = t - period) {
      const id = sensorDataId(sensorId, t);
      const v = (await this._get(this.sensorData, { id }))[0];
      if (v === undefined) continue;
      const status =
	  !inRange(v.value, sensorType.limits) ? 'error'
	: !inRange(v.value, sensor.expected) ? 'outOfRange' : 'ok';
      if (statuses.has(status)) {
	data.push({
	  timestamp: t,
	  value: v.value,
	  status,
	});
      }
    }
    const ret = { data };
    if (searchSpecs._doDetail) {
      ret.sensorType = sensorType; ret.sensor = sensor;
    }
    return ret;
  }

  async _add(collection, info) {
    const mongoInfo = toMongoInfo(info);
    assert(mongoInfo._id !== undefined);
    const opts = { upsert: true };
    const filter = {_id: mongoInfo._id};
    await collection.replaceOne(filter, mongoInfo, opts);
  }

  /** Return array of objects from collection which match mongoInfo */
  async _get(collection, searchSpecs) {
    const mongoInfo = toMongoInfo(searchSpecs);
    let cursor;
    if (mongoInfo._id !== undefined) {
      cursor = await collection.find({_id: mongoInfo._id});
    }
    else {
      const [ count, index ] = [ mongoInfo._count, mongoInfo._index ];
      assert(index !== undefined);
      assert(count !== undefined);
      const query = Object.assign({}, mongoInfo);
      for (const k of Object.keys(mongoInfo)) {
	if (k.startsWith('_') && k !== '_id') delete query[k];
      }
      cursor = collection.find(query).sort({_id: 1}).skip(index).limit(count);
    }
    const mongoInfos = await cursor.toArray();
    return mongoInfos.map(e => fromMongoInfo(e));
  }

  
  
} //class Sensors

module.exports = Sensors.newSensors;

const MONGO_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

function sensorDataId(sensorId, timestamp) {
  return `${sensorId}-${timestamp}`;
}

function toMongoInfo(info) {
  const isNoId = (info.id === undefined) || (info.id === null); 
  const mongoInfo = (isNoId) ? info : Object.assign({_id: info.id}, info);
  if (isNoId) delete mongoInfo.id;
  return mongoInfo;  
}

function fromMongoInfo(mongoInfo) {
  const info = Object.assign({}, mongoInfo);
  delete info._id;
  return info;
}

function nextIndex(searchSpec, data) {
  const isIdSearch = (searchSpec.id !== undefined) && (searchSpec.id !== null);
  return (isIdSearch || data.length < searchSpec._count)
    ? -1
    : searchSpec._index + searchSpec._count;
}

function previousIndex(search, data) {
  const isIdSearch = (search.id !== undefined) && (search.id !== null);
  return (isIdSearch || search._index == undefined)
    ? -1
    : search._index > search._count
    ? search._index - search._count
    : 0;
}

const COLLECTIONS = [
  'sensorTypes',
  'sensors',
  'sensorData',
];

function inRange(value, range) {
  return Number(range.min) <= value && value <= Number(range.max);
}
