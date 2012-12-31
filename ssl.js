module.exports = function(options) {


var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    httpProxy = require('http-proxy');

var proxyOptions = {
  https: {
    key: fs.readFileSync(options.key, 'utf8'),
    cert: fs.readFileSync(options.cert, 'utf8')
  }
};

//
// Create a standalone HTTPS proxy server
//
return httpProxy.createServer(options.http, 'localhost', proxyOptions).listen(options.https);

}

