import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrLampAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'Lightbulb');

    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.setPowerState.bind(this))
      .onGet(() => false);

    this.service.getCharacteristic(Characteristic.Brightness)
      .setProps({ minValue: 0, maxValue: 100, minStep: 100 }) // 0 또는 100
      .onSet((v: CharacteristicValue) => this.setPowerState(v as number > 0))
      .onGet(() => 0);
  }

  private async setPowerState(on: CharacteristicValue) {
    await this.sendCommand(on ? 'on' : 'off');
  }
}
