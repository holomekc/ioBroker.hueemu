"use strict";
/*
 * Created with @iobroker/create-adapter v1.21.1
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const hue_emu_1 = require("hue-emu");
const utils_1 = require("hue-emu/dist/util/utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const uuid = require("uuid");
const cert_1 = require("./cert");
const hue_emu_definition_1 = require("./definition/hue-emu-definition");
const hue_emu_logger_1 = require("./hue-emu-logger");
const hue_handler_1 = require("./hue-handler");
const utils_2 = require("./util/utils");
class HueEmu extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: 'hueemu' }));
        this._pairingEnabled = false;
        this._disableAuth = false;
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        this.definition = new hue_emu_definition_1.HueEmuDefinition(this);
    }
    get pairingEnabled() {
        return this._pairingEnabled;
    }
    set pairingEnabled(value) {
        this.setState('startPairing', {
            ack: true,
            val: value
        }, () => {
            this._pairingEnabled = value;
        });
    }
    get disableAuth() {
        return this._disableAuth;
    }
    set disableAuth(value) {
        this.setState('disableAuth', {
            ack: true,
            val: value
        }, () => {
            this._disableAuth = value;
        });
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    onReady() {
        return __awaiter(this, void 0, void 0, function* () {
            this.log.silly('onReady called. Load configuration');
            this.config.host = this.config.host ? this.config.host.trim() : '';
            this.config.port = this.toPort(this.config.port);
            this.config.discoveryHost = this.config.discoveryHost ? this.config.discoveryHost.trim() : '';
            this.config.discoveryPort = this.toPort(this.config.discoveryPort);
            this.config.httpsPort = this.toUndefinedPort(this.config.httpsPort);
            this.config.udn = this.config.udn ? this.config.udn.trim() : uuid.v4();
            this.config.mac = this.config.mac ? this.config.mac.trim() : '';
            this.config.upnpPort = this.toDefaultPort(this.config.upnpPort, 1900);
            let hueBuilderUpnp = hue_emu_1.HueBuilder.builder().withHost(this.config.host).withPort(this.config.port)
                .withHttps(undefined).withDiscoveryHost(this.config.discoveryHost).withDiscoveryPort(this.config.discoveryPort)
                .withUdn(this.config.udn).withUpnpPort(this.config.upnpPort);
            if (this.log.level === 'silly') {
                // There might be a lot of upnp communication which would flood the logs. So only on silly.
                hueBuilderUpnp.withLogger(new hue_emu_logger_1.HueEmuLogger(this));
            }
            let certObservable;
            if (this.config.httpsPort) {
                certObservable = this.loadCertificate().pipe(operators_1.map(value => {
                    return {
                        port: this.config.httpsPort,
                        cert: value.certificate,
                        key: value.privateKey
                    };
                }));
            }
            else {
                certObservable = rxjs_1.of(undefined);
            }
            certObservable.subscribe(httpsConfig => {
                let hueBuilder = hue_emu_1.HueBuilder.builder().withHost(this.config.host).withPort(this.config.port).withHttps(httpsConfig)
                    .withDiscoveryHost(this.config.discoveryHost).withDiscoveryPort(this.config.discoveryPort)
                    .withUdn(this.config.udn).withLogger(new hue_emu_logger_1.HueEmuLogger(this));
                new hue_emu_1.HueUpnp(hueBuilderUpnp);
                new hue_emu_1.HueServer(hueBuilder, new hue_handler_1.HueHandler(this));
            });
            this.setObjectNotExists('createLight', {
                type: 'state',
                common: {
                    name: 'createLight',
                    read: true,
                    write: true
                },
                native: {},
            }, () => {
                this.initStartPairing().pipe(operators_1.switchMap(() => {
                    return this.initDisableAuth();
                })).subscribe(() => {
                    this.subscribeStates('*');
                });
            });
        });
    }
    initStartPairing() {
        return new rxjs_1.Observable(subscriber => {
            this.setObjectNotExists('startPairing', {
                type: 'state',
                common: {
                    name: 'startPairing',
                    type: 'boolean',
                    role: 'button',
                    write: true,
                    read: true
                },
                native: {},
            }, () => {
                this.pairingEnabled = false;
                subscriber.next();
                subscriber.complete();
            });
        });
    }
    initDisableAuth() {
        return new rxjs_1.Observable(subscriber => {
            this.setObjectNotExists('disableAuth', {
                type: 'state',
                common: {
                    name: 'disableAuthentication',
                    type: 'boolean',
                    role: 'switch',
                    write: true,
                    read: true
                },
                native: {},
            }, () => {
                this.getState('disableAuth', (err, state) => {
                    if (!err && state && state.val) {
                        this.disableAuth = state.val;
                    }
                    else {
                        this.disableAuth = false;
                    }
                    subscriber.next();
                    subscriber.complete();
                });
            });
        });
    }
    addState(id, name, value) {
        this.setObjectNotExists(id, {
            type: 'state',
            common: {
                name: name,
                type: typeof value,
                role: hue_emu_definition_1.HueEmuDefinition.determineRole('state', name),
                read: true,
                write: true
            },
            native: {},
        });
        this.setState(id, {
            ack: true, val: value
        });
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed object changes
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        }
        else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            if (!state.ack) {
                if (id === this.namespace + '.createLight') {
                    this.createLights(id, state);
                }
                else if (id === this.namespace + '.startPairing') {
                    if (this.timeoutId) {
                        clearTimeout(this.timeoutId);
                    }
                    this.pairingEnabled = state.val;
                    // TODO: config for pairing
                    this.timeoutId = setTimeout(() => this._pairingEnabled = false, 50000);
                }
                else if (id === this.namespace + '.disableAuth') {
                    this.disableAuth = state.val;
                }
                else {
                    // just ack everything else
                    this.setState(id, { ack: true, val: state.val });
                }
            }
        }
        else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
    createLights(id, state) {
        if (state.ack) {
            // ignoring
            return;
        }
        try {
            const lights = typeof state.val === 'object' ? state.val : JSON.parse(state.val);
            this.log.info(lights);
            Object.keys(lights).forEach(lightId => {
                try {
                    this.createLightsDevice(lightId, lights);
                    this.createLightsState(lightId, lights);
                    this.createLightsName(lightId, lights);
                    this.createLightsData(lightId, lights);
                    // ack change. Keep last created light so that multiple lights can be created easier.
                    this.setState(id, { ack: true, val: state.val });
                }
                catch (e) {
                    this.log.warn(`Could not create light with id=${lightId}` + e);
                }
            });
        }
        catch (err) {
            this.log.warn('Could not parse lights: ' + err);
        }
    }
    createLightsDevice(lightId, lights) {
        this.setObjectNotExists(lightId, {
            type: 'device',
            common: {
                name: lights[lightId].name,
                read: true
            },
            native: {},
        });
    }
    createLightsState(lightId, lights) {
        this.setObjectNotExists(`${lightId}.state`, {
            type: 'channel',
            common: {
                name: 'state',
                read: true
            },
            native: {},
        }, (err, id) => {
            if (!err) {
                this.definition.addFunction(lightId, `state`, undefined);
            }
        });
        Object.keys(lights[lightId].state).forEach(stateKey => {
            this.addState(`${lightId}.state.${stateKey}`, stateKey, lights[lightId].state[stateKey]);
        });
    }
    createLightsName(lightId, lights) {
        this.setObjectNotExists(`${lightId}.name`, {
            type: 'state',
            common: {
                name: 'name',
                type: 'string',
                role: 'text',
                read: true,
                write: true
            },
            native: {},
        });
        this.setState(`${lightId}.name`, {
            ack: true, val: lights[lightId].name
        });
    }
    createLightsData(lightId, lights) {
        const data = {};
        Object.keys(lights[lightId]).forEach(key => {
            if (key === 'state' || key === 'name') {
                // ignore
            }
            else {
                data[key] = lights[lightId][key];
            }
        });
        this.setObjectNotExists(`${lightId}.data`, {
            type: 'state',
            common: {
                name: 'data',
                type: 'object',
                role: 'state',
                read: true,
                write: true
            },
            native: {},
        });
        this.setState(`${lightId}.data`, {
            ack: true, val: data
        });
    }
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  */
    // private onMessage(obj: ioBroker.Message): void {
    // 	if (typeof obj === "object" && obj.message) {
    // 		if (obj.command === "send") {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info("send command");
    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
    // 		}
    // 	}
    // }
    toPort(port) {
        if (port) {
            if (typeof port === 'number') {
                return port;
            }
            else {
                return parseInt(port.trim());
            }
        }
        else {
            throw new Error('Not all ports set');
        }
    }
    toDefaultPort(port, defaultPort) {
        let parsedPort = this.toUndefinedPort(port);
        if (parsedPort) {
            return parsedPort;
        }
        else {
            return defaultPort;
        }
    }
    toUndefinedPort(port) {
        if (port) {
            if (typeof port === 'number') {
                return port;
            }
            else {
                return parseInt(port);
            }
        }
        else {
            return undefined;
        }
    }
    loadCertificate() {
        return new rxjs_1.Observable(subscriber => {
            this.getForeignObject('system.certificates', (err, obj) => {
                if (err || !obj) {
                    subscriber.error(utils_2.createError(this.log, 'Could not load certificates. This should not happen. Error: ' + err));
                    subscriber.complete();
                    return;
                }
                // TODO: store generated and load generated
                this.log.info(this.namespace);
                let certificateDefinition = utils_1.generateCertificate();
                subscriber.next(new cert_1.Cert(certificateDefinition.cert, certificateDefinition.private));
                subscriber.complete();
            });
        });
    }
}
exports.HueEmu = HueEmu;
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new HueEmu(options);
}
else {
    // otherwise start the instance directly
    (() => new HueEmu())();
}
