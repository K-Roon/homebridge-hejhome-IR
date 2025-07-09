import { CharacteristicValue } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';

export class IrLampAccessory extends IrBaseAccessory {
  constructor(...args: ConstructorParameters<typeof IrBaseAccessory>) {
    super(...args, 'Lightbulb');

    const { Characteristic } = this.platform.api.hap;

    this.service.getCharacteristic(Characteristic.On)
      .onSet(this.toggle.bind(this))
      .onGet(() => false);

    this.service.getCharacteristic(Characteristic.Brightness)
      .setProps({ minValue: 0, maxValue: 100, minStep: 100 }) // 0 또는 100
      .onSet(v => this.toggle(v as number > 0))
      .onGet(() => 0);
  }

  private async toggle(on: CharacteristicValue) {
    await this.fire(on ? 'on' : 'off');
  }
}
