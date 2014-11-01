var Browser = require('zombie'),
    assert = require('assert'),
    cheerio = require('cheerio'),
    async = require('async');

var options = {
    waitDuration: '30s',
    loadCSS: false,
    maxRedirects: 30
};

var waitTime = 15000;

// Wait until footer is loaded
function footerLoaded(window) {
    setTimeout(function() {
        return true;
    }, waitTime);
    //return window.document.querySelector("footer");
}

function login(username, password, callback) {
    var browser = Browser.create(options);
    browser.visit('https://www.capitalbikeshare.com/login', function(error) {
        browser
            .fill('username', username)
            .fill('password', password);

        browser
            .pressButton('login_submit', function(error2) {
                assert.ifError(error2);
                browser.wait(footerLoaded, function() {
                    callback(browser);
                });
            });
    });
}

function rentals(browser, callback) {
    var hreflocation = 'https://www.capitalbikeshare.com/member/rentals/';
    browser.location.href = hreflocation;
    browser.wait(footerLoaded, function() {
        callback(browser);
    });
}

function rentalPage(browser, page, callback) {
    var hreflocation = 'https://www.capitalbikeshare.com/member/rentals/' + String(parseInt(page));
    console.log('page', hreflocation);
    browser.location.href = hreflocation;
    browser.wait(footerLoaded, function() {
        console.log('calling back browser, loaded: ', browser.location.href);
        extractRentals(browser, function(rentaldata) {
            console.log('rentaldata length', rentaldata.length);
            callback(browser, rentaldata);
        });
    });
}

function extractRentals(browser, callback) {
    console.log('processing: ', browser.location.href);
    var data = [];
    $ = cheerio.load(browser.html());
    var rowNums = $('tr', $('tbody', $('table').eq(1)).eq(0)).length; //normally 20
    for (var j = 0; j <= rowNums; j++) {
        if (j === rowNums) {
            callback(data);
        } else {
            var rowobj = {
                'Start_Station': $('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(0).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, ' '),
                'Start_Date': $('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(1).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, ' '),
                'End_Station': $('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(2).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, ' '),
                'End_Date': $('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(3).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, ' '),
                'Duration': $('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(4).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, ' '),
            };
            rowobj.Cost = parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(5).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, '').replace('$', ''));
            if (isNaN(rowobj.Cost)) rowobj.Cost = 0.0;
            rowobj.Distance = parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(6).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', ''));
            if (isNaN(rowobj.Distance)) rowobj.Distance = 0.0;
            rowobj.Calories = parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(7).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', ''));
            if (isNaN(rowobj.Calories)) rowobj.Calories = 0.0;
            rowobj.CO2_Offset = parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(8).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', ''));
            if (isNaN(rowobj.CO2_Offset)) rowobj.CO2_Offset = 0.0;

            //console.log('rowobj', rowobj);
            data.push(rowobj);
        }
    }
}

function reduceRentals(allrentals, requestedsize, callback) {
    console.log('allrentals.length', allrentals.length, '-', requestedsize);
    if (allrentals.length == requestedsize) {
        callback(allrentals);
    } else {
        if (allrentals.length < requestedsize) {
            console.log('error... request is bigger than what we have');
            callback(allrentals);
        } else {
            callback(allrentals.splice(0, requestedsize));
        }
    }
}

function getXRentals(browser, rentalSize, callback) {
    var rentalPages = Math.ceil(rentalSize / 20.0);
    console.log('rental pages:', rentalPages);

    var k = [];
    for (var j = 0; j < rentalPages; j++) {
        k.push(j * 20);
    }
    async.concatSeries(k, function(item, cb) {
        if (item === 0) {
            extractRentals(browser, function(rentaldata) {
                console.log('rentaldata length', rentaldata.length);
                cb(null, rentaldata);
            });
        } else {
            rentalPage(browser, item, function(browser, rentaldata) {
                cb(null, rentaldata);
            });
        }
    }, function(err, results) {
        if (err) console.log('err', err);
        console.log('results length', results.length);
        reduceRentals(results, rentalSize, function(data){
            browser.close();
            callback(data);
        });
    });
}

exports.getMemberProfile = function(username, password, callback) {
    login(username, password, function(browser) {

        $ = cheerio.load(browser.html());
        //var table = [], j;
        //console.log($('table.member-profile').length);

        var profile = {};

        $('table.member-profile').each(function(i, tabelem) {
            $('tbody', tabelem[i]).each(function(j, tbodyelem) {
                $('tr', tbodyelem[j]).each(function(k, rowelem) {
                    var td = $('td', this).text();
                    td = td.toString().replace(/\t/g, '');
                    td = td.replace('\n', '');
                    td = td.replace(/[\s\n\r]+/g, ' ');
                    profile[$('th', this).text()] = td;
                });
            });
        });
        callback(profile);
        browser.close();
    });
};

exports.getTotalRentals = function(username, password, callback) {
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            callback(rentalNum);
            browser.close();
        });
    });
};

exports.getAllRentals = function(username, password, callback) {
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalSize = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            getXRentals(browser, rentalSize, callback);
        });
    });
};

exports.getRentalsSinceTotal = function(username, password, previoustotal, callback) {
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            if (previoustotal >= rentalNum) {
                console.log('previous >= existing');
                callback(null);
            } else {
                var rentalSize = rentalNum - previoustotal;

                getXRentals(browser, rentalSize, callback);
            }
        });
    });
};

var getLastXRentals = function(username, password, numberofrentals, callback) {
    var allrentals = [];
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            if (numberofrentals >= rentalNum) {
                console.log('requesting more rentals than available');
                callback(null);
            } else {
                var rentalSize = numberofrentals;
                getXRentals(browser, rentalSize, callback);
            }
        });
    });
};

exports.getLastXRentals = function(username, password, numberofrentals, callback) {
    getLastXRentals(username, password, numberofrentals, callback);
};

exports.getRentalStats = function(data, callback) {
    var count = 0;
    var statdata = {
        numberofrentals: data.length,
        Distance: 0,
        CO2_Offset: 0,
        Cost: 0,
        Calories: 0
    };
    async.whilst(function() {
        return count < data.length;
    }, function(cb) {
        statdata.Distance += parseFloat(data[count].Distance);
        statdata.CO2_Offset += parseFloat(data[count].CO2_Offset);
        statdata.Cost += parseFloat(data[count].Cost);
        statdata.Calories += parseFloat(data[count].Calories);
        count++;
        cb();
    }, function(err) {
        if (err) console.log('err', err);
        callback(statdata);
    });
};
