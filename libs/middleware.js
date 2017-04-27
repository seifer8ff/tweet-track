var configAuth 	= require("../config/auth"),
	User 		= require("../models/user"),
	Tweet 		= require("../models/tweet");

module.exports = function(io) {
	var middleware = {};

	middleware.streams = [];

	middleware.isLoggedIn = function(req, res, next) {
	    if (req.isAuthenticated()) {
	        return next();
	    }
	    res.redirect("/");
	}

	// create array of streams from db to 'stream' view based on current user's keywords
	middleware.buildDBStreams = function(req, res, next) {
		// end and delete old streams before rebuilding streams
		for (var i = 0; i < middleware.streams.length; i++) {
			middleware.streams[i].destroy();
		}
		middleware.streams.length = 0;

		// find current user, stream tweets from db based on user's keywords
		User.findById(req.user._id, function(err, foundUser) {
			if (err) {
				console.log(err);
			} else {
				console.log(foundUser.keywords);
				foundUser.keywords.forEach(function(keyword, index) {
					// add stream of particular keyword to array of streams
					middleware.streams[index] = Tweet.find({ $or: [{hashtags: new RegExp(keyword, "i")}, {body: new RegExp(keyword, "i")}] }).tailable(true, {awaitdata: true, numberOfRetries: 500, tailableRetryInterval : 1000}).stream();

					console.log("built stream " + index);

					// begin streaming
					middleware.streams[index].on("data", function(dbTweet) {
						io.emit("tweets" + index, dbTweet.body);
					});
					console.log("streaming: tweets" + index);

					middleware.streams[index].on("error", function(err) {
						throw error;
					});
				});
			}
		});

		return next();
	}

	return middleware;
}



