var passport      = require("passport"),
    TwitterStrat  = require("passport-twitter").Strategy,
    configAuth    = require("./auth"),
    User          = require("../models/user");


module.exports = function() {

//=====================
// PASSPORT SETUP
//=====================

  passport.serializeUser(function(user, done) {
  // placeholder for custom user serialization
  // null is for errors
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    // placeholder for custom user deserialization.
    // maybe you are going to get the user from mongo by id?
    // null is for errors
    done(null, user);
  });


//=====================
// TWITTER STRATEGY
//=====================

  passport.use("twitter", new TwitterStrat({
    consumerKey     : configAuth.twitter.consumerKey,
    consumerSecret  : configAuth.twitter.consumerSecret,
    callbackURL     : configAuth.twitter.callbackURL
  },
    function(token, tokenSecret, profile, done) {
    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Twitter
      process.nextTick(function() { 
        User.findOne({ 'twitter.id' : profile.id }, 
          function(err, user) {
            // if there is an error, stop everything and return that
            // ie an error connecting to the database
            if (err)
              return done(err);

            // if the user is found then log them in
            if (user) {
              return done(null, user); // user found, return that user
            } else {
              // if there is no user, create them
              var newUser                 = new User();

              var profileData = JSON.parse(profile._raw);

              // set all of the user data that we need
              newUser.twitter.id          	= profile.id;
              newUser.twitter.username 	= profile.username;
              newUser.twitter.displayName 	= profile.displayName;

              if (!profileData.default_profile_image) {
                newUser.twitter.profileImage = profileData.profile_image_url_https;
              }

              // save our user into the database
              newUser.save(function(err) {
              if (err)
                throw err;

              return done(null, newUser);
              });
            }
          });
      });
    })
  );


  return passport;
}

