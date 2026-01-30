/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 79.71428571428571, "KoPercent": 20.285714285714285};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.42857142857142855, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.904, 500, 1500, "API-PERF-001: Health Check"], "isController": false}, {"data": [0.91, 500, 1500, "API-PERF-002: Model Status"], "isController": false}, {"data": [0.0, 500, 1500, "STRESS-001: Concurrent Email Scans"], "isController": false}, {"data": [0.983, 500, 1500, "STRESS-002: Rapid Health Checks"], "isController": false}, {"data": [0.203, 500, 1500, "API-PERF-005: Get Languages"], "isController": false}, {"data": [0.0, 500, 1500, "API-PERF-004: Legitimate Email Scan"], "isController": false}, {"data": [0.0, 500, 1500, "API-PERF-003: Public Email Scan"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 3500, 710, 20.285714285714285, 1930.0059999999992, 2, 12866, 1308.5, 4491.400000000001, 5078.0, 8776.639999999992, 26.613540969645356, 35.42289035411217, 6.323493174577225], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["API-PERF-001: Health Check", 500, 34, 6.8, 176.49799999999988, 3, 5417, 45.0, 354.90000000000003, 538.8499999999999, 3734.150000000005, 3.870897816039452, 1.496132247288436, 0.6587708617199173], "isController": false}, {"data": ["API-PERF-002: Model Status", 500, 32, 6.4, 153.1480000000001, 2, 5514, 37.0, 337.7000000000001, 522.6499999999999, 857.9100000000001, 3.871707113100308, 3.515018533377987, 0.6759456160660359], "isController": false}, {"data": ["STRESS-001: Concurrent Email Scans", 500, 0, 0.0, 4419.529999999997, 2413, 10374, 4162.0, 5476.600000000002, 6719.899999999997, 9919.010000000002, 6.465461504642202, 4.274465609402074, 1.994695897018129], "isController": false}, {"data": ["STRESS-002: Rapid Health Checks", 500, 0, 0.0, 129.28799999999993, 4, 826, 80.5, 288.80000000000007, 403.79999999999995, 757.7300000000002, 6.920415224913495, 1.7165873702422145, 1.2502703287197232], "isController": false}, {"data": ["API-PERF-005: Get Languages", 500, 77, 15.4, 1457.9539999999997, 2, 8832, 1444.5, 2108.6000000000004, 2256.3999999999996, 7645.460000000001, 4.3298665535128205, 18.200839304038897, 0.6725162261749092], "isController": false}, {"data": ["API-PERF-004: Legitimate Email Scan", 500, 67, 13.4, 3499.860000000001, 2, 12866, 3520.5, 4820.8, 6301.0999999999985, 9143.66, 3.986827521867749, 3.633510506287227, 1.3183239451851085], "isController": false}, {"data": ["API-PERF-003: Public Email Scan", 500, 500, 100.0, 3673.7639999999988, 2, 11265, 3610.0, 5146.300000000002, 6401.099999999999, 9476.610000000002, 3.872576735108006, 7.739669841050088, 1.3294132368545384], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["The operation lasted too long: It took 3,155 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, 0.14084507042253522, 0.02857142857142857], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 49, 6.901408450704225, 1.4], "isController": false}, {"data": ["The operation lasted too long: It took 3,740 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, 0.14084507042253522, 0.02857142857142857], "isController": false}, {"data": ["The operation lasted too long: It took 4,241 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, 0.14084507042253522, 0.02857142857142857], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 203, 28.591549295774648, 5.8], "isController": false}, {"data": ["The operation lasted too long: It took 5,377 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, 0.14084507042253522, 0.02857142857142857], "isController": false}, {"data": ["The operation lasted too long: It took 4,818 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, 0.14084507042253522, 0.02857142857142857], "isController": false}, {"data": ["Test failed: text expected to contain /prediction/", 453, 63.80281690140845, 12.942857142857143], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 3500, 710, "Test failed: text expected to contain /prediction/", 453, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 203, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 49, "The operation lasted too long: It took 3,155 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, "The operation lasted too long: It took 3,740 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["API-PERF-001: Health Check", 500, 34, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 28, "The operation lasted too long: It took 3,155 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 1, "The operation lasted too long: It took 3,740 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1, "The operation lasted too long: It took 4,241 milliseconds, but should not have lasted longer than 3,000 milliseconds.", 1], "isController": false}, {"data": ["API-PERF-002: Model Status", 500, 32, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 29, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 3, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["API-PERF-005: Get Languages", 500, 77, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 67, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 10, "", "", "", "", "", ""], "isController": false}, {"data": ["API-PERF-004: Legitimate Email Scan", 500, 67, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 47, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 20, "", "", "", "", "", ""], "isController": false}, {"data": ["API-PERF-003: Public Email Scan", 500, 500, "Test failed: text expected to contain /prediction/", 453, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:5000 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Connection refused: no further information", 32, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Connection reset", 15, "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
