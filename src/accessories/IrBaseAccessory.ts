import { Logger, PlatformAccessory, Service } from 'homebridge';
import { HejhomeIRPlatform } from '../platform.js';
import { HejhomeDevice, HejhomeApiClient } from '../api/GoqualClient.js';

export abstract class IrBaseAccessory {
  protected readonly log: Logger;
  protected readonly service: Service;

  constructor(
    protected readonly platform: HejhomeIRPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly device: HejhomeDevice,
    protected readonly api: HejhomeApiClient,
    serviceType: string,
  ) {
    this.log = platform.log;
    const { Service } = platform.api.hap;
    this.service = accessory.getService(serviceType)
      ?? accessory.addService((Service as any)[serviceType], device.name);
  }

  protected async fire(cmd: string): Promise<void> {
    try {
      await this.api.sendIRCommand(this.device.id, cmd);
      this.log.debug(`${this.device.name} → ${cmd}`);
    } catch (e) {
      this.log.error('IR 전송 실패:', e);
    }
  }
}
