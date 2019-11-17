<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Search Sensor Types</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="page">
        <h1 class="tst-sensor-types-search-page">Search Sensor Types</h1>
        <form method="GET"> 
        {{#form}}
            {{{render}}}
         {{/form}}
        </form>
    </div>
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
        {{#result}}
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
        {{/result}}
    </table>
    {{>footer}}
</body>
</html>