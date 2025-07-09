import { CharacteristicValue } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';

export class IrFanAccessory extends IrBaseAccessory {
  constructor(...args: ConstructorParameters<typeof IrBaseAccessory>) {
    super(...args, 'Fan');

    const { Characteristic } = this.platform.api.hap;

    // 전원 (Active)
    this.service.getCharacteristic(Characteristic.Active)
      .onSet(v => this.handlePower(v as number))
      .onGet(() => 0);

    // 풍속 (RotationSpeed)
    this.service.getCharacteristic(Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 1 })
      .onSet(v => this.handleSpeed(v as number))
      .onGet(() => 0);

    // 회전 (SwingMode)
    this.service.getCharacteristic(Characteristic.SwingMode)
      .onSet(v => this.fire(v ? 'oscillate' : 'oscillate')) // 토글형 버튼
      .onGet(() => 0);
  }

  private async handlePower(value: number) {
    await this.fire('power');              // 켬/끔 토글
    this.reset(Characteristic.Active);
  }

  private async handleSpeed(percent: number) {
    if (percent === 0) {                   // 슬라이더 맨 아래 → 전원 토글
      await this.fire('power');
    } else if (percent <= 33) {
      await this.fire('speedLow');
    } else if (percent <= 66) {
      await this.fire('speedMed');
    } else {
      await this.fire('speedHigh');
    }
    this.reset(this.platform.api.hap.Characteristic.RotationSpeed);
  }

  private reset(char) {
    setTimeout(() => this.service.updateCharacteristic(char, 0), 500);
  }
}
