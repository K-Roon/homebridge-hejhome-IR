import { CharacteristicValue } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';

export class IrTvAccessory extends IrBaseAccessory {
  constructor(...args: ConstructorParameters<typeof IrBaseAccessory>) {
    super(...args, 'Television');

    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.Active)
      .onSet(() => this.fire('power'))
      .onGet(() => 0);

    // HDMI 1 입력 전환 버튼 (별도 Switch)
    const hdmi1 = this.accessory.addService(
      this.platform.api.hap.Service.Switch, 'HDMI 1', 'hdmi1');

    hdmi1.getCharacteristic(Characteristic.On)
      .onSet(async v => {
        if (v) {
          await this.fire('hdmi1');
          setTimeout(() => hdmi1.updateCharacteristic(Characteristic.On, false), 500);
        }
      })
      .onGet(() => false);
  }
}
