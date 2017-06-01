var configAuth 	= require("../config/auth"),
	User 		= require("../models/user"),
	Tweet 		= require("../models/tweet"),
	twitter 	= require('twitter');

var stream = {};

stream.queryString = "";

stream.tweetStream = undefined;

stream.twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: configAuth.twitter.consumerKey,
    consumer_secret: configAuth.twitter.consumerSecret,
    access_token_key: configAuth.twitter.accessTokenKey,
    access_token_secret: configAuth.twitter.accessTokenSecret
});


// create the string used to query twitter based on all users' keywords
stream.buildQueryString = function(callback) {
	var newQueryString = "food,";

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

		stream.queryString = newQueryString;

		if (callback && typeof callback === "function") {
			callback();
		};
	});
}

// create stream from twitter to the db based on all users' keywords
stream.buildTwitterStream = function(callback) {
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
		throw error;
	});

	if (callback && typeof callback === "function") {
		callback();
	};
}

module.exports = stream;
