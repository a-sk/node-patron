# Patron [![Build Status](https://secure.travis-ci.org/a-sk/node-patron.png)](http://travis-ci.org/a-sk/node-patron)

Wrapper around node-http-proxy with plugins, logging, and simple
configuration format.

# Install
`npm install patron`

# Example

```javascript
var createProxyServer = require('patron');

var router = {
    // url based proxying support
    'example.com/con': 'localhost:3000',
    // by default proxy only http
    'example.com/bar': 'localhost:4000',
    // proxy both http and websocket
    'example.com/foo': {to: 'localhost:5000', ws:true},
    // order is respected, thas't important
    // if define just domain first, it wiil ignore all next defined domain/url
    'example.com': 'localhost:6780',
    // proxy only websockets
    'blabla.com': {to: 'localhost:6000', ws:true, http: false},
    // custom logic support
    'another.net': function(net, proxy) {
      if (net.req.url == '/bla') {
        // proxy based on url
        return proxy(net, 'localhost:6778')
      }
      else if (net.req.url == '/test') {
        // url rewrite
        net.req.url = '/rewrite/url'
        // websocket support
        return proxy(net, 'localhost:6712')
      }
    },
    'anotherone.org': function(net, proxy) {
      // inline responce
      return net.res.end('Error')
    }
}

createProxyServer(router).listen(80)
```


