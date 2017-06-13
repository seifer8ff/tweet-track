var auth 		= require("../auth/auth"),
	User 		= require("../models/user"),
	Tweet 		= require("../models/tweet"),
	twitter 	= require('twitter');

var stream = {};

stream.queryString = "";
stream.tweetStream = undefined;
stream.lastBuilt = 0;
stream.timeout = 60000;
stream.timer;

stream.twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: auth.twitter.consumerKey,
    consumer_secret: auth.twitter.consumerSecret,
    access_token_key: auth.twitter.accessTokenKey,
    access_token_secret: auth.twitter.accessTokenSecret
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

		// if error, end the stream + start attempting to reconnect. Each failed reconnect attempt doubles the wait time
		stream.tweetStream.on('error', function(error) {
			console.log(error);
	        stream.destroyTwitterStream(function() {
	        	stream.reconnectTwitterStream(function() {
	        		stream.timeout *= 2;
	        	});
	        });
		});

		// if stream ended, start attempting to reconnect
		stream.tweetStream.on('end', function(res) {
			console.log(res);
	        stream.destroyTwitterStream(function() {
	        	stream.reconnectTwitterStream(function() {
	        		stream.timeout *= 2;
	        	});
	        });
		});

		// save last build time for rebuilding stream purposes
		var time = Date.now();
		stream.lastBuilt = time;

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

stream.checkForNewKeywords = function() {
	console.log("checking for new keywords from users")
	var time = Date.now();
	console.log("time= " + time);
	console.log("time last built= " + stream.lastBuilt);
	console.log("time diff= " + (time - stream.lastBuilt));

	if (time - stream.lastBuilt >= 1800000) {
		stream.timeout = 1;
		var currentQueryString = stream.queryString;

		stream.buildQueryString(function() {
			// if new keywords have been added, destroy the stream and rebuild it
			if (currentQueryString !== stream.queryString) {
				stream.restartTwitterStream();
			}
		});
	}
}

stream.restartTwitterStream = function() {
	stream.destroyTwitterStream(function() {
		stream.buildTwitterStream(function() {
			console.log("restarted twitter stream");
		});
	});
}

stream.reconnectTwitterStream = function(callback) {
	console.log("setting timer to reconnect twitter stream in: " + stream.timeout/1000);
	stream.timer = setTimeout(function() {
		clearTimeout(stream.timer);
		stream.restartTwitterStream();
	}, stream.timeout);

	if (callback && typeof callback === "function") {
		callback();
	};
}

module.exports = stream;
