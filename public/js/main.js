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
				backgroundColor: "rgb(255, 99, 132)",
				borderColor: "rgb(255, 99, 132)",
				borderWidth: 1,
				fill: false,
			}]
		}

		var options = {
			responsive: true,
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
					display: true,
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



	// pause and unpause tweet stream upon click
	$(".gradient").on("click", function() {
		if (paused)	{
			unpause();
		} else	{
			pause();
		}
	});

	// only update graph if tab is active
	window.addEventListener('focus', unpause);    
	window.addEventListener('blur', pause);
}



function unpause() {
	console.log("unpaused");
	socket.connect();
    graphUpdater = setInterval(updateGraph, graphUpdateTime);
    paused = false;
}

function pause() {
	console.log("paused");
	socket.disconnect();
	clearInterval(graphUpdater);
	paused = true;
}

function updateGraph() {
	// only update graph if sockets connected/not paused
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

		// gets reset each time the graph updates
		streamSection.tweetCount += 1;


		streamSection.streamContainer.insertAdjacentHTML("beforeend", "<p class='stream__tweet'>" + tweet + "</p>");
		streamTweets = streamSection.streamContainer.getElementsByClassName("stream__tweet");
	    if (streamTweets.length > 10) {
	        streamSection.streamContainer.removeChild(streamTweets[0].nextSibling);
	        streamSection.streamContainer.removeChild(streamTweets[0]);
	    }

	});
}





