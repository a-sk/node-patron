module.exports = function(proxyTable, https) {

var http = require('http')
, url = require('url')
, httpProxy = require('http-proxy')
, S = require('string')
, EE = require('events').EventEmitter
, domain = require('domain')
, bunyan = require('bunyan')
, fs = require('fs')


var logfile = process.argv[2] ? fs.createWriteStream(process.argv[2]) : null;

var logger = bunyan.createLogger({
  name: 'proxy',
  stream: logfile ? logfile : process.stdout
});

try {
  var debug = require('debug')('patron')
} catch (e) {
  // production
  var debug = function() {}
}

var decorate = require('./decorate.js')(logger)
var server = http.createServer();
var bus = new EE();

if (https === true) {
  server._listen = server.listen
  server.listen = function(options, cb) {
    var https = require('./ssl.js')(options)
    server._listen(options.http)
    if (cb) {
      cb()
    }
  }
}

bus.on('add', function(rule) {
  debug('Got add event')
  var ruleName = getFirstKey(rule)
  proxyTable[ruleName] = rule[ruleName]
  debug('rule for %s was added', ruleName)
})

bus.on('remove', function(ruleName) {
  debug('Got remove event')
  delete proxyTable[ruleName]
  debug('rule for %s was removed', ruleName)
})

server.use = function use(plugin) {
  var d = domain.create()
  d.on('error', function (err) {
    logger.error({error:err})
  })
  d.run(function() {plugin(bus)})
}

function getFirstKey(obj) { return Object.keys(obj)[0] }

server.on('request', function(req, res) {
  debug('new HTTP request')
  decorate(req, res)
  handleProxying({
    req: req,
    res: res,
    protocol: 'http'
  })
})

server.on('upgrade', function(req, socket, head) {
  debug('new UPGRADE request')
  decorate(req, socket)
  handleProxying({
    req: req,
    socket: socket,
    head: head,
    protocol: 'websockets'
  })
})

function handleProxying(net) {
  var href = net.req.headers.host + net.req.url
  // get proxy rule for this host + url
  var rule = proxyTableLookup(proxyTable, href)
  if (!rule) {
    debug('Rule for was not found')
    net.req.logger.error('Bad request');
    net.res.writeHead(404, { 'Content-Type': 'text/plain' });
    net.res.write('You are wrong');
    return net.res.end()
  }
  // rule is either function, string or object
  if (typeof rule === 'function') {
    debug('Found function rule')
    rule(net, proxy)
  } else if (typeof rule === 'string'
             // by default don't proxy websockets
             && net.protocol === 'http') {
    debug('Found string rule %s', rule)
    proxy(net, rule)
  } else {
    debug('Found object rule')
    if ( rule.ws === true && net.protocol === 'websockets') {
      proxy(net, rule.to)
    } else if ( rule.http !== false && net.protocol === 'http' ) {
      proxy(net, rule.to)
    } else {
      debug('Error, wrong configuration %s', JSON.stringify(rule))
      net.req.logger.error('Bad request');
      net.res.writeHead(500, { 'Content-Type': 'text/plain' });
      net.res.write('Something went wrong.');
      return net.res.end()
    }
  }
}

// find rule for href in proxyTable
function proxyTableLookup(proxyTable, href) {
  debug('Doing lookup in proxyTable for %s', href)
  for (var key in proxyTable) {
    if (S(href).startsWith(key)) {
      return proxyTable[key]
    }
  }
}

// do actual proxying
function proxy(net, address) {
  debug('Proxying %s%s to %s%s', net.req.headers.host, net.req.url, address, net.req.url)
  debug('Protocol is %s', net.protocol)
  if (net.protocol === 'http') {
    net.req.log('Proxying http to ' + address)
    return proxyFor(address).proxyRequest(net.req, net.res)
  } else if (net.protocol === 'websockets') {
    net.req.log('Proxying websockets to ' + address)
    return proxyFor(address).proxyWebSocketRequest(net.req, net.socket, net.head)
  }
}


// create or return already created proxy for address
var proxyies = {}
function proxyFor(address) {
  if (!S(address).startsWith('http://')) {
    address = 'http://' + address
  }
  var host = url.parse(address).hostname
  var port = url.parse(address).port
  debug('Host %s, port %s', host, port)
  if (!proxyies[address]) {
    proxyies[host] = new httpProxy.HttpProxy({
      target: {
        host: host,
        port: port
      }
    })
  }
  return proxyies[host]
}


return server
}
