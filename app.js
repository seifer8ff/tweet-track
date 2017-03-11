var config = require("./config"),
	express = require("express"),
	app = express(),
	server = require("http").createServer(app),
	io = require("socket.io")(server),
	twitter = require('twitter'),
	bodyParser = require("body-parser"),
	mongoose = require("mongoose"),
	queryString = "gay,Clinton";


mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/twitter-stream");
// use bodyparser
app.use(bodyParser.urlencoded({extended: true}));
// serve files in the public directory
app.use(express.static("public"));
// default to ejs templating
app.set("view engine", "ejs");


var tweetSchema = new mongoose.Schema({
	name: String,
	body: String,
	time: String
}, 
{
	capped: {size: 5242880, max: 10000, autoIndexId: true}
});

var querySchema = new mongoose.Schema({
	keyword: String,
	date: String
});

var Tweet = mongoose.model("tweet", tweetSchema);
var Query = mongoose.model("query", querySchema);

var twit = new twitter({
	// api keys are defined in a config file- excluded from github for privacy
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token_key: config.twitter.accessTokenKey,
    access_token_secret: config.twitter.accessTokenSecret
});

// stream tweets by keyword
var tweetStream = twit.stream('statuses/filter', { track: queryString });

tweetStream.on('data', function(tweet) {
	Tweet.create({
		name: tweet.user["screen_name"],
		body: tweet.text,
		time: tweet.created_at
	}, function(err, newTweet) {
		if (err) {
			console.log(err);
		}
	});
});

tweetStream.on('error', function(error) {
	throw error;
});


app.get("/", function(req, res){
	res.render("homepage");
});

app.post("/", function(req, res) {
	res.redirect("/");
});



// make streaming tweets available to front end via websockets
io.on('connect', function(socket) {
	console.log("connected to socket.io");
});

var dbStream = Tweet.find().tailable(true, {awaitdata: true, numberOfRetries: 500, tailableRetryInterval : 1000}).stream();
dbStream.on("data", function(dbTweet) {
	io.emit('tweets', dbTweet.body);
});

dbStream.on("error", function(err) {
	console.log(err);
})





// socket.io server rather than expresss
server.listen(3000, function(){
	console.log("socker server is listening on port 3000");
});



function buildQueryString(newKeyword) {
	if (newKeyword) {
		queryString += "," + newKeyword;
	}
	return queryString;
}
