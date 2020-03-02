export const ROLES: { [TypeName: string]: { [KeyName: string]: string } } = {
    state: {
        on: 'switch.light',
        reachable: 'indicator.reachable',
        mode: 'text',
        alert: 'text',
        colormode: 'text',
        bri: 'level.dimmer',
        // TODO: not sure if this is suitable
        ct: 'level.color.temperature',
        hue: 'level.color.hue',
        sat: 'level.color.saturation',
        effect: 'text'
    }
};