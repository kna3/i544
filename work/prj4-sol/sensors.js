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
}

function getSensorTypes(app) {
    return async function(req, res) {
        const mustache = new Mustache();
        const WIDGETS = [
            {
            name: 'id',
            label: 'Sensor Type ID',
            classes: [ 'tst-sensor-type-id'],
            isRequired: false,
            val: 'value 1',
            errors: { input1: 'bad value error' }
            },
            {
                name: 'modelNumber',
                label: 'Model Number',
                classes: [ 'tst-model-number'],
                isRequired: false,
                val: 'value 1',
                errors: { input1: 'bad value error' }
            },
            {
                name: 'manufacturer',
                label: 'Manufacturer',
                classes: [ 'tst-manufacturer'],
                isRequired: false,
                val: 'value 1',
                errors: { input1: 'bad value error' }
            },
            { 
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
            val: 'val2',
          },
            {
            type: 'submit',
            name: ' ',
            label: ' ',
            val: 'search',
            }];
        let view = [];
        for (const widget of WIDGETS) {
            view.push(widgetView(widget, widget.val, widget.errors));
        }
        let partials = {form: view, render: function () {
                return mustache.render('widget', this);
            }};
        let html = mustache.render('sensor-types', partials);
        res.send(html);
    }

}
function setupTemplates(app) {
    app.templates = {};
    for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
        const m = fname.match(/^([\w\-]+)\.ms$/);
        if (!m) continue;
        try {
            app.templates[m[1]] =
                String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
        }
        catch (e) {
            console.error(`cannot read ${fname}: ${e}`);
            process.exit(1);
        }
    }
}
