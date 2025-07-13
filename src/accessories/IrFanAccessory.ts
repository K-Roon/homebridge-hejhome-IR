import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';

export class IrFanAccessory extends IrBaseAccessory {
  private isOn = false;

  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    /* ① Fanv2 서비스로 교체해야 Swing 버튼 노출 */
    super(platform, accessory, device, 'Fanv2');

    const { Characteristic } = this.platform.api.hap;

    /* ───── 전원 ───── */
    this.service.getCharacteristic(Characteristic.Active)
      .onSet(v => this.handlePower(v as number))
      .onGet(() => (this.isOn ? 1 : 0));

    /* ───── 풍속 (33·67·100 %) ───── */
    this.service.getCharacteristic(Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 33 })
      .onSet(v => this.handleSpeed(v as number))
      .onGet(() => 0);          // 기본 0 %, 전원 OFF 상태

    /* ───── 회전(Swing) ───── */
    this.service.getCharacteristic(Characteristic.SwingMode)
      .onSet(v => this.sendCommand('swing', (v as number) ? 'true' : 'false'))
      .onGet(() => 0);          // 0 = OFF
  }

  /* 전원 ON → 기본 속도 33 % + fanSpeed 명령 */
  private async handlePower(value: number) {
    this.isOn = !!value;
    await this.sendCommand('power', this.isOn ? 'true' : 'false');
    if (this.isOn) {
      /* 팬 회전 속도를 33 % 로 초기 설정 */
      await this.sendCommand('fanSpeed', 'true');
      this.service.updateCharacteristic(
        this.platform.api.hap.Characteristic.RotationSpeed,
        33,
      );
    }
    /* 0.5 초 뒤 Active를 OFF로 복원해 ‘버튼’ 느낌 유지 */
    this.reset(this.platform.api.hap.Characteristic.Active);
  }

  /* 속도 슬라이더 처리 */
  private async handleSpeed(percent: number) {
    if (percent === 0) {
      await this.sendCommand('power', 'false');
      this.isOn = false;
    } else {
      const target =
        percent <= 34 ? 33 : percent <= 67 ? 67 : 100;

      if (target !== percent) {
        this.service.updateCharacteristic(
          this.platform.api.hap.Characteristic.RotationSpeed,
          target,
        );
      }
      await this.sendCommand('fanSpeed', 'true');  // IR 풍속 토글
      this.isOn = true;
    }
    this.reset(this.platform.api.hap.Characteristic.RotationSpeed);
  }

  /* 0.5 s 뒤 characteristic 값을 0으로 되돌려 stateless 버튼처럼 표시 */
  private reset(characteristic: any) {
    setTimeout(() => this.service.updateCharacteristic(characteristic, 0), 500);
  }
}
