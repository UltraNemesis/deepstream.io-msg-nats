deepstream.io-msg-nats
======================

[deepstream](http://deepstream.io) message connector for [NATS](http://nats.io/)

This connector uses [the npm NATS client package](https://www.npmjs.com/package/nats).

## Example configuration 
```yaml
plugins:
  cache:
    name: nats
    options:
      servers: 
        - 'nats://nats-server1:4222'
        - 'nats://nats-server2:4222'
        - 'nats://nats-server3:4222'
```


## Usage in node
```javascript
var Deepstream = require( 'deepstream.io' ),
    NATSMessageConnector = require( 'deepstream.io-msg-nats' ),
    server = new Deepstream();

server.set( 'messageConnector', new NATSMessageConnector( {
  servers: [
    'nats://nats-server1:4222',
    'nats://nats-server2:4222',
    'nats://nats-server3:4222'
  ]
}));

server.start();
```
