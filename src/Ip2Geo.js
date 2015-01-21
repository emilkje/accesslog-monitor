var stream = require('stream'),
	fs = require('fs'),
	geoip = require('geoip-lite'),
	util = require('util');

var Transform = stream.Transform;
util.inherits(Ip2Geo, Transform);

function Ip2Geo(opt) {
	if(!(this instanceof Ip2Geo))
		return new Ip2Geo(opt);

	Transform.call(this, opt);
	this._inBody = false;
	this._sawFirstCr = false;
	this._rawHeader = [];
	this.header = null;
}

Ip2Geo.prototype._transform = function(data, enc, done){

	if(typeof data == 'object')
		data = data.toString('utf-8');

	var geo = geoip.lookup(data);

	this.emit('data', geo);
	done();
};

module.exports = {Stream: Ip2Geo};
