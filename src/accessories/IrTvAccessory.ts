import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrTvAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'Television');

    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.Active)
      .onSet(() => this.sendCommand('power'))
      .onGet(() => 0);

    // HDMI 1 입력 전환 버튼 (별도 Switch)
    const hdmi1 = this.accessory.addService(
      this.platform.api.hap.Service.Switch, 'HDMI 1', 'hdmi1');

    hdmi1.getCharacteristic(Characteristic.On)
      .onSet(async (v: CharacteristicValue) => {
        if (v) {
          await this.sendCommand('hdmi1');
          setTimeout(() => hdmi1.updateCharacteristic(Characteristic.On, false), 500);
        }
      })
      .onGet(() => false);
  }
}
