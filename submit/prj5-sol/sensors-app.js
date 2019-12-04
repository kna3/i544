const React = require('react');
const ReactDom = require('react-dom');

const SensorsWs = require('./sensors-ws');

const App = require('./components/app.jsx');

function main() {
  const ws = new SensorsWs();
  const app = <App ws={ws}/>;
  ReactDom.render(app, document.getElementById('app'));
}

main();
