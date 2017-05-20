'use strict';

const rpio = require('rpio');

var Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-simple-garage-door-opener', 'SimpleGarageDoorOpener', SimpleGarageDoorOpener);
};

class SimpleGarageDoorOpener {
  constructor (log, config) {

    //get config values
    this.name = config['name'];
    this.doorSwitchPin = config['doorSwitchPin'] || 12;
    this.simulateTimeOpening = config['simulateTimeOpening'] || 15;
    this.doorSwitchPin = config['doorSwitchPin'] || 36;
    this.simulateTimeOpening = config['simulateTimeOpening'] || 30;
    this.simulateTimeClosing = config['simulateTimeClosing'] || 30;

    //initial setup
    this.log = log;
    this.lastOpened = new Date();
    this.service = new Service.GarageDoorOpener(this.name, this.name);
    this.setupGarageDoorOpenerService(this.service);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Garage Door')
      .setCharacteristic(Characteristic.Model, 'Remote Control')
      .setCharacteristic(Characteristic.SerialNumber, '0303');
  }

  getServices () {
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {
    rpio.open(this.doorSwitchPin, rpio.INPUT);

    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var targetDoorState = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (targetDoorState === Characteristic.TargetDoorState.OPEN && ((new Date() - this.lastOpened) >= (this.closeAfter * 1000))) {
          this.log('Setting TargetDoorState -> CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, targetDoorState);
        }
      })
      .on('set', (value, callback) => {
        if (value === Characteristic.TargetDoorState.OPEN) {
          this.lastOpened = new Date();
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
                this.GarageDoorClose(callback);
                break;
                default:
                callback();
            case Characteristic.CurrentDoorState.CLOSING:
            case Characteristic.CurrentDoorState.OPEN:
                this.GarageDoorOpen(callback);
                break;
            default:
                callback();
          }
        } else {
          callback();
        }
      });
  }

    GarageDoorOpen (callback) {
        rpio.mode(this.doorSwitchPin, rpio.OUTPUT);
        rpio.write(this.doorSwitchPin, rpio.LOW)
        rpio.sleep(10);
        rpio.mode(this.doorSwitchPin, rpio.INPUT);

        this.log('Opening the garage door for...');
        this.simulateGarageDoorOpening();
        callback();
    }

    GarageDoorClose (callback) {
        rpio.mode(this.doorSwitchPin, rpio.OUTPUT);
        rpio.write(this.doorSwitchPin, rpio.LOW)
        rpio.sleep(10);
        rpio.mode(this.doorSwitchPin, rpio.INPUT);
        
        this.log('Closing the garage door for...');
        this.simulateGarageDoorClosing();
        callback();
    }

    
  simulateGarageDoorOpening () {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
      setTimeout(() => {
                 this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
                 }, this.simulateTimeOpening * 1000);
    }
    
  simulateGarageDoorClosing () {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
      setTimeout(() => {
                 this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
                 }, this.simulateTimeClosing * 1000);
      
    }
}
