var socket = io();
var graphUpdateTime = 1000;
var paused = true;
// html sections that contain both a stream and graph of tweets, as well as all of the required data
var streamSections = [];




// runs on load
$(document).ready(function () {

	// initialize graphs
	init();


	// form validation
    $("#newKeyword-form").on("submit", function (e) {
    	e.preventDefault();
        var newKeyword = document.getElementById("newKeyword").value;

		newKeyword = validateInput(newKeyword);

		if (newKeyword) {
			console.log("input validation successful: " + newKeyword);
			this.submit();
		} else {
			console.log("input validation failed");
			return;
		}
    });


    // click handlers
    // pause and unpause tweet stream upon click
	// $(".gradient").on("click", function() {
	// 	if (paused)	{
	// 		unpause();
	// 	} else	{
	// 		pause();
	// 	}
	// });
});





function init() {
	var graphs = document.getElementsByClassName("graph");
	var streamContainers = document.getElementsByClassName("stream__container");

	// for each canvas element, build a graph and begin streaming tweets
	for (var i = 0; i < graphs.length; i++) {
		graphs[i] = graphs[i].getContext('2d');

	    var streamObj = buildGraph(graphs[i], streamContainers[i], i);
	    streamSections.push(streamObj);
	    startStream(streamObj);
	}

	// connect to streaming socket and begin updating graphs 
	socket.connect();
	setInterval(updateGraphs, graphUpdateTime);

	unpause();
}



function unpause() {
	console.log("unpaused");
    paused = false;
}

function pause() {
	console.log("paused");
	paused = true;
}

function buildGraph(graph, streamContainer, index) {
	var d = new Date();
	var time = d.toTimeString();

	// setup default data and options
	var data = {
		labels: [time],
		datasets: [{
			data: [
			{x: time, y: 1}
			],
			label: '# of Tweets',
			backgroundColor: "rgba(29, 161, 242, 0.2)",
			pointBackgroundColor: "rgb(29, 161, 242)",
			borderColor: "rgb(29, 161, 242)",
			borderWidth: 1,
			fill: true
		}]
	}
	var options = {
		responsive: true,
		maintainAspectRatio: false,
		title:{
			display: false
		},
		tooltips: {
			mode: 'index',
			intersect: false
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
				},
				ticks: {
					beginAtZero: true,
					suggestedMax: 10
                }
			}]
		},
		elements: {
			line: {
				tension: 0
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

	var myLineChart = new Chart(graph, {
		type: 'line',
		data: data,
		options: options
	});

	var streamObj = {
		streamName: "tweets" + index,
		graph: myLineChart,
		tweetCount : 0,
		streamContainer: streamContainer
	}

	return streamObj;
}

function updateGraphs() {
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
	d = new Date();
	time = d.toTimeString();

	// if there are more than 7 points on the graph, remove oldest
	if (streamSection.graph.data.labels.length > 7) {
		streamSection.graph.data.labels.shift();
		streamSection.graph.data.datasets[0].data.shift();
	}
	// push new data to graph
	streamSection.graph.data.labels.push(time);
	streamSection.graph.data.datasets[0].data.push({x: time, y: streamSection.tweetCount});

	// update graph visual
	streamSection.graph.update();
}

// takes one streamSection (containing both the stream and graph data), and begins streaming tweets from the socket
function startStream(streamSection) {
	console.log("starting stream: " + streamSection.streamName);
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

 function validateInput(input) {
	if (!input) {
		return false;
	}

	// sanitize string (removes accents, spaces, special characters)
	var cleanInput = input.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	cleanInput = cleanInput.replace(/[^\w]/gi, '')
	cleanInput = cleanInput.toLowerCase();

	if (cleanInput === "") {
		return false;
	}

	return cleanInput;
}





