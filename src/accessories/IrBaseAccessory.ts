import { CommandValue, postIrCommand } from '../api/control.js';
import { Logger, PlatformAccessory, Service } from 'homebridge';
import { HejhomePlatform } from '../platform.js';
import { HejDevice } from '../api/get_devices.js';
import { Base } from './base.js';

export abstract class IrBaseAccessory extends Base {
  protected readonly log: Logger;
  protected readonly service: Service;

  constructor(
    protected readonly platform: HejhomePlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly device: HejDevice,
    serviceType: string,
  ) {
    super();
    this.log = platform.log;
    const { Service } = platform.api.hap;
    this.service =
      accessory.getService(serviceType) ??
      accessory.addService((Service as any)[serviceType], device.name);
  }

  /** commandName·value를 받아 API 호출 */
  protected async sendCommand(
    commandName: string,
    value: CommandValue,
  ): Promise<void> {
    try {
      await postIrCommand(this.platform, this.device.id, commandName, value);
      this.log.info(`${this.device.name} → ${commandName}:${value}`);
    } catch (e) {
      this.log.error('IR 전송 실패:', e);
    }
  }
}
