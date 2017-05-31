var socket = io();
var graphs = document.getElementsByClassName("graph");
var streamContainers = document.getElementsByClassName("stream__container");
var graphUpdateTime = 1000;
var d = new Date();
var time = d.toTimeString();
var graphUpdater;
var paused = true;
// html sections that contain both a stream and graph of tweets, as well as all of the required data
var streamSections = [];




// runs on load
init();




function init() {
	unpause();

	for (var i = 0; i < graphs.length; i++) {

		graphs[i] = graphs[i].getContext('2d');

		var data = {
			labels: [time],
			datasets: [{
				data: [
				{x: time, y: 1},
				],
				label: '# of Tweets',
				backgroundColor: "rgb(29, 161, 242)",
				borderColor: "rgb(29, 161, 242)",
				borderWidth: 1,
				fill: false,
			}]
		}

		var options = {
			responsive: true,
			maintainAspectRatio: false,
			title:{
				display: false,
			},
			tooltips: {
				mode: 'index',
				intersect: false,
			},
			hover: {
				mode: 'nearest',
				intersect: true
			},
			scales: {
				xAxes: [{
					display: false,
					scaleLabel: {
						display: true,
						labelString: 'Time'
					}
				}],
				yAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Count'
					}
				}]
			},
			elements: {
				line: {
	                tension: 0, // disables bezier curves
	            }
	        },
	        layout: {
	        	padding: {
	        		left: 0,
	        		right: 10,
	        		top: 0,
	        		bottom: 0
	        	}
	        }
	    }

	    var myLineChart = new Chart(graphs[i], {
	    	type: 'line',
	    	data: data,
	    	options: options
	    });

	    var streamObj = {
	    	streamName: "tweets" + i,
	    	graph: myLineChart,
	    	tweetCount : 0,
	    	streamContainer: streamContainers[i]
	    }

	    streamSections.push(streamObj);

	    startStream(streamSections[i]);
	}
	socket.connect();
	graphUpdater = setInterval(updateGraph, graphUpdateTime);

	// pause and unpause tweet stream upon click
	$(".gradient").on("click", function() {
		if (paused)	{
			unpause();
		} else	{
			pause();
		}
	});
}



function unpause() {
	console.log("unpaused");
    paused = false;
}

function pause() {
	console.log("paused");
	paused = true;
}

function updateGraph() {
	// only update graph if not paused
	if (!paused)	{
		for (var i = 0; i < streamSections.length; i++) {
			refreshGraphData(streamSections[i]);
			
			// reset tweet count (we're measuring tweets per X seconds)
			streamSections[i].tweetCount = 0;
		}
	}
}

function refreshGraphData(streamSection) {
	// grab current date, convert to string, and push to xPoint array
	d = new Date();
	time = d.toTimeString();

	if (streamSection.graph.data.labels.length > 7) {
		streamSection.graph.data.labels.shift();
		streamSection.graph.data.datasets[0].data.shift();
	}
	streamSection.graph.data.labels.push(time);

	// push current tweet count to yPoint array
	streamSection.graph.data.datasets[0].data.push({x: time, y: streamSection.tweetCount});
	streamSection.graph.update();
}

// takes one streamSection (containing both the stream and graph data), and begins streaming tweets from the socket
function startStream(streamSection) {
	console.log("starting stream");
	var streamTweets = streamSection.streamContainer.getElementsByClassName("stream__tweet");

	socket.on(streamSection.streamName, function(tweet) {
		if (paused) return;

		// hide loader and unhide graph once tweets start streaming in
		if (streamSection.graph.canvas.classList.contains("hidden")) {
			streamSection.graph.canvas.parentNode.getElementsByClassName("loader")[0].classList.add("hidden");
			streamSection.graph.canvas.classList.remove("hidden");
		}

		// gets reset each time the graph updates
		streamSection.tweetCount += 1;

		// insert latest tweet and remove oldest tweet
		streamSection.streamContainer.insertAdjacentHTML("afterbegin", "<p class='stream__tweet'>" + tweet + "</p>");
		streamTweets = streamSection.streamContainer.getElementsByClassName("stream__tweet");
	    if (streamTweets.length > 10) {
	        streamSection.streamContainer.removeChild(streamTweets[streamTweets.length-1]);
	    }

	});
}





