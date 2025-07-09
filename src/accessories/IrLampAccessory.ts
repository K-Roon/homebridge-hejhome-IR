import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomeIRPlatform } from '../platform.js';
import { HejhomeDevice, HejhomeApiClient } from '../api/GoqualClient.js';

export class IrLampAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomeIRPlatform,
    accessory: PlatformAccessory,
    device: HejhomeDevice,
    api: HejhomeApiClient,
  ) {
    super(platform, accessory, device, api, 'Lightbulb');

    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.toggle.bind(this))
      .onGet(() => false);

    this.service.getCharacteristic(Characteristic.Brightness)
      .setProps({ minValue: 0, maxValue: 100, minStep: 100 }) // 0 또는 100
      .onSet((v: CharacteristicValue) => this.toggle(v as number > 0))
      .onGet(() => 0);
  }

  private async toggle(on: CharacteristicValue) {
    await this.fire(on ? 'on' : 'off');
  }
}
