var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http),
		path = require('path');

app.get('/', function(req, res){
  res.sendFile(path.resolve(__dirname+'/../public/index.html'));
});

io.on('connection', function(socket){
  http.emit('mapserver.connection', {});
});

http.on('line', function(data){
	io.emit('line', data);
});

module.exports = http;