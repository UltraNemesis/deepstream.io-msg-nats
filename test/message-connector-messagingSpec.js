/* global describe, it, expect, jasmine */
const MessageConnector = require( '../src/message-connector' )
const expect = require('chai').expect
const sinon = require( 'sinon' )
const sinonChai = require("sinon-chai")
require('chai').use(sinonChai)
const EventEmitter = require( 'events' ).EventEmitter
const settings = {
    servers: ['nats://localhost:4222']
}
const MESSAGE_TIME = 500

describe( 'Messages are sent between multiple instances', () => {
  var connectorA,
    connectorB,
    connectorC,
    callback_A1 = sinon.spy(),
    callback_B1 = sinon.spy(),
    callback_C1 = sinon.spy()

  it( 'creates connectorA', ( done ) => {
    connectorA = new MessageConnector( settings )
    expect( connectorA.isReady ).to.equal( false )
    connectorA.on( 'ready', done )
    connectorA.on( 'error', ( e ) => { throw e })
  })

  it( 'creates connectorB', ( done ) => {
    connectorB = new MessageConnector( settings )
    expect( connectorB.isReady ).to.equal( false )
    connectorB.on( 'ready', done )
  })

  it( 'creates connectorC', ( done ) => {
    connectorC = new MessageConnector( settings )
    expect( connectorC.isReady ).to.equal( false )
    connectorC.on( 'ready', done )
  })

  it( 'subscribes to a topic', ( done ) => {
    connectorA.subscribe( 'topic1', callback_A1 )
    connectorB.subscribe( 'topic1', callback_B1 )
    connectorC.subscribe( 'topic1', callback_C1 )
    expect( callback_A1.callCount ).to.equal( 0 )
    setTimeout( done, MESSAGE_TIME )
  })

  it( 'connectorB sends a message', ( done ) => {
    connectorB.publish( 'topic1', { some: 'data' } )
    setTimeout( done, MESSAGE_TIME )
  })

  it( 'connectorA and connectorC have received the message', () => {
    expect(callback_A1).to.have.been.calledWith({ some: 'data' })
    expect(callback_B1).to.not.have.been.called
    expect(callback_C1).to.have.been.calledWith({ some: 'data' })
  })

  it( 'connectorC sends a message', ( done ) => {
    connectorC.publish( 'topic1', { other: 'value' } )
    setTimeout( done, MESSAGE_TIME )
  })

  it( 'connectorA and connectorB have received the message', () => {
    expect(callback_A1).to.have.been.calledWith({ other: 'value' })
    expect(callback_B1).to.have.been.calledWith({ other: 'value' })
    expect(callback_C1).to.have.been.calledWith({ some: 'data' })
  })

  it( 'connectorA and connectorC send messages at the same time', ( done ) => {
    connectorA.publish( 'topic1', { val: 'x' } )
    connectorC.publish( 'topic1', { val: 'y' } )
    setTimeout( done, MESSAGE_TIME )
  })

  it( 'connectorA and connectorB have received the message', () => {
    expect(callback_A1).to.have.been.calledWith({ val: 'y' })
    expect(callback_B1).to.have.been.calledWith({ val: 'x' })
    expect(callback_B1).to.have.been.calledWith({ val: 'y' })
    expect(callback_C1).to.have.been.calledWith({ val: 'x' })
  })

  it( 'connectorB unsubscribes', () => {
    connectorB.unsubscribe( 'topic1', callback_B1 )
  })

  it( 'connectorA sends a message', ( done ) => {
    connectorA.publish( 'topic1', { notFor: 'B' } )
    setTimeout( done, MESSAGE_TIME )
  })

  it( 'only connector c has received the message', () => {
    expect(callback_A1).to.not.have.been.calledWith({ notFor: 'B' })
    expect(callback_B1).to.not.have.been.calledWith({ notFor: 'B' })
    expect(callback_C1).to.have.been.calledWith({ notFor: 'B' })
  })
})