
module.exports = function(io) {

	var utils = {};

	utils.middleware = require("./middleware")(io);
	utils.stream = require("./stream");

	return utils;

}


