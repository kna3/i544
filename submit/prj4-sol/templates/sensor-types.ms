<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Search Sensor Types</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="page">
        {{#search}}
            <h1 class="tst-sensor-types-search-page">Search Sensor Types</h1>
        {{/search}}
        {{#add}}
            <h1 class="tst-sensor-types-add-page">Create / Update Sensor Types </h1>
        {{/add}}
        <form method={{method}}> 
        {{#error}}
            <p></p>
            <ul>
                <li class="error">{{error}}</li>
            </ul>
        {{/error}}
        {{#form}}
            {{{render}}}
        {{/form}}
        <label for=" "></label>
        <div>
            {{#add}}
                <input type="submit" value="add">
            {{/add}}
            {{#search}}
                <input type="submit" value="search">
            {{/search}}
        </div>
        </form>
    </div>
    {{#result}}
    <h2>Results Summary</h2>
    <table class="summary">
        
        <thead>
            <tr>
                <th>Manufacturer</th>
                <th>Sensor Type ID</th>
                <th>Model Number</th>
                <th>Measure</th>
                <th colspan="2">Limits</th>
            </tr>
            <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>Min</th>
                <th>Max</th>
            </tr>
        </thead>
        {{#result.data}}
            <tbody>
                <tr>
                    <td>{{manufacturer}}</td>
                    <td>{{id}}</td>
                    <td>{{modelNumber}}</td>
                    <td>{{quantity}}</td>
                    {{#limits}}
                        <td>{{min}}</td>
                        <td>{{max}}</td>
                    {{/limits}}
                </tr>
            </tbody>
        {{/result.data}}
    </table>
    {{/result}}
    <div class="scroll">
        {{#prev}}
            <a class="tst-prev" href={{prev}} rel="prev"><<</a>
        {{/prev}}
        {{#next}}
            <a class="tst-next" href={{next}} rel="next">>></a>
        {{/next}}
    </div>
    {{>footer}}
</body>
</html>