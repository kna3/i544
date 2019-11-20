<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Search Sensor Types</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="page">
        <h1 class="tst-sensors-search-page">Search Sensor</h1>
        <form method="GET">
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
            <input type="submit" value="search">
        </div>
        </form>
    </div>
    {{#result}}
    <h2>Results Summary</h2>
    <table class="summary">
        <thead>
            <tr>
                <th>Sensor ID</th>
                <th>Model</th>
                <th>Period</th>
                <th colspan="2">Expected Range</th>
            </tr>
            <tr>
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
                    <td>{{id}}</td>
                    <td>{{model}}</td>
                    <td>{{period}}</td>
                    {{#expected}}
                        <td>{{min}}</td>
                        <td>{{max}}</td>
                    {{/expected}}
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