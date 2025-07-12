import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import {
  HejhomeApiClient,
  SUPPORTED_DEVICE_TYPES,
  type HejhomeDevice,
} from './api/GoqualClient.js';
import { obtainSquareToken } from './api/square-oauth.js';             // ✅ 새 OAuth 플로우
import {
  IrFanAccessory,
  IrLampAccessory,
  IrTvAccessory,
  IrStatelessSwitchAccessory,
} from './accessories/index.js';

const SUPPORTED_TYPES = new Set(SUPPORTED_DEVICE_TYPES);

export class HejhomePlatform implements DynamicPlatformPlugin {
  private readonly accessories: PlatformAccessory[] = [];
  private readonly apiClient: HejhomeApiClient;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    /* 기본 호스트는 goqual.io */
    const host = config.host ?? 'https://goqual.io';
    this.apiClient = new HejhomeApiClient(host, this.log);

    /* Homebridge가 플러그인 로딩을 끝낸 직후 실행 */
    this.api.on('didFinishLaunching', async () => {
      const email = config.username;
      const password = config.password;

      try {
        /* 1) Square OAuth 토큰 획득 */
        const { access_token } = await obtainSquareToken(email, password);

        /* 2) GoqualClient에 토큰 주입 — setAccessToken은 아래 참고 */
        this.apiClient.setAccessToken(access_token);

        /* 3) 기기 목록 조회 & 필터링 */
        const devices = await this.apiClient.getIRDevices();
        const target = Array.isArray(config.deviceNames) && config.deviceNames.length
          ? devices.filter(d => config.deviceNames.includes(d.name))
          : devices;

        /* 4) HomeKit 액세서리 동기화 */
        await this.syncAccessories(target);
      } catch (err) {
        this.log.error('Initialization failed:', err);
      }
    });
  }

  /** Homebridge 재기동 시 캐시된 액세서리 복원 */
  configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory);
  }

  /** IR 기기를 HomeKit 액세서리로 등록·업데이트 */
  private async syncAccessories(devices: HejhomeDevice[]): Promise<void> {
    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(device.id);
      let accessory = this.accessories.find(acc => acc.UUID === uuid);

      if (!accessory) {
        accessory = new this.api.platformAccessory(device.name, uuid);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.accessories.push(accessory);
      }

      /* 기기 타입별로 알맞은 액세서리 클래스 매핑 */
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

/* Homebridge가 플랫폼을 등록할 때 호출 */
export function registerPlatform(api: API): void {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, HejhomePlatform);
}
