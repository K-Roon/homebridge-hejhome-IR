import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomeIRPlatform } from '../platform.js';
import { HejhomeDevice, HejhomeApiClient } from '../api/GoqualClient.js';

export class IrStatelessSwitchAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomeIRPlatform,
    accessory: PlatformAccessory,
    device: HejhomeDevice,
    api: HejhomeApiClient,
    private readonly irCommand: string,
  ) {
    super(platform, accessory, device, api, 'Switch');
    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.pushButton.bind(this))
      .onGet(() => false);           // 항상 OFF 표시
  }

  private async pushButton(value: CharacteristicValue): Promise<void> {
    if (value as boolean) {
      await this.fire(this.irCommand);
      setTimeout(() => {
        // 0.5초 뒤 상태를 OFF 로 되돌려 “버튼” 동작
        this.service.updateCharacteristic(
          this.platform.api.hap.Characteristic.On, false);
      }, 500);
    }
  }}