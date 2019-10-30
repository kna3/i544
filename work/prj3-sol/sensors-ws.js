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
    app.get(`/sensor-types`, doGetSensorType(app));
    app.get(`/sensor-types/:id`, doGetSensorType(app));

}

    function doGetSensorType(app) {
        return errorWrap(async function (req, res) {
            let results = {};
            let url = requestUrl(req);
            try {
                if (req.params.id) {
                    console.log(req.params.id);
                    results = await app.locals.model.findSensorTypes({id: req.params.id});
                } else {
                    const q = req.query || {};

                    results = await app.locals.model.findSensorTypes(q);
                    let data = results.data;
                    if (url.includes('?')) {
                        url = url.slice(0, url.indexOf('?'));
                    }
                    data.map((curr) => {
                        curr.self = url + '/' + curr.id;
                    });

                    if (results.nextIndex > 0) {
                        results.next = url + '?_index=' + results.nextIndex;
                        if (q._count > 0) {
                            results.next += '&_count=' + q._count;
                        }
                    }
                    if (results.previousIndex > 0) {
                        results.previous = url + '?_index=' + results.previousIndex;
                        if (q._count > 0) {
                            results.previous += '&_count=' + q._count;
                        }
                    }
                    res.json(results);
                }
                results.self = url;
                res.json(results);
            } catch (err) {
                res.status(NOT_FOUND);
                let id = req.params.id === undefined ? req.query.id :req.params.id
                res.json({message: "no results for sensor-type id '" + id + "'",
                    code: "NOT_FOUND"});
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