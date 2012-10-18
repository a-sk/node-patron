var bunyan = require('bunyan')
  , fs = require('fs')
  , crypto = require('crypto')
  , S = require('string')

var logfile = fs.createWriteStream(process.argv[2] || __dirname + '/proxy.log');

var logger = bunyan.createLogger({
  name: 'proxy',
  stream: logfile
});

var logreq = function(req) {
  return {
    headers: req.headers,
    method: req.method,
    ip: req.connection.remoteAddress,
    url: req.url
  };
};

module.exports = function(req) {
  var req_id = crypto.randomBytes(4).toString('hex');
  req.logger = logger.child({
    serializers: bunyan.stdSerializers,
    req_id: req_id
  });
  req.log = function(msg) {
    return req.logger.info(logreq(req), msg);
  };
  req.headers['X-Request-Id'] = req_id;
  // add usefull string methods to req.url
  req.url = S(req.url)
  return req;
};
