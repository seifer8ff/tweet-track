var socket = io();

socket.on('connection', function() {
	console.log('Connected!');
});
socket.on('tweets', function(tweet) {
	// creates a new h4 for each incoming tweet
	$(".stream__tweets").prepend("<h4>" + tweet + "</h4>");
});