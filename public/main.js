var socket = io();
var tweetCountTotal = 0;
var tweetCountCurrent = 0;
var graph = document.getElementById("graph");
var graphUpdateTime = 1000;
var d = new Date();
var time = d.toTimeString();
var xPoints = [time];
var yPoints = [0];
var minRangeX = 0;
var maxRangeX = 10;
var minRangeY = 0;
var maxRangeY = 10;
var graphUpdater;
var paused = true;


var tweetTrace = {
	x: [time],
	y: [tweetCountCurrent],
	fill: "tonexty",
	fillcolor: 'rgba(51,204,255,0.4)',
	line: {
		color: 'rgb(0,132,180)'
	},
	type: "scatter"
}
var data = [tweetTrace];
var layout = {
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
  		range: [minRangeX, maxRangeX]
  	},
  	yaxis: 	{
  		// ticks: 'inside',
  		fixedrange: true,
  		range: [minRangeY, maxRangeY]
  	}
};




init();




function init() {
	unpause();
	// initial plot on page load
	Plotly.newPlot(graph, data, layout, {displayModeBar: false});

	// pause and unpause tweet stream upon click
	$(".gradient").on("click", function() {
		if (paused)	{
			unpause();
		} else	{
			pause();
		}
	});
	
	// Add incoming tweets to dom + count them
	socket.on('tweets', function(tweet) {
		if (paused) return;

		tweetCountTotal += 1;
		// gets reset each time the graph updates
		tweetCountCurrent += 1;
		// creates a new h4 for each incoming tweet
		$(".stream__container").prepend("<p class='stream__tweet'>" + tweet + "</p>");
	});
	
	// only update graph if tab is active
	window.addEventListener('focus', unpause);    
	window.addEventListener('blur', pause);

	// make graph responsive
	window.onresize = function() {
		Plotly.Plots.resize(graph);
	};
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
		refreshGraphData();
		refreshGraphAxis();
		
		// animate new points being added to graph
		Plotly.animate(graph, {
		    data: [{x: xPoints, y: yPoints}],
		    traces: [0],
		    layout: {
		    	// update ranges with new mins and maxes
		    	xaxis: 	{
	  				range: [minRangeX, maxRangeX]
	  			},
		    	yaxis: 	{
	  				range: [minRangeY, maxRangeY]
	  			}
		    }
		  }, {
		    transition: {
		      duration: 500,
		      easing: 'cubic-in-out'
		    }
		  })
		// reset tweet count (we're measuring tweets per X seconds)
		tweetCountCurrent = 0;
	}
}

function refreshGraphData() {
	// grab current date, convert to string, and push to xPoint array
	d = new Date();
	time = d.toTimeString();
	xPoints.push(time);

	// push current tweet count to yPoint array
	yPoints.push(tweetCountCurrent);
}

function refreshGraphAxis() {
	// check if 5 points have been added. If so, update x axis range
	if (xPoints.length%5 === 0) {
		minRangeX = xPoints.length - 5;
		maxRangeX = xPoints.length + 5;
	}
	// update y axis range to 5 points higher than the max tweetcount
	maxRangeY = Math.max(...yPoints) + 3;
}

