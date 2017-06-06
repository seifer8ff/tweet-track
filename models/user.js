var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({
	twitter: {
		id: 			String,
		profileImage: 	String,
		displayName: 	String,
		userName: 		String
	},
	keywords: {type: [String], default: ["me"]}
});

module.exports = mongoose.model("user", userSchema);