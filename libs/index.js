
module.exports = function(io) {

	var utils = {};

	utils.middleware = require("./middleware")(io);
	utils.stream = require("./stream");


	utils.validateInput = function(input) {
		if (!input) {
			return false;
		}

		// sanitize string (removes accents, spaces, special characters)
		var cleanInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
		cleanInput = cleanInput.replace(/[^\w]/gi, '')
		cleanInput = cleanInput.toLowerCase();

		if (cleanInput === "") {
			return false;
		}

		return cleanInput;
	}



	return utils;

}


