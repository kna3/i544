'use strict';

const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const querystring = require('querystring');

const Mustache = require('./mustache');
const widgetView = require('./widget-view');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

const WIDGETS = new Map([['sensorTypeID',
    {
        name: 'id',
        label: 'Sensor Type ID',
        classes: [ 'tst-sensor-type-id'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^[a-zA-Z0-9_-]+$'}],
        errors: { input1: "Sensor Type ID field can contain only alphanumerics, '-' or '_'" }
    }],
    ['modelNumber', {
        name: 'modelNumber',
        label: 'Model Number',
        classes: [ 'tst-model-number'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^[a-zA-Z0-9_-]+$'}],
        errors: { input1: "Model Number field can contain only alphanumerics, '-' or '_'" }
    }],
    ['manufacturer', {
        name: 'manufacturer',
        label: 'Manufacturer',
        classes: [ 'tst-manufacturer'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^[a-zA-Z_\ ]+$'}],
        errors: { input1: "The Manufacturer field can contain only alphabetics, -, \' or space" }
    }],
    ['quantity', {
        type: 'select',
        name: 'quantity',
        label: 'Measure',
        choices: {
            '': 'Select',
            val1: 'Temperature',
            val2: 'Pressure',
            val3: 'Flow Rate',
            val4: 'Relative Humidity'
        },
        classes: [ 'tst-quantity'],
        isRequired: false,
    }],
    ['limits', {
        type: 'interval',
        name: 'interval1',
        attr: [ { name: 'id', value: 'interval1-id', }, ],
        label: 'Limits',
        val: { min: 100.2, max: 127, },
        classes: [ 'interval' ],
    }]]
);

const quantityArr = [['val1', 'temperature'], ['val2', 'pressure'], ['val3', 'flow'], ['val4', 'humidity']];
const quantityMap = new Map(quantityArr);

const SensorWidget = new Map([['sensorID',
    {
        name: 'id',
        label: 'Sensor ID',
        classes: [ 'tst-sensor-id'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^[a-zA-Z0-9_-]+$'}],
        errors: { input1: "Sensor ID field can contain only alphanumerics, '-' or '_'"}
    }],
    ['model', {
        name: 'model',
        label: 'Model',
        classes: [ 'tst-model'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^[a-zA-Z0-9_-]+$'}],
        errors: { input1: "Model ID field can contain only alphanumerics, '-'  or '_'" }
    }],
    ['period', {
        name: 'period',
        label: 'Period',
        classes: [ 'tst-period'],
        isRequired: false,
        attr: [{name: 'pattern', value: '^\\d+$'}],
        errors: { input1: 'The Period field must be an integer' }
    }],
    ['expected', {
        type: 'interval',
        name: 'interval1',
        attr: [ { name: 'id', value: 'interval1-id', }, ],
        label: 'Expected',
        val: { min: 100.2, max: 127, },
        classes: [ 'interval' ],
    }]]
);


function serve(port, model, base='') {
    const app = express();
    app.locals.port = port;
    app.locals.base = base;
    app.locals.model = model;
    process.chdir(__dirname);
    app.use(base, express.static(STATIC_DIR));
    setupTemplates(app);
    setupRoutes(app);
    app.listen(port, function() {
        console.log(`listening on port ${port}`);
    });
}


module.exports = serve;

function setupRoutes(app) {
    const base = app.locals.base;
    app.get(`${base}/sensor-types.html`, getSensorTypes(app));
    app.get(`${base}/sensor-types/add.html`, getSensorTypes(app));
    app.get(`${base}/sensors.html`, getSensorTypes(app));
    app.get(`${base}/sensors/add.html`, getSensorTypes(app));
}

function getSensorTypes(app) {
    return async function (req, res) {
        const mustache = new Mustache();
        let model = {};
        console.log(req.query);
        let view = [];
        let widgets = [];
        let html;
        if (req.url.includes('/sensor-types.html')) {
            widgets.push(WIDGETS.get('sensorTypeID'));
            widgets.push(WIDGETS.get('modelNumber'));
            widgets.push(WIDGETS.get('manufacturer'));
            widgets.push(WIDGETS.get('quantity'));
            //console.log(req);
        } else if(req.url.includes('/sensors.html')){
            widgets.push(SensorWidget.get('sensorID'));
            widgets.push(SensorWidget.get('model'));
            widgets.push(SensorWidget.get('period'));
        }
        widgets.map((curr) => curr.val = {value: req.query[curr.name]});
        for (const widget of widgets) {
            view.push(widgetView(widget, widget.val, widget.errors));
        }
        model.form = view;
        model.render = function () {
            return mustache.render('widget', this);
        };

        if (req.query.quantity) {
            req.query.quantity = quantityMap.get(req.query.quantity);
        }
        try {
            let results = {};
            if (req.url.includes('/sensor-types.html')) {
                console.log(req.query);
                results = await app.locals.model.list('sensor-types', req.query);
                //console.log(results);
            } else if(req.url.includes('/sensors.html')) {
                results = await app.locals.model.list('sensors', req.query);
            }
            let next = "";
            
            if (results.next) {
                next = results.next.slice(results.next.indexOf('?'));
            }
            //console.log(next);
            let prev = "";
            if (results.prev) {
                prev = results.prev.slice(results.prev.indexOf('?'));
            }
            //console.log(prev);
            model.result = results;
            model.next = next;
            model.prev = prev;
        } catch (err) {
            let errorMsg = 'No results found.';
            model.error = errorMsg;
            //console.log(err);
        }
        if (req.url.includes('/sensor-types.html')) {
            html = mustache.render('sensor-types', model);
        } else if (req.url.includes('/sensors.html')) {
            html = mustache.render('sensors', model);
        }
        res.send(html);

        /*else if (req.url === '/sensor-types/add.html') {
           console.log('sensor-types/add.html');
           widgets.push(WIDGETS.get('limits'));
           for (const widget of widgets) {
               view.push(widgetView(widget, widget.val, widget.errors));
           }
       } else {
           console.log('/sensors/add.html');
           widgets.push(SensorWidget.get('expected'));
           for (const widget of widgets) {
               view.push(widgetView(widget, widget.val, widget.errors));
           }
       }
        model.form = view;
        model.render = function () {
            return mustache.render('widget', this);
        };*/
    }
}

/*

function getSensors(app) {
    return async function (req, res) {
        const mustache = new Mustache();
        let model = {};
        //console.log(req);
        let view = [];
        let widgets = [];
        widgets.push(SensorWidget.get('sensorID'));
        widgets.push(SensorWidget.get('model'));
        widgets.push(SensorWidget.get('period'));

        console.log(req);
        if (req.url === '/sensors.html') {
            console.log('sensors');
            widgets.map((curr) => curr.val = {value: req.query[curr.name]});
            //console.log(widgets);
            for (const widget of widgets) {
                view.push(widgetView(widget, widget.val, widget.errors));
            }
            model.form = view;
            model.render = function () {
                return mustache.render('widget', this);
            };

            try {
                let results = await app.locals.model.list('sensors', req.query);
                //console.log(results);
                let next = "";
                if (results.next) {
                    next = results.next.slice(results.next.indexOf('?'));
                }
                let prev = "";
                if (results.prev) {
                    prev = results.prev.slice(results.prev.indexOf('?'));
                }
                model.result = results;
                model.next = next;
                model.prev = prev;
            } catch (err) {
                let errorMsg = 'No results found.';
                model.error = errorMsg;
                //console.log(err);
            }
            let html = mustache.render('sensors', model);
            res.send(html);
        } else if (req.url === '/sensors/add.html') {
            console.log('sensors/add.html');
            widgets.push(SensorWidget.get('expected'));
            for (const widget of widgets) {
                view.push(widgetView(widget, widget.val, widget.errors));
            }
            model.form = view;
            model.render = function () {
                return mustache.render('widget', this);
            };
            let html = mustache.render('sensors', model);
            res.send(html);
        }
    }
}*/

function setupTemplates(app) {
    app.templates = {};
    for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
        const m = fname.match(/^([\w\-]+)\.ms$/);
        if (!m) continue;
        try {
            app.templates[m[1]] =
                String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
        } catch (e) {
            console.error(`cannot read ${fname}: ${e}`);
            process.exit(1);
        }
    }
}