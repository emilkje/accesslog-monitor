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

	var EventEmitter = require('events').EventEmitter;
	var app = new EventEmitter;

	if(options.web) {
		server.listen(3000, function(){
			if(options.log) {
				log.log('Webserver running at 127.0.0.1:3000');
			}
		});

		app.on('data', function(data){
			server.emit('line', data);
		});

		if(options.log) {
			server.on('mapserver.connection', function(){
				log.log('[web view got connection]');
			});
		}
	}

	var geostream = new require('./Ip2Geo').Stream();

	if(options.log) {
		app.on('data', function(data){
			var host = data.host;
			var country = data.country || 'unknown country';
			var region = data.region || 'unknown region';
			var city = data.city || 'unknown city';
			var metro = data.metro || 'unknown metro';
			var lon = data.ll[0];
			var lat = data.ll[1];

			var geostring = country + ', ' + region + ' - ' + city;
			log.log(host + ' got a visit from ' + geostring);
			screen.render();
		});
	}

	if(options.map) {
		app.on('data', function(data){
			var lon = data.ll[0];
			var lat = data.ll[1];
			map.addMarker({"lon": lon, "lat": lat});
			screen.render();
		});
	}

	var buffer = [];

	tail.on('line', function(line){
		var ip = line.split(' ')[1];
		var host = line.split(' ')[0].split(":")[0];

		if(buffer.length && buffer[buffer.length-1].ip == ip) {
			return;
		}

		var entry = buffer.filter(function(entry){ return entry.ip === ip})[0];
		
		if(entry) {
			app.emit('data', entry);
			delete buffer[entry];
			buffer.push(entry);
			return;
		}

		geostream.once('data', function(data){
			data.host = host;
			data.ip = ip;
			buffer.push(data);
			app.emit('data', data);
		});

		geostream.write(ip);
	});

	screen.render();
}
