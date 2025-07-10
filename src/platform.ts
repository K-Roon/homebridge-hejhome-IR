import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { HejhomeApiClient, HejhomeDevice, SUPPORTED_DEVICE_TYPES } from './api/GoqualClient.js';

const SUPPORTED_TYPES = new Set(SUPPORTED_DEVICE_TYPES);
import {
  IrFanAccessory,
  IrLampAccessory,
  IrTvAccessory,
} from './accessories/index.js';
import { IrStatelessSwitchAccessory } from './accessories/IrStatelessSwitchAccessory.js';

export function registerPlatform(api: API): void {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, HejhomeIRPlatform);
}

export class HejhomeIRPlatform implements DynamicPlatformPlugin {
  readonly accessories: PlatformAccessory[] = [];
  private readonly apiClient: HejhomeApiClient;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.apiClient = new HejhomeApiClient(config.host);

    this.api.on('didFinishLaunching', async () => {
      try {
        await this.apiClient.login(config.username, config.password);
        const devices = await this.apiClient.getIRDevices();
        const supported = devices.filter(d =>
          SUPPORTED_TYPES.has(d.deviceType as typeof SUPPORTED_DEVICE_TYPES[number])
        );
        const filtered = Array.isArray(config.deviceNames) && config.deviceNames.length
          ? supported.filter(d => config.deviceNames.includes(d.name))
          : supported;
        await this.syncAccessories(filtered);
      } catch (err) {
        this.log.error('Initialization failed:', err);
      }
    });
  }

  /** Homebridge 재기동 시 기존 액세서리 복원 */
  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory);
  }

  /** 새 디바이스와 비교해 추가/제거/업데이트 */
  private async syncAccessories(devices: HejhomeDevice[]): Promise<void> {
    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(device.id);
      let accessory = this.accessories.find(a => a.UUID === uuid);

      if (!accessory) {
        accessory = new this.api.platformAccessory(device.name, uuid);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      }

      // 장치 타입별로 액세서리 클래스 매핑
      switch (device.deviceType) {
        case 'IrAirconditioner':
        case 'IrAirpurifier':
          new IrStatelessSwitchAccessory(this, accessory, device, this.apiClient, 'power');
          break;
        case 'IrFan':
          new IrFanAccessory(this, accessory, device, this.apiClient);
          break;
        case 'IrLamp':
          new IrLampAccessory(this, accessory, device, this.apiClient);
          break;
        case 'IrTv':
          new IrTvAccessory(this, accessory, device, this.apiClient);
          break;
        default:
          this.log.warn('Unsupported device type:', device.deviceType);
      }
    }
  }
}
