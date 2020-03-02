import {HueEmu} from '../main';
import {FUNCTIONS} from './functions';
import {ROLES} from './roles';

export class HueEmuDefinition {

    protected chain = Promise.resolve();

    constructor(private adapter: HueEmu) {
    }

    public addFunction(device: string, channel: string, state: string) {
        let name = HueEmuDefinition.determineFunction(channel);

        if (name) {
            name = name.trim().toLowerCase().replace(/ /g, '_');

            if (name && name.length > 0) {
                // we need to make sure that the value exists to prevent crashing ioBroker
                if (state) {
                    this.chain = this.chain.then(() => this.adapter.addStateToEnumAsync('functions', name, device, channel, state));
                } else {
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
    private static determineFunction(channel: string): string {
        const func = FUNCTIONS[channel];
        if (func !== null && typeof func !== 'undefined') {
            return func;
        }
        return undefined as unknown as string;
    }

    /**
     * Get role of device states
     * @param channel
     *        channel
     * @param key
     *        key of a state
     * @return role
     */
    public static determineRole(channel: string, key: string): string {
        const roleType = ROLES[channel];

        if (roleType !== null && typeof roleType !== 'undefined') {
            const role = roleType[key];

            if (role !== null && typeof role !== 'undefined') {
                return role;
            }
        }

        return 'state';
    }
}