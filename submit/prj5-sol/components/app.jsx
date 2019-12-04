//-*- mode: rjsx-mode;

'use strict';

const React = require('react');
const ReactDom = require('react-dom');

const Tab = require('./tab.jsx');

/*************************** App Component ***************************/

const TABS = {
  'sensor-types-search': 'Search Sensor Types',
  'sensor-types-add': 'Add Sensor Type',
  'sensors-search': 'Search Sensors',
  'sensors-add': 'Add Sensor'
};

class App extends React.Component {

  constructor(props) {
    super(props);

    this.select = this.select.bind(this);
    this.isSelected = this.isSelected.bind(this);

    this.state = {
      selected: 'sensor-types-search'
    };

  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  isSelected(v) { return v === this.state.selected; }

  select(v) {
    this.setState({selected: v});
  }

  getComponent(v) {
    let component = null;
    //@TODO
    return component;
  }

  render() {
    const wsState = this.props.ws.nChanges;
    const tabs = Object.entries(TABS).map(([k, v], i) => {
      const component = this.getComponent(k);
      const label = v;
      const isSelected = (this.state.selected === k);
      const tab = (
        <Tab component={component} id={k}
             label={label} index={i} key={i}
             select={this.select} isSelected={isSelected}/>
      );
      return tab;
    });

    return <div className="tabs">{tabs}</div>
  }

}

module.exports = App;
