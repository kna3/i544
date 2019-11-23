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

const WIDGETS = new Map([['id',
    {
        name: 'id',
        label: 'Sensor Type ID',
        classes: [ 'tst-sensor-type-id'],
        isRequired: false,
        regex: /^[a-zA-Z0-9_-]+$/,
        errors: "Sensor Type ID field can contain only alphanumerics, '-' or '_'" ,
    }],
    ['modelNumber', {
        name: 'modelNumber',
        label: 'Model Number',
        classes: [ 'tst-model-number'],
        isRequired: false,
        regex: /^[a-zA-Z0-9_-]+$/,
        errors: "Model Number field can contain only alphanumerics, '-' or '_'" ,
    }],
    ['manufacturer', {
        name: 'manufacturer',
        label: 'Manufacturer',
        classes: [ 'tst-manufacturer'],
        isRequired: false,
        regex:/^[a-zA-Z0-9_\ ]+$/,
        errors: "The Manufacturer field can contain only alphanumerics, -, \' or space",
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
        name: 'limits',
        attr: [ { name: 'id', value: 'interval1-id'}     ],
        label: 'Limits',
        regex : /^\\d+$/,
        errors: 'This field must be an integer',
        val: { min: 100.2, max: 127, },
        classes: [ 'interval' ],
    }],
['_index', '5']]
);

const quantityArr = [['val1', 'temperature'], ['val2', 'pressure'], ['val3', 'flow'], ['val4', 'humidity']];
const quantityMap = new Map(quantityArr);
const unitMap = new Map([['flow', 'gpm'], ['humidity', '%'], ['pressure', 'PSI'], ['temperature', 'C']]);

