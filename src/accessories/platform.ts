/* Homebridge platform entrypoint — resilient token acquisition */
import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';
import { SquareTokenService } from '../api/squareToken.js';

export class HejhomeIrPlatform implements DynamicPlatformPlugin {
  private readonly tokenSvc: SquareTokenService;

  constructor(
    private readonly log: Logger,
    private readonly config: PlatformConfig,
    private readonly api: API,
  ) {
    this.tokenSvc = new SquareTokenService(
      log,
      config.clientId ?? 'hejhomeapp',
      config.redirectUri ?? 'https://square.hej.so/blank.html',
    );

    api.on('didFinishLaunching', () =>
      this.init().catch((err) => log.error('Initialization failed:', err)),
    );
  }

  private async init(): Promise<void> {
    const { username, password } = this.config;
    if (!username || !password) {
      this.log.error('username / password missing in config.json');
      return;
    }

    /* 1️⃣ Square OAuth (안되면 경고만) */
    try {
      const token = await this.tokenSvc.getToken(username, password);
      token
        ? this.log.info(
            `Square OAuth OK (token …${token.access_token.slice(-6)})`,
          )
        : this.log.warn('Square OAuth returned null, falling back');
    } catch (e) {
      this.log.warn(`Square OAuth failed: ${(e as Error).message}`);
    }

    /* 2️⃣ 레거시 로그인 시도 — 실제 기기 로그인용 */
    await this.legacyLogin(username, password);

    /* 3️⃣ 기기 검색 & 액세서리 등록 */
    this.discoverDevices();
  }

  private async legacyLogin(id: string, pw: string): Promise<void> {
    /* TODO: Goqual HTTP API 로그인 구현 */
    this.log.debug(`legacy login for ${id} — stub OK`);
  }

  private discoverDevices(): void {
    /* TODO: 실제 기기 탐색 */
    this.log.debug('discoverDevices() placeholder');
  }

  /* 필수 스텁 */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.debug(`configureAccessory(${accessory.displayName})`);
  }
}
