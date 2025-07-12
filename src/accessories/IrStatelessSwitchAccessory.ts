import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrStatelessSwitchAccessory extends IrBaseAccessory {
  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
    private readonly irCommand: string,
  ) {
    super(platform, accessory, device, 'Switch');
    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.activateSwitch.bind(this))
      .onGet(() => false);           // 항상 OFF 표시
  }

  private async activateSwitch(value: CharacteristicValue): Promise<void> {
    if (value as boolean) {
      await this.sendCommand(this.irCommand);
      setTimeout(() => {
        // 0.5초 뒤 상태를 OFF 로 되돌려 “버튼” 동작
        this.service.updateCharacteristic(
          this.platform.api.hap.Characteristic.On, false);
      }, 500);
    }
  }
}