const SensorWidget = new Map([['id',
    {
        name: 'id',
        label: 'Sensor ID',
        classes: [ 'tst-sensor-id'],
        isRequired: false,
        regex: /^[a-zA-Z0-9\-\']+$/,
        //attr: [{name: 'pattern', value: '^[a-zA-Z0-9_-]+$'}],
        errors: "Sensor ID field can contain only alphanumerics, '-' or '_'"
    }],
    ['model', {
        name: 'model',
        label: 'Model',
        classes: [ 'tst-model'],
        isRequired: false,
        regex: /^[a-zA-Z0-9\-\' ]+$/,
        errors: "Model ID field can contain only alphanumerics, '-'  or '_'" ,
    }],
    ['period', {
        name: 'period',
        label: 'Period',
        classes: [ 'tst-period'],
        isRequired: false,
        regex: /^\\d+$/,
        errors: 'The Period field must be an integer',
    }],
    ['expected', {
        type: 'interval',
        name: 'expected',
        attr: [ { name: 'id', value: 'interval1-id', }, ],
        regex: /^\\d+$/,
        label: 'Expected',
        val: { min: 100.2, max: 127, },
        errors: 'This field must be an integer',
        classes: [ 'interval' ],
    }],
['_index', '5']]
);


function serve(port, model, base='') {
    const app = express();
    app.locals.port = port;
    app.locals.base = base;
    app.locals.model = model;
    process.chdir(__dirname);
    app.use(base, express.static(STATIC_DIR));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
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
    app.get(`${base}/sensor-types/add.html`, create(app));
    app.get(`${base}/sensors.html`, getSensorTypes(app));
    app.get(`${base}/sensors/add.html`, create(app));
    app.post(`${base}/sensors/add.html`, create(app));
    app.post(`${base}/sensor-types/add.html`, create(app));
}

function getSensorTypes(app) {
    return async function (req, res) {
        const mustache = new Mustache();
        let model = {};
        console.log(req.query);
        console.log('getSensorType');
        let view = [];
        let widgets = [];
        let html;
        let sensorTypeReqFields = ['id', 'modelNumber', 'manufacturer', 'quantity', 'limits'];
        let sensorsReqFields = ['id', 'model', 'period', 'expected'];
        let errors = {};
        let errorMap = new Map();
        if (req.url.includes('/sensor-types.html')) {
            widgets.push(WIDGETS.get('id'));
            widgets.push(WIDGETS.get('modelNumber'));
            widgets.push(WIDGETS.get('manufacturer'));
            widgets.push(WIDGETS.get('quantity'));
            //console.log(req);
        } else if (req.url.includes('/sensors.html')) {
            widgets.push(SensorWidget.get('id'));
            widgets.push(SensorWidget.get('model'));
            widgets.push(SensorWidget.get('period'));
        }
        req.query = getNonEmptyValues(req.query, req.url);
        widgets.map((curr) => curr.val = {value: req.query[curr.name]});
        for (const widget of widgets) {
            view.push(widgetView(widget, widget.val, widget.errors));
        }
        model.form = view;
        model.render = function () {
            return mustache.render('widget', this);
        };
        console.log(req.query);
        if (req.query.quantity) {
            req.query.quantity = quantityMap.get(req.query.quantity);
        }
        
            try {
                let results = {};
                if (Object.keys(req.query).length > 0 ) {
                
                if (req.url.includes('/sensor-types.html')) {
                    
                    errors = validate(req.query, [], req.url);
                    for (let error in errors) {
                        errorMap.set(error, {error: errors[error]});
                    }
                } else if (req.url.includes('/sensors.html')) {

                    errors = validate(req.query, [], req.url);
                    for (let error in errors) {
                        errorMap.set(error, {error: errors[error]});
                    }
                }
            }
                if (!(Object.keys(errors).length > 0)) {
                    if (req.url.includes('/sensor-types.html')) {
                        console.log('type');
                        results = await app.locals.model.list('sensor-types', req.query);
                        console.log(results);

                    } else {
                        console.log('sensor');
                        results = await app.locals.model.list('sensors', req.query);
                    }
                    if (results.data.length === 0) {
                        console.log('here');
                        let err = {errors: [{message: 'No results found.'}]};
                        throw err;
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
                    model.result = results;
                    model.next = next;
                    model.prev = prev;
                } else {

                    console.log("have Got errors");
                    console.log(errors);
                    view = [];
                    widgets.map((curr) => curr.val = req.query[curr.name]);
                    for (const widget of widgets) {
                        let obj = {};
                        obj.value = widget.val;
                        obj.error = errorMap.get(widget.name);
                        view.push(widgetView(widget, obj));
                    }
                    model.form = view;
                }
            } catch (err) {
                let error = err.errors;
                let msg = '';
                if (error[0].code === 'INTERNAL') {
                    msg = error[0].message;
                } else {
                    msg = 'No results found.'
                }
                model.error =  msg;
                console.log(err);
            }
        
        model.method = 'GET';
        model.search = true
        if (req.url.includes('/sensor-types.html')) {
            html = mustache.render('sensor-types', model);
        } else if (req.url.includes('/sensors.html')) {
            html = mustache.render('sensors', model);
        }
        res.send(html);
    }
}

function create(app) {
    return async function (req, res) {
        console.log('create');
        /*console.log(req.body);*/
        const mustache = new Mustache();
        let view = [];
        let widgets = [];
        let html;
        let model = {};
        let params = getNonEmptyValues(req.body, req.url);
        let sensorTypeReqFields = ['id', 'modelNumber', 'manufacturer', 'quantity', 'limits' ];
        let sensorsReqFields = ['id', 'model', 'period', 'expected'];
        let errors = {};
        let errorMap = new Map();

        // if(!errors){
        if (req.url.includes('/sensor-types/add.html')) {
            widgets.push(WIDGETS.get('id'));
            widgets.push(WIDGETS.get('modelNumber'));
            widgets.push(WIDGETS.get('manufacturer'));
            widgets.push(WIDGETS.get('quantity'));
            widgets.push(WIDGETS.get('limits'));
            //console.log(req);
        } else if (req.url.includes('/sensors/add.html')) {
            widgets.push(SensorWidget.get('id'));
            widgets.push(SensorWidget.get('model'));
            widgets.push(SensorWidget.get('period'));
            widgets.push(SensorWidget.get('expected'));
        }
        //}
        widgets.map((curr) => {curr.val = {value: req.query[curr.name]};
            curr.isRequired =true;
        });
        for (const widget of widgets) {
            view.push(widgetView(widget, widget.val, widget.errors));
        }
        model.method = 'POST';
        model.add = true;
        model.form = view;
        model.render = function () {
            return mustache.render('widget', this);
        };
        console.log(req.body);
        if (Object.keys(req.body).length > 0) {
            try {
                if (req.url.includes('/sensor-types/add.html')) {
                    if (req.body.quantity) {
                        req.body.quantity = quantityMap.get(req.body.quantity);
                        req.body.unit = unitMap.get(req.body.quantity);
                    }
                }
                console.log(req.method + " is the method");
                //console.log(req.body);
                if (req.method === 'POST') {
                    if (req.url.includes('/sensor-types/add.html')) {
                        errors = validate(params, sensorTypeReqFields, req.url);
                        for (let error in errors) {
                            errorMap.set(error, {error: errors[error]});
                        }
                    } else if (req.url.includes('/sensors/add.html')){
                        errors = validate(params, sensorsReqFields, req.url);
                        for (let error in errors) {
                            errorMap.set(error, {error: errors[error]});
                        }
                    }
                    console.log(errors);
                    if (!(Object.keys(errors).length > 0)) {
                        if (req.url.includes('/sensor-types/add.html')) {
                            let response = await app.locals.model.update('sensor-types', req.body);
                            if (response === 'Created') {
                                res.redirect(app.locals.base + '/sensor-types.html?id=' + req.body.id);
                            }
                        }
                        if (req.url.includes('/sensors/add.html')) {
                            let response = await app.locals.model.update('sensors', req.body);
                            console.log(response);
                            if (response === 'Created') {
                                res.redirect(app.locals.base + '/sensors.html?id=' + req.body.id);
                            }
                        }
                    } else {
                        console.log("have errors");
                        view = [];
                        console.log(req.body);
                        if (req.body.quantity) {
                            req.body.quantity = quantityMap.get(req.body.quantity);
                        }
                        widgets.map((curr) => curr.val = req.body[curr.name]);

                        console.log(widgets);
                        for (const widget of widgets) {
                            console.log(errorMap.get(widget.name));
                            let obj = {};
                            obj.value = widget.val;
                            obj.error = errorMap.get(widget.name);
                            console.log(obj);
                            view.push(widgetView(widget, obj));
                        }
                        model.form = view;
                        model.render = function () {
                            return mustache.render('widget', this);
                        };
                    }

                }

            } catch (err) {
                let error = err.errors;
                let msg = '';
                if (error[0].code === 'INTERNAL') {
                    msg = error[0].message;
                } else {
                    msg = 'No results found.'
                }
                model.error =  msg;
                console.log(err);
            }
        }

    if (req.url.includes('/sensor-types/add.html')) {
        html = mustache.render('sensor-types', model);
    } else if (req.url.includes('/sensors/add.html')) {
        html = mustache.render('sensors', model);
    }
    res.send(html);
}
}

function validate(values, requires=[],url) {
    const errors = {};
    
        requires.forEach(function (names) {
            if(url.includes('/sensor-types/add.html')) {
                if (names === 'id') {
                    if (values[names] === undefined) {
                        errors[names] =
                            `A value for '${WIDGETS.get(names).label}' must be provided`;
                    }
                } else if (names === 'limits') {
                    if (values[names] === undefined) {
                        errors[names] =
                            `Both Min and Max values must be specified for 'Limits'.`;
                    }
                } else if (names === 'quantity') {
                    if (values[names] === undefined) {
                        errors[names] =
                            `A value for 'Measure' must be provided.`;
                    }
                }else if(values[names] === undefined) {
                    
                        errors[names] =
                            `An value for '${WIDGETS.get(names).label}' must be provided`;
                    
                }
            }
            else{
                if (names === 'id') {
                    if (values[names] === undefined) {
                        errors[names] =
                            `A value for '${SensorWidget.get(names).label}' must be provided`;
                    }
                } else if (names === 'expected') {
                    if (values[names] === undefined) {
                        errors[names] =
                            `Both Min and Max values must be specified for 'Expected Range'.`;
                    }
                }
                else if (values[names] === undefined) {
                    errors[names] =
                        `A value for '${SensorWidget.get(names).label}' must be provided`;
                }
            }
        });

    for (const name of Object.keys(values)) {
        if (url.includes('/sensor-types.html') || url.includes('/sensor-types/add.html')) {
            const fieldInfo = WIDGETS.get(name);
            const value = values[name];
            if(typeof value  === "string"){
                if (fieldInfo.regex && value.length > 0 && !(String(value)).match(fieldInfo.regex)) {
                    console.log('error field');
                    console.log(value);
                    errors[name] = fieldInfo.errors;
                    console.log(errors[name]);
                }
            }else if(typeof value === "object"){
                const expMin = value.min;
                const expMax = value.max;
                console.log(expMin);
                console.log(expMax);
                const periodVal1 = parseInt(expMin, 10);
                const periodVal2 = parseInt(expMax, 10);
                const check1 = String(periodVal1);
                const check2 = String(periodVal2);
                if(periodVal1<periodVal2){
                    if(check1!==expMin || check2!==expMax){
                        errors[name] = fieldInfo.errors;
                    }
                }
                else {
                    errors[name] = `The Limits Min value '${periodVal1}' is greater than its Max value '${periodVal2}' `;
                }
            }
        }
        else{
            if(name==='period'){
                const fieldInfo = SensorWidget.get(name);
                const value = values[name];
                const periodVal = parseInt(value, 10);
                const check = String(periodVal);
                if(check!==value){
                    errors[name] = fieldInfo.errors;
                }
            }
            else{
                const fieldInfo = SensorWidget.get(name);
                const value = values[name];
                if(typeof value  === "string"){
                    if (fieldInfo.regex && !(String(value)).match(fieldInfo.regex)) {
                        errors[name] = fieldInfo.errors;
                    }
                }   if(typeof value === "object"){
                    const expMin = value.min;
                    const expMax = value.max;
                    const periodVal1 = parseInt(expMin, 10);
                    const periodVal2 = parseInt(expMax, 10);
                    const check1 = String(periodVal1);
                    const check2 = String(periodVal2);
                    if(periodVal1<periodVal2){
                        if(check1!==expMin || check2!==expMax){
                            errors[name] = fieldInfo.errors;
                        }
                    }
                    else {
                        errors[name] = `The Limits Min value '${periodVal1}' is greater than its Max value '${periodVal2}' `;
                    }
                }
            }
        }
    }
    return Object.keys(errors).length > 0 && errors;
}

function getNonEmptyValues(values,url) {
    const out = {};
    Object.keys(values).forEach(function(k) {
        //console.log(k + 'is k');
        if (url.includes('/sensor-types.html') || url.includes('/sensor-types/add.html')) {
            if (WIDGETS.get(k) !== undefined) {
                //console.log(WIDGETS.get(k));
                const v = values[k];
                //console.log(v);
                if (typeof v === 'object') {
                    if (v.min && v.min.trim().length > 0 && v.max && v.max.trim().length > 0) {
                        out[k] = v;
                    }
                } else if (v && v.trim().length > 0) out[k] = v.trim();
            }
        }
        else {
            console.log(k);

            if (SensorWidget.get(k) !== undefined) {
                console.log('hao');
                const v = values[k];
                if (typeof v === 'object') {
                    if (v.min && v.min.trim().length > 0 && v.max && v.max.trim().length > 0) {
                        out[k] = v;
                    }
                } else if (v && v.trim().length > 0) out[k] = v.trim();
            }
        }
    });
    return out;
}

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