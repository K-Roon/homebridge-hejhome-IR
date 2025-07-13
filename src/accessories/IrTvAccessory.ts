import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';
import { CommandValue } from '../api/control.js';

export class IrTvAccessory extends IrBaseAccessory {
  private isOn = false;
  private currentChannel = 1;   // 1-999

  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    /* ①  TV 본체 서비스 */
    super(platform, accessory, device, 'Television');

    const { Characteristic, Service, Categories } = this.platform.api.hap;

    /* ②  TV 아이콘 지정 ─ 브리지에서 단 1개만 */
    accessory.category = Categories.TELEVISION;

    /* ③  TV 서비스 기본 설정 */
    this.service
      .setCharacteristic(Characteristic.ConfiguredName, device.name)
      .setCharacteristic(
        Characteristic.SleepDiscoveryMode,
        Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
      );

    /* 전원 */
    this.service.getCharacteristic(Characteristic.Active)
      .onGet(() => (this.isOn ? 1 : 0))
      .onSet(v => this.handlePower(!!v));

    /* 리모컨 키 */
    this.service.getCharacteristic(Characteristic.RemoteKey)
      .onSet(v => this.handleRemoteKey(v as number));

    /* ④  Speaker 서비스 (타일에 표시 안 됨) */
    const speaker = accessory.getService(Service.TelevisionSpeaker)
      ?? accessory.addService(Service.TelevisionSpeaker);

    speaker
      .setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE)
      .getCharacteristic(Characteristic.Mute)
      .onGet(() => false)
      .onSet(v => this.sendCommand('mute', v ? 'true' : 'false'));

    speaker.getCharacteristic(Characteristic.VolumeSelector)
      .onSet(v => this.sendCommand('volume', v === 0 ? 'up' : 'down'));

    /* TV와 연동 */
    this.service.addLinkedService(speaker);

    /* ⑤  채널 번호:  Brightness 슬라이더 1-999 */
    this.service.getCharacteristic(Characteristic.Brightness)
      .setProps({ minValue: 1, maxValue: 100, minStep: 1 })
      .onGet(() => Math.round((this.currentChannel / 999) * 100))
      .onSet(v => this.handleSetChannel(v as number));

    /* ⑥  HDMI 1 Switch 제거 → 아무 코드도 추가하지 않음 */
  }

  /* ===== 로컬 핸들러 ===== */

  private async handlePower(on: boolean) {
    await this.sendCommand('power', on ? 'true' : 'false');
    this.isOn = on;
  }

  private async handleRemoteKey(key: number) {
    const RemoteKey = this.platform.api.hap.Characteristic.RemoteKey;
    switch (key) {
      case RemoteKey.ARROW_UP:
        await this.sendCommand('navigate', 'up'); break;
      case RemoteKey.ARROW_DOWN:
        await this.sendCommand('navigate', 'down'); break;
      case RemoteKey.ARROW_LEFT:
        await this.sendCommand('navigate', 'left'); break;
      case RemoteKey.ARROW_RIGHT:
        await this.sendCommand('navigate', 'right'); break;
      case RemoteKey.BACK:
        await this.sendCommand('back', 'true'); break;
      case RemoteKey.EXIT:
        await this.sendCommand('exit', 'true'); break;
      default:
        break;
    }
  }

  private async handleSetChannel(slider: number) {
    const channel = Math.max(1, Math.min(999, Math.round((slider / 100) * 999)));
    await this.sendCommand('setChannel', channel as CommandValue);
    this.currentChannel = channel;
  }
}
