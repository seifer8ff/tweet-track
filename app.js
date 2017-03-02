var config = require("./config");
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var twitter = require('twitter');

// serve files in the public directory
app.use(express.static("public"));
// default to ejs templating
app.set("view engine", "ejs");

var twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token_key: config.twitter.accessTokenKey,
    access_token_secret: config.twitter.accessTokenSecret
});

// stream tweets by keyword
var tweetStream = twit.stream('statuses/filter', { track: 'gay' });

// make streaming tweets available to front end via websockets
io.on('connect', function(socket) {
	tweetStream.on('data', function(tweet) {
		socket.emit('tweets', tweet.text);
	});
	tweetStream.on('error', function(error) {
		throw error;
	});
});

app.get("/", function(req, res){
    res.render("homepage");
});

// socket.io server rather than expresss
server.listen(3000, function(){
	console.log("socker server is listening on port 3000");
});
