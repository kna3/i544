#!/usr/bin/env nodejs

const assert = require('assert');

/** Given an input object widget having the following properties:
 *
 *    name:    Required name of the widget. 
 *    label:   Required label associated with widget.
 *    attr:    Optional list of attribute spec objects.  Each 
 *             attribute spec object must have a 'name' property
 *             giving the attribute name.  Each attribute spec object 
 *             must also have a `value` property unless the attribute is
 *             a Boolean attributes (like 'disabled'); in that case 
 *             the attribute spec object must specify a truthy 
 *             isBoolean property.
 *             If there is no attribute spec with 'name' === 'id',
 *             then an id attribute is created defaulting to
 *             the widget name.
 *    type:    Optional widget type: one of the types for HTML's <input>
 *             element or one of "select", "textarea", or `interval`.  
 *             Defaults to text.
 *    choices: Used when a widget can only have a fixed set of values
 *             like <select> boxes, radio buttons or checkboxes.  This
 *             optional object maps a value into a label.
 *    classes: List of HTML classes to associate with rendered widget.
 *             Will be added to any class attribute specified in attr.
 *
 *  The opts argument can contain the following options:
 *
 *     value:   A value for the widget.  Can be a list
 *              for a multi-valued widget like a checkbox.
 *     error:   An error message associated with the widget.
 *     postFn:  A function view => newView which can be used
 *              to transform the view which would be otherwise
 *              returned by this function.
 *
 *  Returns a new view object which can be rendered as an HTML widget
 *  using widget.ms.
 *
 *  The 'interval' type is not one of the standard HTML types.  It is
 *  set up to render as a div.  This div will contain two text input
 *  widgets with names 'NAME[min]' and 'NAME[max]' where NAME is the
 *  name specified for the widget. Each input widget will have the
 *  classes 'numeric' and either 'tst-NAME-min' or 'tst-NAME-max' as
 *  appropriate. The value for the widget should be an object with
 *  'min' and 'max' properties.
 *
 *  The input and output of this module is shown by the test code
 *  at the end of this file.  The tests can be run by simply 
 *  executing this file.
 */
function widgetView(widget, opts={}) {
  const view = {
    name: widget.name,
    label: widget.label,
    isRequired: widget.isRequired || false,
    type: widget.type || 'text',
    error: opts.error,
  };
  assert(view.name, `no "name" property specified for view`);
  assert(view.label, `no "label" property specified for view`);
  const type = view.type;
  const isInput = (type !== 'select' && type !== 'textarea');
  const attr = widgetAttributes(widget);
  //depending on template engine to encode attribute values
  view.attr = Object.values(attr);
  view.id = attr.id.value;
  view[TYPE_PREDICATES[type] || 'isOther'] = true;
  view.value = opts.value || '';
  const values =
    new Set(opts.value instanceof Array ? opts.value : [view.value]);
  assert(values.size <= 1 || type === 'checkbox' || type === 'select',
	 'multiple values allowed only for checkbox or select widgets');
  view.choices =
    Object.entries(widget.choices || {}).
    map(([k, v], i) => ({
      value: k,
      label: v,
      id: `${view.name}-${i}`,
      isChosen: values.has(k),
    }));
  return opts.postFn ? opts.postFn(view) : view;
}
module.exports = widgetView;

function widgetAttributes(widget) {
  const attr = {};
  (widget.attr || []).forEach( a => {
    assert(a.name !== undefined, 'attr name must be specified');
    assert(a.value !== undefined || a.isBoolean,
	   'attr value must be specified for non-boolean attributes');
    if (!a.isBoolean || a.value) {
      attr[a.name] =  (typeof a === 'object') ? a : ({ value: a });
    }    
  });

  if (attr.id === undefined) attr.id = { name: 'id', value: widget.name };

  const classes = (widget.classes || []);
  if (attr.class && attr.class.value.trim().length > 0) {
    attr.class.value.trim().split(/\s+/).forEach(k => classes.push(k));
  }
  if (classes.length > 0) {
    const classStr = Array.from(new Set(classes)).join(' ');
    attr.class = { name: 'class', value: classStr };
  }
  return attr;  
}

const TYPE_PREDICATES = {
  select: 'isSelect',
  textarea: 'isTextarea',
  radio: 'isCheckboxOrRadio',
  checkbox: 'isCheckboxOrRadio',
  interval: 'isInterval',
};


if (require.main === module) {
  const Mustache = require('./mustache');
  const mustache = new Mustache();

  const WIDGETS = [
    { name: 'input1',
      label: 'Input 1',
      classes: [ 'in1', 'in2' ],
      isRequired: true,
      val: 'value 1',
      errors: { input1: 'bad value error' },
    },

    { type: 'checkbox',
      name: 'cbox1',
      label: 'Checkbox 1',
      choices: {
	val1: 'Value 1',
	val2: 'Value 2',
	val3: 'Value 3',
      },
      val: [ 'val3', 'val2' ],
    },

    { type: 'radio',
      name: 'radio1',
      label: 'Radio 1',
      choices: {
	val1: 'Value 1',
	val2: 'Value 2',
	val3: 'Value 3',
      },
      val: 'val3',
    },

    { type: 'select',
      name: 'sel1',
      label: 'Select 1 widget',
      attr: [
	{ name: 'class', value: 'some-class class1', },
	{ name: 'disabled', isBoolean: true, value: true, },
      ],
      choices: {
	'': 'Select',
	val1: 'Value 1',
	val2: 'Value 2',
	val3: 'Value 3',
      },
      classes: [ 'tst-test1' ], 
      val: 'val2',
    },

    { type: 'interval',
      name: 'interval1',
      attr: [ { name: 'id', value: 'interval1-id', }, ],
      label: 'Min-Max Range',
      val: { min: 100.2, max: 127, },
      classes: [ 'interval' ],
    },
    
  ];
  for (const widget of WIDGETS) {
    const view = widgetView(widget, widget.val, widget.errors);
    console.log(mustache.render('widget', view));
  }
}
