var config = require('./config.js'),
	bs = require('./index.js');

/*
bs.getMemberProfile(config.username,config.password,function(data){
	console.log('data',data);
});

bs.getTotalRentals(config.username,config.password,function(data){
	console.log('data',data);
});

bs.getAllRentals(config.username, config.password, function(data){
	console.log('data length:',data.length);
	bs.getRentalStats(data,function(statdata) {
		console.log('stats: ',statdata);
	});
});

var previousrentalnum = 300; //for testing I had over 300 rentals, wanted to make a smaller number
bs.getRentalsSinceTotal(config.username, config.password, previousrentalnum, function(data){
	console.log('rentals since length:',data.length);
	//should be allrentals.length - previousrentalnum ~44 at time of testing
	
	bs.getRentalStats(data,function(statdata) {
		console.log('stats: ',statdata);
	});
});
*/

bs.getLastXRentals(config.username, config.password, 15, function(data){
	console.log('rentals:',data);
	//data.length should be 15
	/*
	bs.getRentalStats(data,function(statdata) {
		console.log('stats: ',statdata);
	});
*/
});