var blessed = require('blessed'),
		contrib = require('blessed-contrib'),
		screen  = blessed.screen(),
		fs      = require('fs'),
		Tail	= require('always-tail'),
		server = require('./server');

module.exports = {
	createScreen: init
};

function init(file, options){

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

	var logoptions = { fg: "green"
	, selectedFg: "green"
	, label: 'Log file: ' + logfile};

	var mapoptions = {label: "Map"};
	var weboptions = {label: "Webserver", content: 'Webserver running on 127.0.0.1:3000'};

	var cols = 1;
	if(options.log && options.map)
		cols++;

	var grid = new contrib.grid({rows: 1, cols: cols});

	if(options.map && options.log) {
		grid.set(0,0,contrib.map,mapoptions);
		grid.set(0,1,contrib.log,logoptions);
	} else {
		if(options.map){
			grid.set(0,0,contrib.map,mapoptions);
		}
		if(options.log){
			grid.set(0,0,contrib.log,logoptions);
		}
	}

	grid.applyLayout(screen);

	if(options.log && !options.map)
		var log = grid.get(0,0);
	if(options.map && !options.log)
		var map = options.log ? grid.get(1,0) : grid.get(0,0);
	if(options.map && options.log) {
		var map = grid.get(0,0),
		log = grid.get(0,1);
	}

	if(options.web) {
		server.listen(3000, function(){
		  console.log('listening on *:3000');
		});

		server.on('mapserver.connection', function(){
			log.log('Web server got connection');
		});

		if(options.log) {
			log.log('Webserver running at 127.0.0.1:3000');
		}
	}

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

		if(options.web) {
			data.msg = str;
			server.emit('line', data);
		}
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
