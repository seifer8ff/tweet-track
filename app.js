var config 			= require("./config/config"),
	express 		= require("express"),
	app 			= express(),
	server 			= require("http").createServer(app),
	io 				= require("socket.io")(server),
	session			= require("express-session"),
	passport		= require("passport"),
	TwitterStrat	= require("passport-twitter").Strategy,
	twitter 		= require('twitter'),
	bodyParser 		= require("body-parser"),
	methodOverride	= require("method-override"),
	mongoose 		= require("mongoose"),
	Tweet 			= require("./models/tweet"),
	User 			= require("./models/user"),
	queryString 	= "gay,Clinton",
	streams 		= [];


mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/twitter-stream");

passport.use("twitter", new TwitterStrat({
    consumerKey     : config.twitter.consumerKey,
    consumerSecret  : config.twitter.consumerSecret,
    callbackURL     : config.twitter.callbackURL
  },
  function(token, tokenSecret, profile, done) {
    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Twitter
    process.nextTick(function() { 
 
      User.findOne({ 'twitter.id' : profile.id }, 
        function(err, user) {
          // if there is an error, stop everything and return that
          // ie an error connecting to the database
          if (err)
            return done(err);
 
            // if the user is found then log them in
            if (user) {
               return done(null, user); // user found, return that user
            } else {
               // if there is no user, create them
               var newUser                 = new User();
 
               // set all of the user data that we need
               newUser.twitter.id          	= profile.id;
               newUser.twitter.token       	= token;
               newUser.twitter.username 	= profile.username;
               newUser.twitter.displayName 	= profile.displayName;
 
               // save our user into the database
               newUser.save(function(err) {
                 if (err)
                   throw err;
                 return done(null, newUser);
               });
            }
         });
      });
    })
);


// use bodyparser
app.use(bodyParser.urlencoded({extended: true}));
// serve files in the public directory
app.use(express.static(__dirname + "/public"));
// method override for PUT and DELETE routes
app.use(methodOverride("_method"));
// default to ejs templating
app.set("view engine", "ejs");
app.use(session({
    secret: "Lets see what people choose to track",
    resave: true,
    saveUninitialized: true
}));
// passport setup
passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  // placeholder for custom user deserialization.
  // maybe you are going to get the user from mongo by id?
  // null is for errors
  done(null, user);
});
app.use(passport.initialize());
app.use(passport.session());

// add user data to all pages
app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
    next();
});


var twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token_key: config.twitter.accessTokenKey,
    access_token_secret: config.twitter.accessTokenSecret
});

// build the query string each time the server starts 
buildQueryString(function(result) {
	// stream tweets that match the query string
	var tweetStream = twit.stream('statuses/filter', { track: result });

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
});



// INDEX ROUTE
app.get("/", function(req, res){
	res.render("login");
});

// ROUTE TO RENDER TWEET STREAM
app.get("/stream", isLoggedIn, function(req, res) {
	User.findById(req.user._id, function(err, user) {
		if (err) {
			res.redirect("/");
		} else {
			// build streams each time the page is loaded
			buildStreams(user, function() {
				console.log(streams.length);
			});
			res.render("stream", {updatedUser: user});
		}
	});
});

// ROUTE TO ADD KEYWORD
app.post("/stream", isLoggedIn, function(req, res) {
	User.findById(req.user._id, function(err, user) {
		if (err) {
			res.redirect("/stream");
		} else {
			// sanitize string
			var newKeyword = req.body.newKeyword.toLowerCase();
			// only add to profile if not duplicate
			if (user.keywords.indexOf(newKeyword) === -1) {
				user.keywords.push(newKeyword);
				user.save();
				console.log(user);
			}
			res.redirect("/stream");
		}
	});
});

// ROUTE TO DELETE KEYWORD
app.delete("/stream/:keyword", isLoggedIn, function(req, res) {
	User.findOneAndUpdate({_id: req.user._id}, {$pull: {keywords: req.params.keyword}}, function(err, user) {
		if (err) {
			console.log(err);
		} else {
			res.redirect("/stream");
		}
	});
});

// ROUTE TO LOGIN TO TWITTER
app.get("/login/twitter", passport.authenticate("twitter"));

// TWITTER CALLBACK ROUTE
app.get("/login/twitter/callback", 
	passport.authenticate("twitter", {
		successRedirect: "/stream",
		failureRedirect: "/"
}));

// ROUTE TO LOGOUT
app.get("/logout", isLoggedIn, function(req, res) {
    req.logout();
    res.redirect("/");
});

// runs on each client's connection
io.on('connect', function(socket) {
	console.log("connected to socket.io");
});




// socket.io server rather than expresss
server.listen(3000, function(){
	console.log("socker server is listening on port 3000");
});


// middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/");
}


// helper functions
function buildQueryString(callback) {
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
		
		// pass the new query string through the callback when done reading from db
		if (callback && typeof(callback) === "function") {
			callback(newQueryString);
		}
	});
}

function buildStreams(user, callback) {
	for (var i = 0; i < streams.length; i++) {
		streams[i].destroy();
	}
	streams.length = 0;

	User.findById(user._id, function(err, foundUser) {
		if (err) {
			console.log(err);
		} else {
			console.log(foundUser.keywords);
			foundUser.keywords.forEach(function(keyword, index) {
				// add stream of particular keyword to array of streams
				streams[index] = Tweet.find({ $or: [{hashtags: new RegExp(keyword, "i")}, {body: new RegExp(keyword, "i")}] }).tailable(true, {awaitdata: true, numberOfRetries: 500, tailableRetryInterval : 1000}).stream();

				console.log("built stream " + index);

				startStream(streams[index], index);

				if (callback && typeof(callback) === "function") {
					callback();
				}
			});
		}
	});
}

function startStream(stream, index, callback) {
	// begin streaming
	stream.on("data", function(dbTweet) {
		io.emit("tweets" + index, dbTweet.body);
	});
	console.log("streaming: tweets" + index);

	stream.on("error", function(err) {
		throw error;
	});
}
