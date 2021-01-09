/*
 * Created with @iobroker/create-adapter v1.21.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import {HueBuilder, HueServer, HueUpnp} from 'hue-emu';
import {HttpsConfig} from 'hue-emu/dist/builder/https-config';
import {generateCertificate} from 'hue-emu/dist/util/utils';
import {Observable, of} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import * as uuid from 'uuid';
import {Cert} from './cert';
import {FUNCTIONS} from './definition/functions';
import {HueEmuDefinition} from './definition/hue-emu-definition';
import {ROLES} from './definition/roles';
import {HueEmuLogger} from './hue-emu-logger';
import {HueHandler} from './hue-handler';
import {createError} from './util/utils';

// Load your modules here, e.g.:
// import * as fs from "fs";

// Augment the adapter.config object with the actual types
// TODO: delete this in the next version
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ioBroker {
        interface AdapterConfig {
            // Define the shape of your options here (recommended)
            host: string;
            port: number;
            discoveryHost: string;
            discoveryPort: number;
            httpsPort: number | undefined;
            udn: string;
            mac: string;
            upnpPort: number | undefined;

            // Or use a catch-all approach
            [key: string]: any;
        }
    }
}

export class HueEmu extends utils.Adapter {

    private timeoutId: any;

    private _pairingEnabled = false;
    private _disableAuth = false;

    private definition: HueEmuDefinition;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'hueemu',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.definition = new HueEmuDefinition(this);
    }

    get pairingEnabled(): boolean {
        return this._pairingEnabled;
    }

    set pairingEnabled(value: boolean) {
        this.setState('startPairing', {
            ack: true,
            val: value
        }, () => {
            this._pairingEnabled = value;
        });
    }

    get disableAuth(): boolean {
        return this._disableAuth;
    }

    set disableAuth(value: boolean) {
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
    private async onReady(): Promise<void> {
        this.log.silly('onReady called. Load configuration');

        this.config.host = this.config.host ? this.config.host.trim() : '';
        this.config.port = this.toPort(this.config.port);
        this.config.discoveryHost = this.config.discoveryHost ? this.config.discoveryHost.trim() : '';
        this.config.discoveryPort = this.toPort(this.config.discoveryPort);
        this.config.httpsPort = this.toUndefinedPort(this.config.httpsPort);
        this.config.udn = this.config.udn ? this.config.udn.trim() : uuid.v4();
        this.config.mac = this.config.mac ? this.config.mac.trim() : '';
        this.config.upnpPort = this.toDefaultPort(this.config.upnpPort, 1900);

        let hueBuilderUpnp = HueBuilder.builder().withHost(this.config.host).withPort(this.config.port)
            .withHttps(undefined).withDiscoveryHost(this.config.discoveryHost).withDiscoveryPort(this.config.discoveryPort)
            .withUdn(this.config.udn).withMac(this.config.mac).withUpnpPort(this.config.upnpPort);

        if (this.log.level === 'silly') {
            // There might be a lot of upnp communication which would flood the logs. So only on silly.
            hueBuilderUpnp.withLogger(new HueEmuLogger(this));
        }

        let certObservable: Observable<HttpsConfig | undefined>;

        if (this.config.httpsPort) {
            certObservable = this.loadCertificate().pipe(map(value => {
                return {
                    port: this.config.httpsPort as number,
                    cert: value.certificate,
                    key: value.privateKey
                }
            }));
        } else {
            certObservable = of(undefined);
        }

        certObservable.subscribe(httpsConfig => {
            let hueBuilder = HueBuilder.builder().withHost(this.config.host).withPort(this.config.port).withHttps(httpsConfig)
                .withDiscoveryHost(this.config.discoveryHost).withDiscoveryPort(this.config.discoveryPort)
                .withUdn(this.config.udn).withMac(this.config.mac).withLogger(new HueEmuLogger(this));

            new HueUpnp(hueBuilderUpnp);
            new HueServer(hueBuilder, new HueHandler(this, hueBuilder));
        });

        this.setObjectNotExists('createLight', {
            type: 'state',
            common: {
                name: 'createLight',
                read: true,
                write: true,
                role: 'state'
            },
            native: {},
        }, () => {
            this.initStartPairing().pipe(switchMap(() => {
                return this.initDisableAuth();
            })).subscribe(() => {
                this.subscribeStates('*');
            });
        });
    }

    private initStartPairing(): Observable<void> {
        return new Observable<void>(subscriber => {
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

    private initDisableAuth(): Observable<void> {
        return new Observable<void>(subscriber => {
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
                        this.disableAuth = state.val as boolean;
                    } else {
                        this.disableAuth = false;
                    }

                    subscriber.next();
                    subscriber.complete();
                });
            });
        });
    }

    private addState(id: string, name: string, value: any) {
        this.setObjectNotExists(id, {
            type: 'state',
            common: {
                name: name,
                type: typeof value as 'number' | 'string' | 'boolean' | 'array' | 'object' | 'mixed' | 'file',
                role: HueEmuDefinition.determineRole('state', name),
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
    private onUnload(callback: () => void): void {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     */
    private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

            if (!state.ack) {
                if (id === this.namespace + '.createLight') {
                    this.createLights(id, state);
                } else if (id === this.namespace + '.startPairing') {
                    if (this.timeoutId) {
                        clearTimeout(this.timeoutId);
                    }

                    this.pairingEnabled = state.val as boolean;
                    // TODO: config for pairing
                    this.timeoutId = setTimeout(() => this._pairingEnabled = false, 50000);
                } else if (id === this.namespace + '.disableAuth') {
                    this.disableAuth = state.val as boolean;
                } else {
                    // just ack everything else
                    this.setState(id, {ack: true, val: state.val});
                }
            }


        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    private createLights(id: string, state: ioBroker.State) {
        if (state.ack) {
            // ignoring
            return;
        }
        try {
            const lights = typeof state.val === 'object' ? state.val : JSON.parse(state.val as any);

            this.log.info(lights);

            Object.keys(lights).forEach(lightId => {
                try {
                    this.createLightsDevice(lightId, lights);
                    this.createLightsState(lightId, lights);
                    this.createLightsName(lightId, lights);
                    this.createLightsData(lightId, lights);

                    // ack change. Keep last created light so that multiple lights can be created easier.
                    this.setState(id, {ack: true, val: state.val});
                } catch (e) {
                    this.log.warn(`Could not create light with id=${lightId}` + e);
                }
            });
        } catch (err) {
            this.log.warn('Could not parse lights: ' + err);
        }
    }

    private createLightsDevice(lightId: string, lights: any) {
        this.setObjectNotExists(lightId, {
            type: 'device',
            common: {
                name: lights[lightId].name
            },
            native: {},
        });
    }

    private createLightsState(lightId: string, lights: any) {
        this.setObjectNotExists(`${lightId}.state`, {
            type: 'channel',
            common: {
                name: 'state'
            },
            native: {},
        }, (err, id) => {
            if (!err) {
                this.definition.addFunction(lightId, `state`, undefined as unknown as string);
            }
        });

        Object.keys(lights[lightId].state).forEach(stateKey => {
            this.addState(`${lightId}.state.${stateKey}`, stateKey, lights[lightId].state[stateKey]);
        });
    }

    private createLightsName(lightId: string, lights: any) {
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

    private createLightsData(lightId: string, lights: any) {
        const data = {};

        Object.keys(lights[lightId]).forEach(key => {
            if (key === 'state' || key === 'name') {
                // ignore
            } else {
                (data as any)[key] = lights[lightId][key];
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

    private toPort(port: any): number {
        if (port) {
            if (typeof port === 'number') {
                return port;
            } else {
                return parseInt(port.trim());
            }
        } else {
            throw new Error('Not all ports set');
        }
    }

    private toDefaultPort(port: any | undefined, defaultPort: number): number {
        let parsedPort = this.toUndefinedPort(port);

        if (parsedPort) {
            return parsedPort;
        } else {
            return defaultPort;
        }
    }

    private toUndefinedPort(port: any | undefined): number | undefined {
        if (port) {
            if (typeof port === 'number') {
                return port;
            } else {
                return parseInt(port);
            }
        } else {
            return undefined;
        }
    }

    private loadCertificate(): Observable<Cert> {
        return new Observable<Cert>(subscriber => {
            this.getForeignObject('system.certificates', (err, obj) => {
                if (err || !obj) {
                    subscriber.error(createError(this.log, 'Could not load certificates. This should not happen. Error: ' + err));
                    subscriber.complete();
                    return;
                }
                // TODO: store generated and load generated

                this.log.info(this.namespace);

                let certificateDefinition = generateCertificate();

                subscriber.next(new Cert(certificateDefinition.cert, certificateDefinition.private));
                subscriber.complete();
            });
        });
    }
}

if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new HueEmu(options);
} else {
    // otherwise start the instance directly
    (() => new HueEmu())();
}