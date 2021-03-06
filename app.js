var auth 			= require("./app/auth/auth"),
	express 		= require("express"),
	app 			= express(),
	server 			= require("http").createServer(app),
	io 				= require("socket.io")(server),
	session			= require("express-session"),
	mongoStore		= require("connect-mongo")(session),
	passport		= require("passport"),
	bodyParser 		= require("body-parser"),
	methodOverride	= require("method-override"),
	mongoose 		= require("mongoose"),
	utils			= require("./app/middleware")(io);

if(!process.env.CONSUMER_KEY) {
  var env = require('./config/env.js');
}

// ROUTES
var indexRoutes         = require("./app/routes/index")(io);

// initialize and configure passport
require("./app/auth/passport")(passport);

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

// use bodyparser
app.use(bodyParser.urlencoded({extended: true}));
// serve files in the public directory
app.use(express.static(__dirname + "/public"));
// method override for PUT and DELETE routes
app.use(methodOverride("_method"));
// default to ejs templating
app.set('views', __dirname + '/app/views');
// app.set('views', path.join(__dirname, '/app/views'));
app.set("view engine", "ejs");
app.use(session({
    secret: "Lets see what people choose to track",
    store: new mongoStore({ mongooseConnection: mongoose.connection }),
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// add user data to all pages
app.use(function(req, res, next) {
	res.locals.currentUser 	= req.user;
    next();
});
// setup routes
app.use("/", indexRoutes);



// runs on each client's connection
io.on('connect', function(socket) {
	console.log("connected to socket.io");
});

// socket.io server rather than expresss
server.listen(process.env.PORT || 3000, function() {
	console.log("socker server is listening on port 3000");
	utils.stream.buildTwitterStream(function() {
		console.log("twitter streaming now");
		setInterval(utils.stream.checkForNewKeywords, 1800000);
	});
});
