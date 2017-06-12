var express     = require("express"),
	router      = express.Router(),
	User 		= require("../models/user"),
	passport	= require("passport");

module.exports = function(io) {

	var utils 	= require("../middleware")(io);

	// initialize and configure passport
	require("../auth/passport")(passport);
	

	// INDEX ROUTE
	router.get("/", utils.middleware.buildDemoStream, function(req, res) {
		if (req.isAuthenticated()) {
			res.redirect("/stream");
		} else {
			res.render("splash", {keywords: ["me"]}); // keyword must match keyword in buildDemoStream function
		}
	});

	// ROUTE TO RENDER TWEET STREAM
	router.get("/stream", 
		utils.middleware.isLoggedIn, utils.middleware.buildDBStreams, 
		function(req, res) {
			User.findById(req.user._id, function(err, user) {
				if (err) {
					res.redirect("/");
				} else {
					// pass in updated user to account for changes in user's keywords
					res.render("stream", {keywords: user.keywords});
				}
			});
	});

	// ROUTE TO ADD KEYWORD
	router.post("/stream", utils.middleware.isLoggedIn, function(req, res) {
		User.findById(req.user._id, function(err, user) {
			if (err) {
				res.redirect("/stream");
			} else {
				// validate input
				var newKeyword = utils.validateInput(req.body.newKeyword);

				if (newKeyword) {
					// only add to profile if not empty and not duplicate
					if (user.keywords.indexOf(newKeyword) === -1) {
						user.keywords.push(newKeyword);
						user.save(function() {
							console.log(user);
							utils.stream.restartTwitterStream();
						});
					}
				}
				// redirect to stream whether the keyword is valid or not. Need to add error message if it's not
				res.redirect("/stream");
			}
		});
	});

	// ROUTE TO DELETE KEYWORD
	router.delete("/stream/:keyword", utils.middleware.isLoggedIn, function(req, res) {
		User.findOneAndUpdate({_id: req.user._id}, {$pull: {keywords: req.params.keyword}}, function(err, user) {
			if (err) {
				console.log("error deleting keyword: " + req.params.keyword);
				console.log(err);
			}
			res.redirect("/stream");
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
	router.get("/logout", utils.middleware.isLoggedIn, function(req, res) {
	    req.logout();
	    res.redirect("/");
	});

	return router;
}


