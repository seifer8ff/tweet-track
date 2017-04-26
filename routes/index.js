var express     = require("express"),
	router      = express.Router(),
	User 		= require("../models/user"),
	passport	= require("passport");

module.exports = function(io) {

	var middleware 	= require("../middleware")(io);

	// initialize and configure passport
	require("../config/passport")(passport);
	

	// INDEX ROUTE
	router.get("/", function(req, res){
		res.render("login");
	});

	// ROUTE TO RENDER TWEET STREAM
	router.get("/stream", 
		middleware.isLoggedIn, middleware.buildQueryString, middleware.buildTwitterStream, middleware.buildDBStreams, 
		function(req, res) {
			User.findById(req.user._id, function(err, user) {
				if (err) {
					res.redirect("/");
				} else {
					// pass in updated user to account for changes in user's keywords
					console.log("first stream to be rendered= " + res.locals.streams[0]);
					res.render("stream", {updatedUser: user});
				}
			});
	});

	// ROUTE TO ADD KEYWORD
	router.post("/stream", middleware.isLoggedIn, function(req, res) {
		User.findById(req.user._id, function(err, user) {
			if (err) {
				res.redirect("/stream");
			} else {
				// sanitize string
				var newKeyword = req.body.newKeyword.toLowerCase();
				// only add to profile if not duplicate
				if (user.keywords.indexOf(newKeyword) === -1) {
					user.keywords.push(newKeyword);
					user.save();
					console.log(user);
				}
				res.redirect("/stream");
			}
		});
	});

	// ROUTE TO DELETE KEYWORD
	router.delete("/stream/:keyword", middleware.isLoggedIn, function(req, res) {
		User.findOneAndUpdate({_id: req.user._id}, {$pull: {keywords: req.params.keyword}}, function(err, user) {
			if (err) {
				console.log(err);
			} else {
				res.redirect("/stream");
			}
		});
	});

	// ROUTE TO LOGIN TO TWITTER
	router.get("/login/twitter", passport.authenticate("twitter"));

	// TWITTER CALLBACK ROUTE
	router.get("/login/twitter/callback", 
		passport.authenticate("twitter", {
			successRedirect: "/stream",
			failureRedirect: "/"
	}));

	// ROUTE TO LOGOUT
	router.get("/logout", middleware.isLoggedIn, function(req, res) {
	    req.logout();
	    res.redirect("/");
	});

	return router;
}


