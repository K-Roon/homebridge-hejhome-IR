import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HejhomeApi } from './hejhomeApi';
import {
  IrAirconditionerAccessory,
  IrFanAccessory,
  IrLampAccessory,
  IrAirPurifierAccessory,
  IrTvAccessory,
} from './accessories';
import { HejhomeDevice } from './hejhomeApi';
import { IrStatelessSwitchAccessory } from './accessories/IrStatelessSwitchAccessory';

export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, HejhomeIRPlatform);
};

class HejhomeIRPlatform implements DynamicPlatformPlugin {
  readonly accessories: PlatformAccessory[] = [];
  private readonly apiClient: HejhomeApi;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.apiClient = new HejhomeApi(
      config.clientId,
      config.clientSecret,
      config.username,
      config.password,
    );

    this.api.on('didFinishLaunching', async () => {
      try {
        await this.apiClient.login();
        const devices = await this.apiClient.getIrDevices();
        await this.syncAccessories(devices);
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
        case 'IrAirpurifer':
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
