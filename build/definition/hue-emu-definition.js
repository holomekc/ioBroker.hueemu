"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HueEmuDefinition = void 0;
const functions_1 = require("./functions");
const roles_1 = require("./roles");
class HueEmuDefinition {
    constructor(adapter) {
        this.adapter = adapter;
        this.chain = Promise.resolve();
    }
    addFunction(device, channel, state) {
        let name = HueEmuDefinition.determineFunction(channel);
        if (name) {
            name = name.trim().toLowerCase().replace(/ /g, '_');
            if (name && name.length > 0) {
                // we need to make sure that the value exists to prevent crashing ioBroker
                if (state) {
                    this.chain = this.chain.then(() => this.adapter.addStateToEnumAsync('functions', name, device, channel, state));
                }
                else {
                    this.chain = this.chain.then(() => this.adapter.addChannelToEnumAsync('functions', name, device, channel));
                }
            }
        }
    }
    /**
     * Determine function for channel
     * @param channel to specify function for
     * @return function
     */
    static determineFunction(channel) {
        const func = functions_1.FUNCTIONS[channel];
        if (func !== null && typeof func !== 'undefined') {
            return func;
        }
        return undefined;
    }
    /**
     * Get role of device states
     * @param channel
     *        channel
     * @param key
     *        key of a state
     * @return role
     */
    static determineRole(channel, key) {
        const roleType = roles_1.ROLES[channel];
        if (roleType !== null && typeof roleType !== 'undefined') {
            const role = roleType[key];
            if (role !== null && typeof role !== 'undefined') {
                return role;
            }
        }
        return 'state';
    }
}
exports.HueEmuDefinition = HueEmuDefinition;
