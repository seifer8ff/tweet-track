var configAuth 		= require("./config/auth"),
	express 		= require("express"),
	app 			= express(),
	server 			= require("http").createServer(app),
	io 				= require("socket.io")(server),
	session			= require("express-session"),
	passport		= require("passport"),
	bodyParser 		= require("body-parser"),
	methodOverride	= require("method-override"),
	mongoose 		= require("mongoose"),
	utils			= require("./libs")(io);

// ROUTES
var indexRoutes         = require("./routes/index")(io);

// initialize and configure passport
require("./config/passport")(passport);

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/twitter-stream");

// use bodyparser
app.use(bodyParser.urlencoded({extended: true}));
// serve files in the public directory
app.use(express.static(__dirname + "/public"));
// method override for PUT and DELETE routes
app.use(methodOverride("_method"));
// default to ejs templating
app.set("view engine", "ejs");
app.use(session({
    secret: "Lets see what people choose to track",
    resave: true,
    saveUninitialized: true
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
server.listen(3000, function(){
	console.log("socker server is listening on port 3000");
	utils.stream.buildQueryString(function() {
		utils.stream.buildTwitterStream(function() {
			console.log("twitter streaming now");
		});
	});
});
