var Browser = require('zombie');
var assert = require('assert');
var cheerio = require('cheerio');

var options = {
    waitDuration: '15s',
    loadCSS: false,
    maxRedirects: 30
};

// Wait until footer is loaded
function footerLoaded(window) {
    return window.document.querySelector("footer");
}

function login(username, password, callback) {
    var browser = Browser.create(options);
    browser.visit('https://www.capitalbikeshare.com/login', function(error) {
        /*
        browser.on('loaded', function(loadedbrowser) {
            console.log('loaded: ', loadedbrowser.location.href);
        });
*/
        //console.log(browser.errors);
        //console.log('title orig', browser.html('title'));
        //console.log('status orig', browser.statusCode);
        browser
            .fill('username', username)
            .fill('password', password);

        browser
            .pressButton('login_submit', function(error2) {
                assert.ifError(error2);
                browser.wait(footerLoaded, function() {
                    //console.log('title', browser.html('title'));
                    //console.log('current path:', browser.location.href);
                    callback(browser);
                });
            });
    });
}

function rentals(browser, callback) {
    browser.clickLink('Rentals', function(error) {
        browser.wait(footerLoaded, function() {
            callback(browser);
        });
    });
}

function rentalPage(browser, page, callback) {
    browser.location.href = 'https://www.capitalbikeshare.com/member/rentals/'+page;
    browser.wait(footerLoaded, function() {
        callback(browser);
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
    });
};

exports.getTotalRentals = function(username, password, callback) {
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = browser.text('h1').substring(rentalNumStart+1,rentalNumLength);
            console.log('rN',rentalNum);
            //console.log(browser.text('h1'));
            //console.log(rentalNumStart,rentalNumLength,rentalNum);

            callback(parseInt(rentalNum));
            //console.log('html', browser.html('h1')); //the number in paranthesis is the total number of rentals, make a function for it
            //var tables = browser.querySelectorAll('table');
            //console.log('number of tables', tables.length);
            //for (var j = 0; j < tables.length; j++) {
                //console.log('table - ' + j + ': ' + tables[j]);
            //}
            //console.log('html',browser.queryAll('table'));
        });
    });
};

exports.getAllRentals = function(username, password, callback) {
    var rentals = [];
    login(username, password, function(loginbrowser) {
        rentals(loginbrowser, function(browser) {
            var rentalNumStart = browser.text('h1').indexOf('(');
            var rentalNumLength = browser.text('h1').indexOf(')');
            var rentalNum = browser.text('h1').substring(rentalNumStart+1,rentalNumLength);
            console.log(rentalNum);
            //console.log(browser.text('h1'));
            //console.log(rentalNumStart,rentalNumLength,rentalNum);

            callback(parseInt(rentalNum));
            //console.log('html', browser.html('h1')); //the number in paranthesis is the total number of rentals, make a function for it
            //var tables = browser.querySelectorAll('table');
            //console.log('number of tables', tables.length);
            //for (var j = 0; j < tables.length; j++) {
                //console.log('table - ' + j + ': ' + tables[j]);
            //}
            //console.log('html',browser.queryAll('table'));
        });
    });
};