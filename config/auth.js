if(!process.env.CONSUMER_KEY) {
  var env = require('./env.js')
}

var auth = {};

auth.twitter = {};


auth.twitter.consumerKey 			= process.env.CONSUMER_KEY;
auth.twitter.consumerSecret 		= process.env.CONSUMER_SECRET;
auth.twitter.accessTokenKey 		= process.env.ACCESS_TOKEN_KEY;
auth.twitter.accessTokenSecret 		= process.env.ACCESS_TOKEN_SECRET;
auth.twitter.callbackURL			= process.env.CALLBACK_URL;

// export config for inclusion in app.js
module.exports = auth;