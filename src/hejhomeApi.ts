import ky from 'ky';

export interface HejhomeDevice {
  id: string;
  name: string;
  deviceType: string;
  online: boolean;
}

export type IrType =
  | 'IrAirconditioner'
  | 'IrFan'
  | 'IrLamp'
  | 'IrAirpurifer'
  | 'IrTv';

interface ControlPayload {
  command: string;
  value?: number | string;
}

export class HejhomeApi {
  private readonly api = ky.create({
    prefixUrl: 'https://goqual.io/openapi',
    headers: { 'User-Agent': 'homebridge-hejhome-ir' },
    hooks: {
      beforeRequest: [
        request => {
          request.headers.set('Authorization', `Bearer ${this.accessToken}`);
        },
      ],
    },
  });

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly userId: string,
    private readonly userPw: string,
    private accessToken = '',
    private refreshToken = '',
  ) {}

  /** 최초 로그인 → access / refresh 토큰 획득 */
  async login(): Promise<void> {
    const basic = Buffer.from(`${this.userId}:${this.userPw}`).toString('base64');
    const res = await ky.post('https://goqual.io/oauth/login?vendor=openapi', {
      headers: { Authorization: `Basic ${basic}` },
    }).json<{ code: string }>();

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const tokenRes = await ky.post('https://goqual.io/oauth/token', {
      searchParams: {
        grant_type: 'authorization_code',
        code: res.code,
        redirect_uri: 'https://localhost/oauth',
      },
      headers: { Authorization: `Basic ${auth}` },
    }).json<{ access_token: string; refresh_token: string }>();

    this.accessToken = tokenRes.access_token;
    this.refreshToken = tokenRes.refresh_token;
  }

  /** 토큰 만료 시 호출 */
  async refresh(): Promise<void> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const tokenRes = await ky.post('https://goqual.io/oauth/token', {
      headers: { Authorization: `Basic ${auth}` },
      form: { grant_type: 'refresh_token', refresh_token: this.refreshToken },
    }).json<{ access_token: string; refresh_token: string }>();

    this.accessToken = tokenRes.access_token;
    this.refreshToken = tokenRes.refresh_token;
  }

  /** IR 지원 장치 검색 */
  async getIrDevices(): Promise<HejhomeDevice[]> {
    const list = await this.api.get('devices').json<HejhomeDevice[]>();
    return list.filter(d =>
      ['IrAirconditioner', 'IrFan', 'IrLamp', 'IrAirpurifer', 'IrTv'].includes(d.deviceType),
    ) as HejhomeDevice[];
  }

  /** 단일 장치 제어 */
  async control(deviceId: string, payload: ControlPayload): Promise<void> {
    await this.api.post(`control/${deviceId}`, { json: payload });
  }

  /** 편의 메서드: 공통 IR 명령 */
  async sendIr(deviceId: string, command: string, value?: number | string): Promise<void> {
    await this.control(deviceId, { command, value });
  }
}
