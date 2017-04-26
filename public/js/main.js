var socket = io();
// var tweetCount = 0;
// var graph = document.getElementById("graph");
var graphs = document.getElementsByClassName("graph");
var streamContainers = document.getElementsByClassName("stream__container");
var graphUpdateTime = 1000;
var d = new Date();
var time = d.toTimeString();
// var xPoints = [time];
// var yPoints = [0];
// var minRangeX = 0;
// var maxRangeX = 10;
// var minRangeY = 0;
// var maxRangeY = 10;
var graphUpdater;
var paused = true;
var streamSections = [];

for (var i = 0; i < graphs.length; i++) {
	streamSections.push({
		graphData: {
			graph: graphs[i],
			xPoints: [time],
			yPoints: [0],
			minRangeX: 0,
			maxRangeX: 10,
			minRangeY: 0,
			maxRangeY: 10,
			tweetTrace: {
				x: [time],
				// y is equal to tweet count, which to start is 0
				y: [0],
				fill: "tonexty",
				fillcolor: 'rgba(51,204,255,0.4)',
				line: {
					color: 'rgb(0,132,180)'
				},
				type: "scatter"
			},
			layout: {
				title: "Tweets Per Second",
			    paper_bgcolor: 'rgba(255,255,255,1',
			  	plot_bgcolor: 'rgba(255,255,255,1)',
			  	showlegend: false,
				margin: {
					l: 30,
					r: 30,
					b: 50,
					t: 30,
					pad: 4
				},
				height: 360,
			  	xaxis: 	{
			  		fixedrange: true,
			  		range: [0, 10]
			  	},
			  	yaxis: 	{
			  		// ticks: 'inside',
			  		fixedrange: true,
			  		range: [0, 10]
			  	}
			}
		},
		streamName: "tweets" + i,
		streamContainer: streamContainers[i],
		xPoints: [time],
		yPoints: [0],
		tweetCount : 0
	});
}




init();




function init() {
	unpause();

	for (var i = 0; i < streamSections.length; i++) {
		Plotly.newPlot(streamSections[i].graphData.graph, [streamSections[i].graphData.tweetTrace], streamSections[i].graphData.layout, {displayModeBar: false});
		
		startStream(streamSections[i]);

		// make graph responsive
		window.onresize = function() {
			Plotly.Plots.resize(streamSections[i].graphData.graph);
		};
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
	// only update graph if websockets connected/not paused
	if (!paused)	{
		for (var i = 0; i < streamSections.length; i++) {
			refreshGraphData(streamSections[i]);
			refreshGraphAxis(streamSections[i]);
			
			// animate new points being added to graph
			Plotly.animate(streamSections[i].graphData.graph, {
			    data: [{x: streamSections[i].graphData.xPoints, y: streamSections[i].graphData.yPoints}],
			    traces: [0],
			    layout: {
			    	// update ranges with new mins and maxes
			    	xaxis: 	{
		  				range: [streamSections[i].graphData.minRangeX, streamSections[i].graphData.maxRangeX]
		  			},
			    	yaxis: 	{
		  				range: [streamSections[i].graphData.minRangeY, streamSections[i].graphData.maxRangeY]
		  			}
			    }
			  }, {
			    transition: {
			      duration: 500,
			      easing: 'cubic-in-out'
			    }
			  })
			// reset tweet count (we're measuring tweets per X seconds)
			streamSections[i].tweetCount = 0;
		}
	}
}

function refreshGraphData(streamSection) {
	// grab current date, convert to string, and push to xPoint array
	d = new Date();
	time = d.toTimeString();
	streamSection.graphData.xPoints.push(time);

	// push current tweet count to yPoint array
	streamSection.graphData.yPoints.push(streamSection.tweetCount);
}

function refreshGraphAxis(streamSection) {
	// check if 5 points have been added. If so, update x axis range
	if (streamSection.graphData.xPoints.length%5 === 0) {
		streamSection.graphData.minRangeX = streamSection.graphData.xPoints.length - 5;
		streamSection.graphData.maxRangeX = streamSection.graphData.xPoints.length + 5;
	}
	// update y axis range to 5 points higher than the max tweetcount
	streamSection.graphData.maxRangeY = Math.max(...streamSection.graphData.yPoints) + 3;
}

function startStream(streamSection) {
	socket.on(streamSection.streamName, function(tweet) {
		if (paused) return;

		// gets reset each time the graph updates
		streamSection.tweetCount += 1;
		// creates a new h4 for each incoming tweet
		// $(streamSection.streamContainer).prepend("<p class='stream__tweet'>" + tweet + "</p>");


		streamSection.streamContainer.insertAdjacentHTML("beforeend", "<p class='stream__tweet'>" + tweet + "</p>");
		var streamTweets = streamSection.streamContainer.getElementsByClassName("stream__tweet");
	    if (streamTweets.length > 10) {
	        streamSection.streamContainer.removeChild(streamTweets[0].nextSibling);
	        streamSection.streamContainer.removeChild(streamTweets[0]);
	    }

	});
}

