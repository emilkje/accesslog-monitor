var blessed = require('blessed'),
contrib = require('blessed-contrib'),
screen  = blessed.screen(),
fs      = require('fs');
Tail	= require('always-tail');

module.exports = {
	createScreen: init
};

function init(file){

	var logfile = file || process.env['FILE'] || __dirname+"/access.log";
	if(!fs.existsSync(logfile)) {
		console.log('Logfile ('+logfile+') does not exist.');
		process.exit(1);
	}
	var size = fs.statSync(logfile).size;

	var tail = new Tail(logfile, '\n', {start: size});

	screen.key(['escape', 'q', 'C-c'], function(ch, key) {
		return process.exit(0);
	});

	var grid = new contrib.grid({rows: 2, cols: 1});

	grid.set(0, 0, contrib.log,
	  { fg: "green"
	  , selectedFg: "green"
	  , label: 'Log file: ' + logfile})

	grid.set(1,0, contrib.map, {label: "Map"});

	grid.applyLayout(screen);

	var log = grid.get(0,0);
	var map = grid.get(1,0);

	var geostream = new require('./Ip2Geo').Stream();

	geostream.on('data', function(data){
		var country = data.country || 'unknown country';
		var region = data.region || 'unknown region';
		var city = data.city || 'unknown city';
		var metro = data.metro || 'unknown metro';
		var lon = data.ll[0];
		var lat = data.ll[1];

		var str = country + ', ' + region + ' - ' + city;
		this.emit('string', str);
		map.addMarker({"lon": lon, "lat": lat});
		screen.render();
	});

	var buffer = [];

	tail.on('line', function(line){
		var ip = line.split(' ')[1];
		if(buffer.length && buffer[buffer.length-1] == ip)
			return;

		buffer.push(ip);

		geostream.once('string', function(str){
			log.log(line.split(' ')[0].split(":")[0] + ' got a visit from ' + str);
			screen.render();
		});
		geostream.write(ip);
	});

	screen.render();
}
