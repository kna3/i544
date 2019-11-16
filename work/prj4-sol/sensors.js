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
        console.log("sensor-types");
        const model = { base: app.locals.base, fields: {}};
        const mustache = new Mustache();
        const html = mustache.render('sensor-types', model);
        res.send(html);
    }
}

/************************ General Utilities ****************************/

/** Decode an error thrown by web services into an errors hash
 *  with a _ key.
 */
function wsErrors(err) {
    const msg = (err.message) ? err.message : 'web service error';
    console.error(msg);
    return { _: [ msg ] };
}
  
function doMustache(app, templateId, view) {
    const templates = { footer: app.templates.footer };
    return Mustache.render(app.templates[templateId], view, templates);
}


function setupTemplates(app) {
    console.log("template");
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


