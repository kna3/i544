<label for="{{id}}">
  {{label}}{{#isRequired}} *{{/isRequired}}
</label>
<div>
{{#isSelect}}
  <select name="{{name}}"
    {{#attr}} {{name}}{{^isBoolean}}="{{value}}"{{/isBoolean}}{{/attr}}>
    {{#choices}}
      <option value="{{value}}"{{#isChosen}} selected{{/isChosen}}>
        {{label}}
      </option>
    {{/choices}}
  </select>
{{/isSelect}}
{{#isCheckboxOrRadio}}
  <fieldset{{#attr}} {{name}}{{^isBoolean}}="{{value}}"{{/isBoolean}}{{/attr}}>
  {{#choices}}
      <input type="{{type}}" name="{{name}}" value="{{value}}" id="{{id}}"
             {{#isChosen}} checked{{/isChosen}}>
      <label for="{{id}}">{{label}}</label>
  {{/choices}}
  </fieldset>
{{/isCheckboxOrRadio}}
{{#isTextarea}}
  <textarea name="{{name}}"
    {{#attr}} {{name}}={{^isBoolean}}"{{value}}"{{/isBoolean}}{{/attr}}>
  {{value}}
  </textarea>
{{/isTextarea}}
{{#isInterval}}
  <div{{#attr}} {{name}}{{^isBoolean}}="{{value}}"{{/isBoolean}}{{/attr}}>
    <label for="{{id}}-min">Min</label>
    <div><input name="{{name}}[min]" id="{{name}}-min" value="{{value.min}}"
           class="tst-{{name}}-min numeric"></div>
    <label for="{{id}}-max">Max</label>
    <div><input name="{{name}}[max]" id="{{name}}-max" value="{{value.max}}"
           class="tst-{{name}}-max numeric"></div>
  </div>
{{/isInterval}}
{{#isOther}}
  <input name="{{name}}" type="{{type}}" value="{{value}}"{{#attr}} 
         {{name}}{{^isBoolean}}="{{value}}"{{/isBoolean}}{{/attr}}>
{{/isOther}}
{{#error}}<div class="error">{{error}}</div>{{/error}}
</div>
