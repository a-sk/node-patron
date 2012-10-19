var bunyan = require('bunyan')
  , fs = require('fs')
  , crypto = require('crypto')
  , S = require('string')
  , domain = require("domain")

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
    url: req.url.toString()
  };
};

module.exports = decorate

function decorate(req, res) {
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

  var d = domain.create()
  d.add(req)
  d.add(res)
  d.on("error", function (er) {
    req.logger.error({ error: er })
    try {
      if (res.error) res.error(er)
        else {
          res.statusCode = 500
          res.end('Server Error\n' + er.message)
        }

        // don't destroy before sending the error
        res.on("finish", function () {
          d.dispose()
        })

        // don't wait forever, though.
        setTimeout(function () {
          d.dispose()
        }, 1000)

        // disconnect after errors so that a fresh worker can come up.
        //req.client.server.close()

    } catch (er) {
      d.dispose()
    }
  })
}

