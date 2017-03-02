var socket = io();

socket.on('connection', function() {
	console.log('Connected!');
});
socket.on('tweets', function(tweet) {
	$("#tweet-container").prepend("<h3>" + tweet + "</h3>");
});