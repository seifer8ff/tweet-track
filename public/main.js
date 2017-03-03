var socket = io();
var tweetCountTotal = 0;
var tweetCountCurrent = 0;

socket.on('connection', function() {
	console.log('Connected!');
});
socket.on('tweets', function(tweet) {
	tweetCountTotal += 1;
	tweetCountCurrent += 1;
	// creates a new h4 for each incoming tweet
	$(".stream__tweets").prepend("<h4>" + tweet + "</h4>");
});