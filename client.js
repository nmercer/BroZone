//
// Requires
//
const socket_client = require('socket.io-client');
const program = require('commander');
const colors = require('colors');
const Gpio = require('pigpio').Gpio;
const motor = new Gpio(10, {mode: Gpio.OUTPUT});


process.env['DEBUG'] = '*';

// Logging
const debug = require('debug');
const error = debug('client:error');
const log = debug('client:log');
// eslint-disable-next-line no-console
log.log = console.log.bind(console);

// Command line arg parsing
program
  .version('0.1.0')
  .option('-m, --mapID <mapID>', 'MapID to subscribe to', null)
  .option('-l, --locationID <locationID>', 'LocationID to subscribe to. If a labelID, zoneID, mapID or mac is not provided. You will receive all events related to a location. , ', null)
  .option('-a, --areaZoneID <areaZoneID>', 'Area ZoneID to subscribe to', null)
  .option('-x, --proxZoneID <proxZoneID>', 'Proximity ZoneID to subscribe to', null)
  .option('-t, --token <token>', 'Authentication token to use when subscribing', null)
  .option('-n, --namespace <namespace>', 'Namespace to connect to.', null)
  .option('--labelID <labelID>', 'LabelID To subscribe to', null)
  .option('--mac <mac>', 'mac address to subscribe to', null)
  .option('-s, --server <serverURL>', 'Server URL to connect to', null)
  .option('-p,--path <path>', 'Path at Server to connect to', null)
  .option('--send-all <sendAll>', 'Send all asset updates', false)
  .option('--unsubscribe', 'Whether to unsubscribe immediately after receiving either a zone or asset updates on a subscription. For testing unsubscribing', false)
  .parse(process.argv);

if (!program.locationID) {
  error('locationID required');
  program.help((text) => {
    return text.split('\n').map((line) => {
      return markLineWithText(line, 'locationID');
    }).join('\n');
  });
}

if (!program.token) {
  error('Authentication Token is required for connecting to the Socket!');
  program.help((text) => {
    return text.split('\n').map((line) => {
      return markLineWithText(line, 'subscribe');
    }).join('\n');
  });
}

const PORT = process.env.CLIENT_PORT || 8080;
const serverURL = program.server || `http://0.0.0.0:${PORT}`;
const path = program.path || '/streams/v1beta1/tracking/websocket';

log(`LocationID: ${program.locationID}`);
log(`AreaZoneID: ${program.areaZoneID}`);
log(`proxZoneID: ${program.proxZoneID}`);
log(`MapID: ${program.mapID}`);
log(`Token: ${program.token}`);
log(`LabelID: ${program.labelID}`);
log(`MAC: ${program.mac}`);
log(`ServerURL: ${serverURL}`);
log(`Path: ${path}`);
log(`Namespace: ${program.namespace}`);


let fullUrl =  program.namespace !== null ? `${serverURL}/${program.namespace}` : `${serverURL}`;

log(`FULL URL ${fullUrl}`);
const client = socket_client.connect(fullUrl, {path: path});

function logEvent(event, data) {
  log(`Time: ${new Date().toISOString()}`);
  log(`Event: ${event.toString()}`);
  log(`Data: ${prettyFormatted(data || {})}`);
}

client.on('connect', (data) => {
  logEvent('connect', data);
  let authenticationData = {locationID: program.locationID, token: program.token};
  log(`AuthenticationData: ${prettyFormatted(authenticationData)}`);
  client.emit('authenticate', authenticationData);
  if (program.sendAll) {
    client.emit('debug', {'send_all_assets': true});
  }
});

client.on('disconnect', (data) => {
  logEvent('disconnect', data);
});

client.on('error', (data) => {
  logEvent('error', data);
});

client.on('assets', (data) => {
  logEvent('assets', data);
});

client.on('zone_update', (data) => {
  logEvent('asset_update', data);
  if(data["action"] === 'enter'){
    motor.servoWrite(100)

  }
  else if (data["action"] === 'exit') {
    motor.servoWrite(-100)
  }
});


client.on('authenticated', (data) => {
  logEvent('authenticated', data);
  subOrUnsub('subscribe', program);
});

client.on('unauthenticated', (data) => {
  logEvent('unauthenticated', data.toString());
});

client.on('exception', (data) => {
  logEvent('exception', data);
});

function subOrUnsub(eventType, program) {
  let subscriptions = getSubscriptions(program);
  for (const subscription of subscriptions) {
    log(`Emit '${eventType}: ${prettyFormatted(subscription)}'`);
    client.emit(eventType, subscription);
  }
}

function getSubscriptions(program) {
  let subscribeData = [];

  if (program.mapID) {
    subscribeData.push({mapID: program.mapID, locationID: program.locationID});
  }
  if (program.labelID) {
    subscribeData.push({labelID: program.labelID, locationID: program.locationID});
  }
  if (program.mac) {
    subscribeData.push({mac: program.mac, locationID: program.locationID});
  }
  if (program.areaZoneID) {
    subscribeData.push({areaZoneID: program.areaZoneID, locationID: program.locationID});
  }
  if (program.proxZoneID) {
    subscribeData.push({proxZoneID: program.proxZoneID, locationID: program.locationID});
  }
  if (!program.mapID && !program.labelID && !program.mac && !program.areaZoneID && !program.proxZoneID) {
    subscribeData.push({locationID: program.locationID});
  }
  return subscribeData;
}

// Internal
function markLineWithText(line, text) {
  if (line.indexOf(text) > -1) {
    return colors.red(line);
  }
  return line;
}

function prettyFormatted(obj) {
  return JSON.stringify(obj, null, 2);
}
