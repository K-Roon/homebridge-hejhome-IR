// src/accessories/IrAirconditionerAccessory.ts
import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { IrBaseAccessory } from './IrBaseAccessory.js';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';
import { CommandValue } from '../api/control.js';

export class IrAirconditionerAccessory extends IrBaseAccessory {
  private isOn = false;
  private mode = 2;            // 0 cool, 1 heat, 2 auto
  private targetTemp = 24;
  private fan = 0;             // 0~3
  private swing = false;

  constructor(
    platform: HejhomePlatform,
    accessory: PlatformAccessory,
    device: HejDevice,
  ) {
    super(platform, accessory, device, 'HeaterCooler');

    const { Characteristic } = this.platform.api.hap;

    /* 필수 특성 -------------------------------------------------- */
    this.service.getCharacteristic(Characteristic.Active)
      .onGet(() => (this.isOn ? 1 : 0))
      .onSet(v => this.setActive(!!v));

    this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .setProps({ validValues: [0, 1, 2] })              // AUTO / HEAT / COOL
      .onGet(() => this.mode)
      .onSet(v => this.setMode(v as number));

    /* 온도 ------------------------------------------------------- */
    this.service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({ minValue: 18, maxValue: 30, minStep: 1 })
      .onGet(() => this.targetTemp)
      .onSet(v => this.setTemperature(v as number));

    this.service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({ minValue: 18, maxValue: 30, minStep: 1 })
      .onGet(() => this.targetTemp)
      .onSet(v => this.setTemperature(v as number));

    /* 팬 속도 ---------------------------------------------------- */
    this.service.getCharacteristic(Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: 100, minStep: 33 })
      .onGet(() => this.fan * 33)                       // 0-33-66-99
      .onSet(v => this.setFanSpeed(v as number));

    /* 스윙(바람 방향 자동) -------------------------------------- */
    this.service.getCharacteristic(Characteristic.SwingMode)
      .onGet(() => (this.swing ? 1 : 0))
      .onSet(v => this.setSwing(!!v));

    /* 선택 특성 -------------------------------------------------- */
    this.service.getCharacteristic(Characteristic.CurrentTemperature)
      .onGet(() => 25);                                // 외부 센서와 연동 가능

    this.service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .onGet(() => 0);                                 // 섭씨 고정
  }

  /* ========== SET 핸들러들 ========== */

  private async setActive(on: boolean) {
    await this.sendCommand('power', on ? 'true' : 'false');
    this.isOn = on;
  }

  private async setMode(state: number) {
    const map: Record<number, string> = { 2: '0', 1: '1', 0: '2' }; // COOL/HEAT/AUTO
    await this.sendCommand('mode', map[state] as CommandValue);
    this.mode = state;
  }

  private async setTemperature(temp: number) {
    this.targetTemp = Math.round(temp);
    await this.sendCommand('temperature', this.targetTemp as CommandValue);
  }

  private async setFanSpeed(percent: number) {
    const step = Math.round(percent / 33);              // 0~3
    await this.sendCommand('fanSpeed', String(step) as CommandValue);
    this.fan = step;
  }

  private async setSwing(on: boolean) {
    await this.sendCommand('swing', on ? 'true' : 'false');
    this.swing = on;
  }
}
