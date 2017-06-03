var configAuth 	= require("../config/auth"),
	User 		= require("../models/user"),
	Tweet 		= require("../models/tweet"),
	twitter 	= require('twitter');

var stream = {};

stream.queryString = "";
stream.tweetStream = undefined;
stream.lastBuilt = 0;

stream.twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: configAuth.twitter.consumerKey,
    consumer_secret: configAuth.twitter.consumerSecret,
    access_token_key: configAuth.twitter.accessTokenKey,
    access_token_secret: configAuth.twitter.accessTokenSecret
});


// create the string used to query twitter based on all users' keywords
stream.buildQueryString = function(callback) {
	var newQueryString = "me,";

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

		console.log("query string= " + newQueryString);

		stream.queryString = newQueryString;

		if (callback && typeof callback === "function") {
			callback();
		};
	});
}

// create stream from twitter to the db based on all users' keywords
stream.buildTwitterStream = function(callback) {
	// get latest query string (and ensure we always have the default keyword for the splash page)
	stream.buildQueryString(function() {
		// stream tweets that match the query string
		stream.tweetStream = stream.twit.stream('statuses/filter', { track: stream.queryString });

		// stream tweets from twitter to the database
		stream.tweetStream.on('data', function(tweet) {
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

		stream.tweetStream.on('error', function(error) {
			// if an error is returned here, it's most likely a status code of 420 (too many attempts);
			console.log(error);
		});

		if (callback && typeof callback === "function") {
			callback();
		};
	});
	
}

stream.destroyTwitterStream = function(callback) {
	if (stream.tweetStream) {
		stream.tweetStream.destroy();
		stream.tweetStream = undefined;
		console.log("destroyed tweet stream");
	}

	if (callback && typeof callback === "function") {
		callback();
	};
}

stream.restartTwitterStream = function(callback) {
	var time = Date.now();
	console.log("time= " + time);
	console.log("time last built= " + stream.lastBuilt);
	console.log("diff= " + (time - stream.lastBuilt));

	if (time - stream.lastBuilt >= 1800000) {
		console.log("passed time check");
		var currentQueryString = stream.queryString;

		stream.buildQueryString(function() {
			// if new keywords have been added, destroy the stream and rebuild it
			if (currentQueryString !== stream.queryString) {
				stream.destroyTwitterStream(function() {
					stream.buildTwitterStream(function() {
						console.log("restarted twitter stream");
						// update the last built time for the next time this runs
						stream.lastBuilt = time;
					});
				});
			}
		});
	}
}

module.exports = stream;
