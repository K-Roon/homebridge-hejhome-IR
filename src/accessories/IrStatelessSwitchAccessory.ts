// src/accessories/IrStatelessSwitchAccessory.ts
import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrStatelessSwitchAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
    /** DIY IR 허브에 저장한 버튼 라벨 (예: '전원' 혹은 '채널+') */
    private readonly irCommand: string,
  ) {
    super(platform, accessory, device, 'Switch');
    const { Characteristic } = this.platform.api.hap;

    /** 항상 OFF로 보이는 Stateless 버튼 패턴 */
    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.activateSwitch.bind(this))
      .onGet(() => false);
  }

  /** 버튼 누름 → DIY API 전송 → 0.5 초 뒤 OFF 복원 */
  private async activateSwitch(value: CharacteristicValue): Promise<void> {
    if (value as boolean) {
      // 핵심:  "requirments": { "value": "<버튼 라벨>" }
      await this.sendCommand('value', this.irCommand);

      setTimeout(() => {
        this.service.updateCharacteristic(
          this.platform.api.hap.Characteristic.On,
          false,
        );
      }, 500);
    }
  }
}
