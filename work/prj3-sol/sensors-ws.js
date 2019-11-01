const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const AppError = require('./app-error');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, sensors) {
    const app = express();
    app.locals.port = port;
    app.locals.model = sensors;
    setupRoutes(app);
    app.listen(port, function() {
        console.log(`listening on port ${port}`);
    });
}

module.exports = { serve };

function setupRoutes(app) {
    const base = app.locals.base;
    app.use(cors());
    app.use(bodyParser.json());
    app.get(`/:sensorReq`, doGetSensorTypeAndSensor(app));
    app.get('/sensor-data/:sensorId', doGetSensorData(app));
    app.get('/sensor-data/:sensorId/:timestamp', doGetSensorData(app));
    app.get(`/:sensorReq/:id`, doGetSensorTypeAndSensor(app));
    app.post('/:sensorReq', doCreate(app));

}

    function doGetSensorTypeAndSensor(app) {
        return errorWrap(async function (req, res) {
            let results = {};
            let url = requestUrl(req);
            try {
                if (req.params.id) {
                    console.log(req.params);
                    if (req.params.sensorReq !== undefined) {
                        console.log("sensor-types");
                        if(req.params.sensorReq === 'sensor-types') {
                            results = await app.locals.model.findSensorTypes({id: req.params.id});
                        } else if (req.params.sensorReq === 'sensors') {
                            console.log("sensors");
                            results = await app.locals.model.findSensors({id: req.params.id});
                        }
                    }
                    results.self = url;
                } else {

                    console.log(req.originalUrl);
                    let sensorReq = '';
                    if (req.originalUrl.includes('?')) {
                         sensorReq = req.originalUrl.substring(1, req.originalUrl.indexOf('?'));
                    } else {
                        sensorReq = req.originalUrl.substring(1);
                    }

                    console.log(sensorReq);
                    const q = req.query || {};
                    console.log(q);
                    if (sensorReq === 'sensor-types') {
                        results = await app.locals.model.findSensorTypes(q);
                    } else if (sensorReq === 'sensors') {
                        results = await app.locals.model.findSensors(q);
                    }
                    results.self = url;
                    let data = results.data;
                    url = getBaseUrl(url);
                    data.map(async (curr) => {
                        curr.self = url + '/' + curr.id;
                        if (q._doDetail) {
                            curr.sensorType = await app.locals.model.findSensorTypes({id : curr.model});
                        }
                    });

                    getNextAndPreviousIndex(q, url, results);
                }
                res.json(results);
            } catch (err) {
                console.log(err);
                res.status(NOT_FOUND);
                let id = req.params.id === undefined ? req.query.id :req.params.id;
                let error = {message: "no results for sensor-type id \'" + id + "\'",
                    code: "NOT_FOUND"};
                res.json(error);
                console.error(error);
            }
        });
    }


    function doCreate(app) {
        return errorWrap(async function (req, res) {
            const body = req.body;

            console.log(body);
            let sensorReq = req.originalUrl;
            sensorReq = sensorReq.slice(1);
            console.log(sensorReq);
            try {
                if (sensorReq === 'sensor-types') {
                    await app.locals.model.addSensorType(body);
                } else if (sensorReq === 'sensors') {
                    await app.locals.model.addSensor(body);
                }
                res.status(CREATED);
                res.send("Created");
            } catch (err) {
                console.log(err);
            }

        });

    }

    function doGetSensorData(app) {
        return errorWrap(async function (req, res) {
            try {
                let results;
                let errors = {};

                let url = requestUrl(req);
                if (req.params.sensorId && Object.keys(req.query).length === 0) {
                    results = await app.locals.model.findSensorData({
                        sensorId: req.params.sensorId,
                        timestamp: req.params.timestamp
                    });
                    let data = results.data;
                    if (req.params.timestamp) {
                        let temp = [];
                        temp.push(data[0]);
                        results.data = temp;
                        results.nextIndex = -1;
                    }
                    results.self = url;
                } else {
                    const q = req.query || {};
                    console.log(q);
                    q.sensorId = req.params.sensorId;
                    results = await app.locals.model.findSensorData(q);
                    results.self = url;
                }
                url = getBaseUrl(url);

                results.data.map(async (curr) => {
                    if (req.params.timestamp) {
                        if (curr.timestamp == req.params.timestamp) {
                            curr.self = url;
                        } else {
                            errors.code = "NOT_FOUND";
                            errors.message = "no data for timestamp " + req.params.timestamp;
                        }
                    } else {
                        curr.self = url + '/' + curr.timestamp;
                    }
                });
                if (Object.keys(errors).length > 0) {
                    throw errors;
                }
                res.json(results);
            } catch (err) {
               // console.log(err);
                res.status(NOT_FOUND);
                /*let error = {
                    message: "no data for timestamp " + req.params.timestamp,
                    code: "NOT_FOUND"
                };*/
                res.json({code: err.code, message: err.message});
                console.error(err);
            }
        });
    }


/** Set up error handling for handler by wrapping it in a
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        }
        catch (err) {
            next(err);
        }
    };
}


/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
    EXISTS: CONFLICT,
    NOT_FOUND: NOT_FOUND
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
    console.error(err);
    return err.isDomain
        ? { status: (ERROR_MAP[err.errorCode] || BAD_REQUEST),
            code: err.errorCode,
            message: err.message
        }
        : { status: SERVER_ERROR,
            code: 'INTERNAL',
            message: err.toString()
        };
}

/****************************** Utilities ******************************/

/** Return original URL for req */
function requestUrl(req) {
    const port = req.app.locals.port;
    return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

function getNextAndPreviousIndex(q, url, results) {
    let filters = {};
    for (let filter in q) {
        if (filter !== "_count" && filter !== "_index") {
            filters[filter] = q[filter];
        }
    }
    console.log(filters);
    if (filters) {
        console.log("not empty");
        url = url.concat('?');
        for(let filter in filters) {
            url = url.concat(filter + '=' + filters[filter]);
        }
    }
    let amp = false;
    if (Object.keys(filters).length > 0) {
        console.log(amp);
        amp = true;
    }
    console.log(url);
    if (results.nextIndex > 0) {
        results.next = url + (amp ? '&' : '') + '_index=' + results.nextIndex;
        console.log(results.next);
        if (q._count > 0) {
            results.next += '&_count=' + q._count;
        }
    }
    if (results.previousIndex > 0) {
        results.previous = url + (amp ? '&' : '') + '_index=' + results.previousIndex;
        if (q._count > 0) {
            results.previous += '&_count=' + q._count;
        }
    }
}

function getBaseUrl(url) {
    if (url.includes('?')) {
        url = url.slice(0, url.indexOf('?'));
    }
    return url;
}