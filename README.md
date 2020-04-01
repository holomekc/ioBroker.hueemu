![Logo](admin/hue-emu-logo.png)
# ioBroker.hueemu

[![NPM version](http://img.shields.io/npm/v/iobroker.hueemu.svg)](https://www.npmjs.com/package/iobroker.hueemu)
[![Downloads](https://img.shields.io/npm/dm/iobroker.hueemu.svg)](https://www.npmjs.com/package/iobroker.hueemu)
![Number of Installations (latest)](http://iobroker.live/badges/hueemu-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/hueemu-stable.svg)
[![Dependency Status](https://img.shields.io/david/holomekc/iobroker.hueemu.svg)](https://david-dm.org/Author/iobroker.hueemu)
[![Known Vulnerabilities](https://snyk.io/test/github/holomekc/ioBroker.hueemu/badge.svg)](https://snyk.io/test/github/Author/ioBroker.hueemu)

[![NPM](https://nodei.co/npm/iobroker.hueemu.png?downloads=true)](https://nodei.co/npm/iobroker.hueemu/)

[![Travis-CI](http://img.shields.io/travis/holomekc/ioBroker.hueemu/master.svg)](https://travis-ci.org/holomekc/ioBroker.hueemu) 

## hue emu adapter for ioBroker

This adapter allows to simulate a hue bridge with self created lights.

Work in progress. Feedback appreciated.

## Configuration
**host**: The ip address the server will be created for. E.g. 0.0.0.0

**port**: The port the server will listen to. E.g. 8070

**discoveryHost**: The address the server will use in discovery messages. E.g. 192.168.178.10
  
**discoveryPort**: The port the server will use in discovery messages. E.g. 80 (needed for Alexa)

**httpsPort**: If set the server will also start respond to https. E.g. 8071 (443 not needed for Alexa)
 
**mac**: Some service may check this value. You can pick the one of your interface

## How it works
When the configuration is done and the adapter is started you can 3 states in the object list of the adapter:
* createLight
* disableAuth
* startPairing

**startPairing**: When set to true or button pressed in ui the adapter will allows pairing request and register user for access. This mode lasts for 50s

**disableAuth**: You can enable this if you want that user validation is not done at all. Users will still be registered though.

**createLight**: I was thinking of making a fancy ui for light creation but most ideas I could come up with would only limit the flexibility regarding data used. So I was always ended up with a simple text field. So to add one or multiple lights you need to enter the specification into this state. You can use the wrapper.json file and one of the other templates to create a light. Let's make an example:

wrapper.json
```JSON
{
  "1": "<Set lightId and replace me>"
}
```
The wrapper template starts with a light id without a specification of a light. We could also add two lights
```JSON
{
  "1": "<Set lightId and replace me>",
  "2": "<Set lightId and replace me>"
}
```
Remember the id needs to be unique.

Ok now we want to specify the lights. Therefore, we want to have a simple on/off light and a dimmable light. We copy the content from the corresponding templates and the result should look like this:
```JSON
{
  "1": {
    "state": {
      "on": false,
      "reachable": true,
      "mode": "homeautomation",
      "alert": "none"
    },
    "type": "On/off light",
    "modelid": "Plug 01",
    "uniqueid": "e16ba9f9-1176-4979-9131-5e8ba8700167",
    "manufacturername": "OSRAM",
    "productname": "On/Off plug",
    "swversion": "V1.04.12",
    "name": "ioTest6",
    "config": {
      "archetype": "classicbulb",
      "function": "functional",
      "direction": "omnidirectional"
    },
    "capabilities": {
      "certified": false,
      "streaming": {
        "renderer": false,
        "proxy": false
      },
      "control": {}
    }
  },
  "2": {
    "state": {
      "on": false,
      "bri": 254,
      "reachable": true,
      "mode": "homeautomation",
      "alert": "none"
    },
    "type": "Dimmable light",
    "name": "ioBrokerTemplatedLight",
    "modelid": "LWB010",
    "uniqueid": "44df4f5f-49d9-4580-90f6-0790a59a77a1",
    "manufacturername": "Philips",
    "swversion": "11111",
    "config": {
      "archetype": "classicbulb",
      "function": "functional",
      "direction": "omnidirectional"
    },
    "capabilities": {
      "certified": true,
      "streaming": {
        "renderer": false,
        "proxy": false
      },
      "control": {
        "mindimlevel": 1000,
        "maxlumen": 250,
        "ct": {
          "min": 153,
          "max": 500
        }
      }
    }
  }
}
```
Now you just need to copy the content, set it as a value for the createLight state. The adapter will create some object based on the content you specified.

In ioBroker the adapter will represent a light like this:
* device: lightId
    * channel: state
        * Content specified in state property. E.g. "on"
    * name: Name of the light
    * data: Everything else you specified. This is basically static content which should never change. If you want to change it you have multiple options. Remove and add it again or use scripts to change the value of data. But check the structure first before changing it otherwise you may confuse the adapter.
    
## Troubleshooting

**Re-add lights**
Some devices like Alexa are quite picky when you try to re-add a light with different specification. You most likely need to change the name twice. E.g. bedroom_light -> temp_light -> bedroom_light. Otherwise, alexa might not recognize the device. 

**So many users**
Some devices like Alexa might add a lot of users to the adapter. To be honest I do not know what they are doing. They are spamming the pairing interface to create a user and then do not even use the user for the actual requests. Instead they use their own user. To make it work the adapter adds user when pairing is enabled even via other api calls. On debug level you can check which users are sending requests. When you think a user is not needed you can just delete it from users channel.

**No plug in Alexa App?**
Well... No. Sadly alexa seems to recognize lights only. And also does not allow to change the type in the app. I tried it with type: "On/Off plug-in unit" but then it is not controllable at all. I recommend to use the on-off-light instead.

## Tested integrations
* Alexa Echo Plus (1. Gen.)
* Bosch Smart Home Controller

Let me know if other integrations work as well.

## Changelog

### 0.0.2
* (holomekc) improve handling missing state keys

### 0.0.1
* (holomekc) initial version

## License

MIT License

Copyright (c) 2020 Christopher Holomek <holomekc.github@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
