import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrFanAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'Fan');

    const { Characteristic } = this.platform.api.hap;

    // 전원 (Active)
    this.service.getCharacteristic(Characteristic.Active)
      .onSet((v: CharacteristicValue) => this.handlePower(v as number))
      .onGet(() => 0);

    // 풍속 (RotationSpeed)
    this.service.getCharacteristic(Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
      .onSet((v: CharacteristicValue) => this.handleSpeed(v as number))
      .onGet(() => 0);

    // 회전 (SwingMode)
    this.service.getCharacteristic(Characteristic.SwingMode)
      .onSet((v: CharacteristicValue) => this.sendCommand('swing', "true")) // 토글형 버튼
      .onGet(() => 0);
  }

  private async handlePower(value: number) {
    await this.sendCommand('power', 'true'); // 켬/끔 토글
    this.reset(this.platform.api.hap.Characteristic.Active);
  }

  private async handleSpeed(percent: number) {
    if (percent === 0) {                   // 슬라이더 맨 아래 → 전원 토글
      await this.sendCommand('power', "false");
    } else if (percent <= 33) {
      await this.sendCommand('fanSpeed', "true");
    } else if (percent <= 66) {
      await this.sendCommand('fanSpeed', "true");
    } else {
      await this.sendCommand('fanSpeed', "true");
    }
    this.reset(this.platform.api.hap.Characteristic.RotationSpeed);
  }

  private reset(char: typeof this.platform.api.hap.Characteristic.Active | typeof this.platform.api.hap.Characteristic.RotationSpeed) {
    setTimeout(() => this.service.updateCharacteristic(char, 0), 500);
  }
}
