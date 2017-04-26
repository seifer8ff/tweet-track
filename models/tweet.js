var mongoose = require("mongoose");

var tweetSchema = new mongoose.Schema({
	name: 		String,
	body: 		String,
	time: 		String,
	hashtags: 	[String]
}, 
{
	// capped databases have a max size and can listen for changes
	capped: {size: 5242880, max: 10000, autoIndexId: true}
});

module.exports = mongoose.model("tweet", tweetSchema);