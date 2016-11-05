var events = require( 'events' ),
    util = require('util'),
  nats = require('nats'),
  pckg = require('../package.json')

/**
 * MessageConnectors allow deepstream instances to communicate with each other.
 *
 * Messaging uses a publish-subscribe pattern. A publisher can broadcast
 * a message on a topic that zero or more subscribers listen to
 *
 * Some things that might be worth taking into account when building a new message connector
 *
 * - Deepstream only uses a relatively small number of topics (record, rpc and event plus a private topic),
 *   but will send and receive large numbers of messages on each of them. If this leads to performance problems
 *   it might make sense for the message connector to do some custom sub-routing, e.g. based on record namespaces etc.
 *
 * - Messages are passed to publish() as javascript objects and expected to be returned
 *   by the receiver as such. So its up to the message connector to serialize and deserialize them, e.g. as JSON or MsgPack
 *
 * - The message connector acts as both publisher and subscriber for each topic. It should however not receive its
 *   own messages. Some messaging middleware supports this, but for others it might be necessary to add an unique
 *   sender-id to outgoing messages and filter out incoming messages that have the same id
 *
 * - Messaging is the backbone of deepstreams scaling / clustering capabilites. So this needs to be reliable... and fast!
 *
 * @param {Object} config Connection configuration.
 *
 * @constructor
 */
var MessageConnector = function( config ) {
  this.isReady = false
  this.name = pckg.name
  this.version = pckg.version

  _validateConfig(config)
  
  this._senderId = config.serverName || (Math.random() * 10000000000000000000).toString(36)
   
  console.log('[Sender - ' + this._senderId + '] Connecting to nats cluster : ' + config.servers)

  this._client = nats.connect({ 'servers': config.servers })
  var connector = this;
    
  this._client.on('connect', function () {
      connector.isReady = true
      connector.emit('ready')
  })

  this._client.on('disconnect', function () {
      connector.emit('error', 'NATS error: disconnected')
  })

  this.subscriptions = {}

}
util.inherits( MessageConnector, events.EventEmitter )

/**
 * Unsubscribes a function as a listener for a topic.
 *
 * Often it makes sense to make only one subscription per topic to the messaging
 * middleware and use an eventemitter to notify multiple subscribers of updates
 * for the same topic. This however does mean that the message-connector
 * needs to keep track of the subscribers and unsubscribe from the messaging middleware
 * if all subscribers have unsubscribed
 *
 * @param   {String}   topic
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
MessageConnector.prototype.unsubscribe = function (topic, callback) {
    if (topic in this.subscriptions) {
        this._client.unsubscribe(this.subscriptions[topic])
    }
    
}

/**
 * Adds a function as a listener for a topic.
 *
 * It might make sense to only send the subscription to the messaging
 * middleware for the first subscriber for a topic and multiplex incoming
 * messages using an eventemitter
 *
 * @param   {String}   topic
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
MessageConnector.prototype.subscribe = function (topic, callback) {
    this.on(topic, callback)
    var connector = this;
    if (!(topic in this.subscriptions)) {
        this.subscriptions[topic] = this._client.subscribe(topic, function (msg) {
            msgObject = JSON.parse(msg);

            if (msgObject._senderId !== connector._senderId) {
                delete msgObject._senderId
                connector.emit(topic, msgObject)
            }
        });
    }
}

/**
 * Publishes a message on a topic
 *
 * Please note: message is a javascript object. Its up to the client
 * to serialize it. message will look somewhat like this:
 *
 * {
 *    topic: 'R',
 *    action: 'P',
 *    data: [ 'user-54jcvew34', 32, 'zip', 'SE34JN' ]
 * }
 *
 * @param   {String}   topic
 * @param   {Object}   message
 *
 * @public
 * @returns {void}
 */
MessageConnector.prototype.publish = function (topic, message) {
    message._senderId = this._senderId;
    this._client.publish(topic, JSON.stringify(message))
}

/**
 * Gracefully close the connection to nats
 *
 * Called when deepstream.close() is invoked.
 * Emits 'close' event to notify deepstream of clean closure.
 *
 * @public
 * @returns {void}
 */
MessageConnector.prototype.close = function () {
    this._client.close();
}

/**
 * Checks if all required parameters are present
 *
 * @param   {Object} config
 *
 * @ready
 * @returns {void}
 */
function _validateConfig(config) {
    if (!config) {
        throw new Error('Missing options for nats-connector')
    }

    if (!config.servers) {
        throw new Error('Option \'servers\' must be present')
    }

    if (config.servers && !(config.servers instanceof Array)) {
        throw new Error('Option \'servers\' must be an array of connection parameters for cluster')
    }
}

module.exports = MessageConnector
