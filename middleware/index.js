var configAuth 	= require("../config/auth"),
	User 		= require("../models/user"),
	Tweet 		= require("../models/tweet"),
	twitter 	= require('twitter');

module.exports = function(io) {

	var middleware = {};

	var twit = new twitter({
		// api keys are defined in a config file- excluded from github for privacy
	    consumer_key: configAuth.twitter.consumerKey,
	    consumer_secret: configAuth.twitter.consumerSecret,
	    access_token_key: configAuth.twitter.accessTokenKey,
	    access_token_secret: configAuth.twitter.accessTokenSecret
	});

	middleware.isLoggedIn = function(req, res, next) {
	    if (req.isAuthenticated()) {
	        return next();
	    }
	    res.redirect("/");
	}

	// create the string used to query twitter based on all users' keywords
	middleware.buildQueryString = function(req, res, next) {
		var newQueryString = "javascript,";

		// create stream of all users in DB
		var cursor = User.find().cursor();

		// for each user add their keywords to the query string
		cursor.on("data", function(user) {
			user.keywords.forEach(function(keyword) {
				// do not add duplicate keywords to the query string
				if (!newQueryString.includes(keyword)) {
					newQueryString += keyword + ",";
				}
			});
		});
		// return the new query string
		cursor.on('close', function() {
			newQueryString = newQueryString.replace(/,\s*$/, "");

			res.locals.queryString = newQueryString;
			return next();
		});
	}

	// create stream from twitter to the db based on all users' keywords
	middleware.buildTwitterStream = function(req, res, next) {
		// stream tweets that match the query string
		var tweetStream = twit.stream('statuses/filter', { track: res.locals.queryString });

		// stream tweets from twitter to the database
		tweetStream.on('data', function(tweet) {
			// check that tweet has required fields for saving to db
			if (tweet && tweet.user && tweet.text && tweet.created_at) {
				var newTweet = {
					name: tweet.user["screen_name"],
					body: tweet.text,
					time: tweet.created_at,
					hashtags: []
				}
				// if tweet has hashtags, save those as well
				if (tweet.entities && tweet.entities.hashtags.length > 0) {
					newTweet.hashtags = tweet.entities.hashtags.map(function(hashtag) { return hashtag["text"]});
				}
				// add tweet to database
				Tweet.create(newTweet, function(err, newTweet) {
					if (err) {
						console.log(err);
					}
				});
			}
		});

		tweetStream.on('error', function(error) {
			throw error;
		});

		return next();
	}

	// create array of streams from db to 'stream' view based on current user's keywords
	middleware.buildDBStreams = function(req, res, next) {
		// end and delete old streams before rebuilding streams
		for (var i = 0; i < res.locals.streams.length; i++) {
			res.locals.streams[i].destroy();
		}
		res.locals.streams.length = 0;

		// find current user, stream tweets from db based on user's keywords
		User.findById(req.user._id, function(err, foundUser) {
			if (err) {
				console.log(err);
			} else {
				console.log(foundUser.keywords);
				foundUser.keywords.forEach(function(keyword, index) {
					// add stream of particular keyword to array of streams
					res.locals.streams[index] = Tweet.find({ $or: [{hashtags: new RegExp(keyword, "i")}, {body: new RegExp(keyword, "i")}] }).tailable(true, {awaitdata: true, numberOfRetries: 500, tailableRetryInterval : 1000}).stream();

					console.log("built stream " + index);

					// begin streaming
					res.locals.streams[index].on("data", function(dbTweet) {
						io.emit("tweets" + index, dbTweet.body);
					});
					console.log("streaming: tweets" + index);

					res.locals.streams[index].on("error", function(err) {
						throw error;
					});
				});
			}
		});

		return next();
	}

	return middleware;
}





