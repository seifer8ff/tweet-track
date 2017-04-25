var config 			= require("./config"),
	express 		= require("express"),
	app 			= express(),
	server 			= require("http").createServer(app),
	io 				= require("socket.io")(server),
	session			= require("express-session"),
	passport		= require("passport"),
	TwitterStrat	= require("passport-twitter").Strategy,
	twitter 		= require('twitter'),
	bodyParser 		= require("body-parser"),
	mongoose 		= require("mongoose"),
	Tweet 			= require("./models/tweet"),
	User 			= require("./models/user"),
	queryString 	= "gay,Clinton";


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
		if (tweet && tweet.user && tweet.text && tweet.created_at) {
			Tweet.create({
				name: tweet.user["screen_name"],
				body: tweet.text,
				time: tweet.created_at
			}, function(err, newTweet) {
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
	res.render("stream");
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

// stream tweets from the database to the front end. Checks for new db entries every second
var dbStream = Tweet.find().tailable(true, {awaitdata: true, numberOfRetries: 500, tailableRetryInterval : 1000}).stream();
dbStream.on("data", function(dbTweet) {
	io.emit('tweets', dbTweet.body);
});

dbStream.on("error", function(err) {
	throw error;
})





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
