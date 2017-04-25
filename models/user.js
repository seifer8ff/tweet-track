var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
	twitter: {
		id: String,
		token: String,
		displayName: String,
		userName: String
	},
	keywords: [String]
});

module.exports = mongoose.model("user", userSchema);