import { CharacteristicValue } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';
import type { PlatformAccessory } from 'homebridge';

export class IrAirconditionerAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'HeaterCooler');

    const { Characteristic } = this.platform.api.hap;

    // 전원
    this.service.getCharacteristic(Characteristic.Active)
      .onSet(this.setActive.bind(this))
      .onGet(() => this.accessory.context.active ?? Characteristic.Active.INACTIVE);

    // 목표 온도
    this.service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({ minValue: 16, maxValue: 30, minStep: 1 })
      .onSet(this.setTargetTemp.bind(this));

    // 팬 속도 등을 추가 구현 가능
  }

  private async setActive(value: CharacteristicValue): Promise<void> {
    this.accessory.context.active = value;
    await this.sendCommand('power');
  }

  private async setTargetTemp(value: CharacteristicValue): Promise<void> {
    await this.sendCommand(`temperature:${Number(value)}`);
  }
}
