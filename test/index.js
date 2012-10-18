var test = require('tap').test
var createProxy = require('../index.js')
var http = require('http')
var request = require('request')


var router = {
    // url based proxying support [done]
    'example.com/con': 'localhost:3500',
    // by default proxy only http [done]
    'example.com/bar': 'localhost:4000',
    // order is respected, thas't important
    // if define just domain first, it will ignore all next defined domain/url
    // [done]
    'example.com': 'localhost:6780',
    // proxy both http and websocket
    'example.net': {to: 'localhost:5000', ws:true},
    // proxy only websockets
    'blabla.com': {to: 'localhost:6000', ws:true, http: false},
    // custom logic support [done]
    'another.net': function(net, proxy) {
      if (net.req.url == '/bla') {
        // proxy based on url
        return proxy(net, 'localhost:6778')
      }
      else if (net.req.url == '/rewrite') {
        // url rewrite
        net.req.url = '/rewrite/url'
        // websocket support
        return proxy(net, 'localhost:6712')
      }
    },
    'anotherone.org': function(net, proxy) {
      // inline responce [done]
      return net.res.end('Error')
    }
}

// create test proxy
var proxy = createProxy(router);
proxy.listen(3000)

// create test server on given port
function createServer (port) {
  return http.createServer().listen(port)
}

test('Testing host + url', function(t) {
  var s = createServer(3500)
  s.on('request', function(req, res) {
    t.equal(req.headers.host, 'example.com', 'Host should be the same, that in original request')
    t.equal(req.url, '/con', 'Url should be the same, that in original request')
    res.end()
    s.close()
    t.end()
  })
  request({
    url:'http://localhost:3000/con',
    headers: {'host': 'example.com'}
  })
})
test('Testing same host + different url', function(t) {
  var s = createServer(4000)
  s.on('request', function(req, res) {
    t.equal(req.headers.host, 'example.com', 'Host should be the same, that in original request')
    t.equal(req.url, '/bar', 'Url should be the same, that in original request')
    res.end()
    s.close()
    t.end()
  })
  request({
    url:'http://localhost:3000/bar',
    headers: {'host': 'example.com'}
  })
})
test('Testing same host without url', function(t) {
  var s = createServer(6780)
  s.on('request', function(req, res) {
    t.equal(req.headers.host, 'example.com', 'Host should be the same, that in original request')
    t.equal(req.url, '/', 'Url should be empty')
    res.end()
    s.close()
    t.end()
  })
  request({
    url:'http://localhost:3000',
    headers: {'host': 'example.com'}
  })
})
test('Proxying based on custom logic with url when rule is function', function(t) {
  var s = createServer(6778)
  s.on('request', function(req, res) {
    t.equal(req.headers.host, 'another.net', 'Host should be the same, that in original request')
    t.equal(req.url, '/bla', 'Url should be the same, that in original request')
    res.end()
    s.close()
    t.end()
  })
  request({
    url:'http://localhost:3000/bla',
    headers: {'host': 'another.net'}
  })
})
test('Proxying with url rewrite when rule is a function', function(t) {
  var s = createServer(6712)
  s.on('request', function(req, res) {
    t.equal(req.headers.host, 'another.net', 'Host should be the same, that in original request')
    t.equal(req.url, '/rewrite/url', 'Url should be rewriten')
    res.end()
    s.close()
    t.end()
    //proxy.close()
  })
  request({
    url:'http://localhost:3000/rewrite',
    headers: {'host': 'another.net'}
  })
})

test('Testing inline responce', function(t) {
  request({
    url:'http://localhost:3000',
    headers: {'host': 'anotherone.org'}
  },function(err, res, body) {
    t.equal(body, 'Error', 'Responce body should be the same as in the rule')
    t.end()
    proxy.close()
  })
})
