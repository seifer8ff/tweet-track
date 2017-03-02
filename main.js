var twitter = require('twitter');
var twit = new twitter({
    consumer_key: 'uf6Ib1NWNAt0KiILE9f2O0qNk',
    consumer_secret: '4ZL44FOaCqbI2QwR9z8Y76EN6Y87oyhsDABU7fC1MtO3habUCi',
    access_token_key: '1564043540-wnKSh6DJNaJmuMBKqhSOXMJH3BEndrgDtSdjbXF',
    access_token_secret: 'NsofwoBnfZ4r1gpnbj2bhR09NNPa196MjGT0wSwAo0RuN'
});
twit.stream('statuses/filter', { track: 'dog' }, function (stream) {
    stream.on('data', function (event) {
        console.log(event.text);
    });

    stream.on('error', function(error) {
    throw error;
  });
});