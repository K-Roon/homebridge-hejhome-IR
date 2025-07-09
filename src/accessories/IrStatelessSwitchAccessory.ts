import { CharacteristicValue } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';

export class IrStatelessSwitchAccessory extends IrBaseAccessory {
  constructor(
    ...args: ConstructorParameters<typeof IrBaseAccessory>,
    private readonly irCommand: string,
  ) {
    super(...args, 'Switch');
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
  }
}