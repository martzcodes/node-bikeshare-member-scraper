var config = require('./config.js'),
	bs = require('./index.js');

/*
bs.getMemberProfile(config.username,config.password,function(data){
	console.log('data',data);
});

bs.getTotalRentals(config.username,config.password,function(data){
	console.log('data',data);
});
*/

bs.getAllRentals(config.username, config.password, function(data){
	console.log('data length:',data.length);
});