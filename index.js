var Browser = require('zombie'),
    assert = require('assert'),
    cheerio = require('cheerio'),
    async = require('async');

var options = {
    waitDuration: '15s',
    loadCSS: false,
    maxRedirects: 30
};

var waitTime = 10000;

// Wait until footer is loaded
function footerLoaded(window) {
    return window.document.querySelector("footer");
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
    browser.clickLink('Rentals', function(error) {
        browser.wait(waitTime, function() {
            callback(browser);
        });
    });
}

function rentalPage(browser, page, callback) {
    var hreflocation = 'https://www.capitalbikeshare.com/member/rentals/' + String(parseInt(page));
    console.log('page', hreflocation);
    browser.location.href = hreflocation;
    browser.wait(waitTime, function() {
        console.log('calling back browser, loaded: ', browser.location.href);
        callback(browser);
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
                'Cost': parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(5).text().toString().replace(/\t/g, '').replace('\n', '').replace(/[\s\n\r]+/g, '').replace('$', '')),
                'Distance': parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(6).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', '')),
                'Calories': parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(7).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', '')),
                'CO2_Offset': parseFloat($('td', $('tr', $('tbody', $('table').eq(1)).eq(0)).eq(j)).eq(8).text().toString().replace(/\t/g, '').replace('\n', '').replace(' ', ''))
            };
            //console.log('rowobj', rowobj);
            data.push(rowobj);
        }
    }
}

function compileRentals(rentaldata, allrentals, callback) {
    async.concatSeries([allrentals,rentaldata],function(item,cb){
        cb(null,item);
    },function(err,results){
        callback(results);
    }]);
}

function reduceRentals(allrentals, requestedsize, callback) {
    if (allrentals.length == requestedsize) {
        callback(allrentals);
    } else {
        async.whilst(function(){ return allrentals.length > requestedsize }, function(cb){
            allrentals.pop()
        },function(err){
            if (err) console.log('err',err);
            callback(allrentals);
        });
    }
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
    });
};

exports.getTotalRentals = function(username, password, callback) {
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            callback(rentalNum);
        });
    });
};

exports.getAllRentals = function(username, password, callback) {
    var allrentals = [];
    
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = parseInt(browser.text('h1').substring(rentalNumStart + 1, rentalNumLength));

            var rentalPages = Math.ceil(rentalNum / 20.0);
            console.log('rental pages:', rentalPages);

            extractRentals(browser, function(rentaldata) {
                compileRentals(rentaldata, allrentals, function(){
                    var j = 1;
                    async.whilst(function(){ return j === (rentalPages-1); },function(cb) {
                        console.log('page :', j, ' out of ', rentalPages);
                        rentalPage(browser, j * 20, function(pagebrowser) {
                            browser = pagebrowser;
                            extractRentals(pagebrowser, function(newrentaldata) {
                                compileRentals(newrentaldata,allrentals, function(){
                                    console.log('compiled rental length:', allrentals.length);
                                    j++;
                                    cb();
                                });
                            });
                        });
                    },
                    function(err) {
                        if (err) console.log('err',err);
                        callback(allrentals);
                    });
                });
            });
        });
    });
};

exports.getRentalsSinceTotal = function(username, password, previoustotal, callback) {
    var allrentals = [];
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
                var rentalPages = Math.ceil(rentalSize / 20.0);
                console.log('rental pages:', rentalPages);

                extractRentals(browser, function(rentaldata) {
                    compileRentals(rentaldata, allrentals, function(){
                        if (rentalPages === 1) {
                            reducerentals(allrentals,rentalSize,callback);
                        } else {
                            var j = 1;
                            async.whilst(function(){ return j === (rentalPages-1); },function(cb) {
                                console.log('page :', j, ' out of ', rentalPages);
                                rentalPage(browser, j * 20, function(pagebrowser) {
                                    browser = pagebrowser;
                                    extractRentals(pagebrowser, function(newrentaldata) {
                                        compileRentals(newrentaldata, allrentals, function(){
                                            console.log('compiled rental length:', allrentals.length);
                                            j++;
                                            cb();
                                        });
                                    });
                                });
                            },
                            function(err) {
                                if (err) console.log('err',err);
                                reducerentals(allrentals,rentalSize,callback);
                            });
                        }
                    });
                });
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
                var rentalPages = Math.ceil(rentalSize / 20.0);
                console.log('rental pages:', rentalPages);

                extractRentals(browser, function(rentaldata) {
                    compileRentals(rentaldata, allrentals, function(){
                        if (rentalPages === 1) {
                            reducerentals(allrentals,rentalSize,callback);
                        } else {
                            var j = 1;
                            async.whilst(function(){ return j === (rentalPages-1); },function(cb) {
                                console.log('page :', j, ' out of ', rentalPages);
                                rentalPage(browser, j * 20, function(pagebrowser) {
                                    browser = pagebrowser;
                                    extractRentals(pagebrowser, function(newrentaldata) {
                                        compileRentals(newrentaldata, allrentals, function(){
                                            console.log('compiled rental length:', allrentals.length);
                                            j++;
                                            cb();
                                        });
                                    });
                                });
                            },
                            function(err) {
                                if (err) console.log('err',err);
                                reducerentals(allrentals,rentalSize,callback);
                            });
                        }
                    });
                });
            }
        });
    });
}

exports.getLastXRentals = function(username, password, numberofrentals, callback) {
    getLastXRentals(username, password, numberofrentals, callback);
};

exports.getRentalStats = function(data,callback) {
    var count = 0;
    var statdata = {
        numberofrentals: data.length,
        Distance: 0,
        CO2_Offset: 0,
        Cost: 0,
        Calories: 0
    };
    async.whilst(function(){ return count < data.length; },function(cb) {
        statdata.Distance += data[count].Distance;
        statdata.CO2_Offset += data[count].CO2_Offset;
        statdata.Cost += data[count].Cost;
        statdata.Calories += data[count].Calories;
        count++;
        cb();
    },function(err){
        if (err) console.log('err',err);
        callback(statdata);
    });
};