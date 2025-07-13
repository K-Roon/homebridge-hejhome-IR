// src/accessories/IrTvAccessory.ts
import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';
import { CommandValue } from '../api/control.js';

export class IrTvAccessory extends IrBaseAccessory {
  private isOn = false;
  private currentChannel = 1;     // 1-999

  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'Television');

    const { Characteristic, Service } = this.platform.api.hap;

    /* ───── Television (전원·리모컨) ───── */
    this.service.setCharacteristic(Characteristic.ConfiguredName, device.name);
    this.service.setCharacteristic(Characteristic.SleepDiscoveryMode,
                                   Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);

    /* 전원 */
    this.service.getCharacteristic(Characteristic.Active)
      .onGet(() => (this.isOn ? 1 : 0))
      .onSet(v => this.handlePower(!!v as boolean));

    /* 리모컨 키 */
    this.service.getCharacteristic(Characteristic.RemoteKey)
      .onSet(v => this.handleRemoteKey(v as number));

    /* ───── Speaker (음소거·볼륨) ───── */
    const speaker = accessory.getService(Service.TelevisionSpeaker)
      ?? accessory.addService(Service.TelevisionSpeaker);

    speaker.setCharacteristic(Characteristic.Active, Characteristic.Active.ACTIVE);
    speaker.getCharacteristic(Characteristic.Mute)
      .onGet(() => false)
      .onSet(v => this.sendCommand('mute', v ? 'true' as CommandValue : 'false'));

    speaker.getCharacteristic(Characteristic.VolumeSelector)
      .onSet(v => this.sendCommand('volume', v === 0 ? 'up' : 'down'));

    /* ───── 채널 지정: Brightness 슬라이더 1-999 → 0-100 % ───── */
    this.service.getCharacteristic(Characteristic.Brightness)
      .setProps({ minValue: 1, maxValue: 100, minStep: 1 })
      .onGet(() => Math.round((this.currentChannel / 999) * 100))
      .onSet(v => this.handleSetChannel(v as number));
  }

  /* ===== 내부 핸들러 ===== */

  private async handlePower(on: boolean) {
    await this.sendCommand('power', on ? 'true' : 'false');
    this.isOn = on;
  }

  private async handleRemoteKey(key: number) {
    const RemoteKey = this.platform.api.hap.Characteristic.RemoteKey;
    switch (key) {
      case RemoteKey.ARROW_UP:
        await this.sendCommand('navigate', 'up');
        break;
      case RemoteKey.ARROW_DOWN:
        await this.sendCommand('navigate', 'down');
        break;
      case RemoteKey.ARROW_LEFT:
        await this.sendCommand('navigate', 'left');
        break;
      case RemoteKey.ARROW_RIGHT:
        await this.sendCommand('navigate', 'right');
        break;
      case RemoteKey.BACK:
        await this.sendCommand('back', 'true');
        break;
      case RemoteKey.EXIT:
        await this.sendCommand('exit', 'true');
        break;
      default:
        // 다른 키(PLAY/PAUSE 등)는 필요 시 추가
        break;
    }
  }

  private async handleSetChannel(sliderValue: number) {
    const channel = Math.max(1, Math.min(999, Math.round((sliderValue / 100) * 999)));
    await this.sendCommand('setChannel', channel as CommandValue);
    this.currentChannel = channel;
  }
}
