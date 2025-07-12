import type { Logger } from 'homebridge';
import { obtainSquareToken } from './squareToken.js';
import { Buffer } from 'node:buffer';

export interface HejhomeDevice {
  id: string;
  name: string;
  deviceType: string;
}

export interface HejDeviceState {
  power?: boolean;
  lightMode?: 'WHITE' | 'COLOR' | 'SCENE';
  hsvColor?: { hue: number; saturation: number; brightness: number };
  brightness?: number;
  sceneValues?: string;
  power1?: boolean;
  power2?: boolean;
  battery?: number;
}

export interface Member {
  homeName: string;
  admin: boolean;
  name: string;
  uid: string;
  homeId: string | null;
  memberAccount: string;
}

export interface MemberList {
  member: Member[];
}

export const SUPPORTED_DEVICE_TYPES = [
  'IrAirconditioner',
  'IrLamp',
  'IrFan',
  'IrAirpurifier',
  'IrTv',
] as const;

/**
 * REST-API 클라이언트
 */
export class HejhomeApiClient {
  private token = '';

  private static readonly CLIENT_ID = 'e08a10573e37452daf2b948b390d5ef7';
  private static readonly CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12';

  constructor(
    private readonly host: string,
    private readonly log: Logger,
  ) { }

  /* --------------------------------------------------------
   * 1) 레거시 /openapi/login (JWT 방식)
   * ------------------------------------------------------ */
  async login(username: string, password: string): Promise<void> {
    const url = `${this.host}/oauth/login?vendor=openapi`;
    const auth = 'Basic ' +
      Buffer.from(`${username}:${password}`).toString('base64');

    this.log.debug(`POST ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth },   // ✅ Basic Auth
    });

    if (!res.ok) {
      throw new Error(`Failed to login: ${res.status} ${res.statusText}`);
    }

    const { access_token } = await res.json();
    this.token = access_token;            // ✅ Homebridge 요청용 Bearer
  }

  /* --------------------------------------------------------
   * 2) OAuth 2.0 /oauth/token (password grant)
   * ------------------------------------------------------ */
  async getToken(
    clientId: string = HejhomeApiClient.CLIENT_ID,
    clientSecret: string = HejhomeApiClient.CLIENT_SECRET,
    username: string,
    password: string,
  ): Promise<void> {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const url = `${this.host}/oauth/token`;
    this.log.debug(`POST ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error(`Failed to get token: ${res.status}`);

    const { access_token } = (await res.json()) as { access_token: string };
    this.token = access_token;
  }

  /* --------------------------------------------------------
   * 3) Square OAuth (권장: 2FA 계정도 지원)
   * ------------------------------------------------------ */
  async getTokenFromSquare(
    email: string,
    password: string,
  ): Promise<void> {
    const token = await obtainSquareToken(this.log, email, password);
    if (!token) {
      throw new Error('Failed to retrieve token from Hej Square.');
    }
    this.token = token;
  }

  /* --------------------------------------------------------
   * 사용자 · 디바이스 API
   * ------------------------------------------------------ */
  async getUser(): Promise<MemberList> {
    const res = await this.request('/openapi/user');
    if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
    return (await res.json()) as MemberList;
  }

  async getDevices(): Promise<HejhomeDevice[]> {
    const res = await this.request('/openapi/devices');
    if (!res.ok) throw new Error(`Failed to fetch devices: ${res.status}`);
    return (await res.json()) as HejhomeDevice[];
  }

  async getIRDevices(): Promise<HejhomeDevice[]> {
    const devices = await this.getDevices();
    return devices.filter((d) =>
      SUPPORTED_DEVICE_TYPES.includes(d.deviceType as (typeof SUPPORTED_DEVICE_TYPES)[number]),
    );
  }

  async getDevicesState(): Promise<HejhomeDevice[]> {
    const res = await this.request('/openapi/devices/state');
    if (!res.ok) throw new Error(`Failed to fetch devices state: ${res.status}`);
    return (await res.json()) as HejhomeDevice[];
  }

  async controlDevice(deviceId: string, body: { requirments: HejDeviceState }): Promise<void> {
    const res = await this.request(`/openapi/control/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to control device: ${res.status}`);
  }

  async sendIRCommand(deviceId: string, command: string): Promise<void> {
    const res = await this.request(`/openapi/control/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    if (!res.ok) throw new Error(`Failed to send command: ${res.status}`);
  }

  /* --------------------------------------------------------
   * 공통 요청 래퍼
   * ------------------------------------------------------ */
  private async request(path: string, opts: RequestInit = {}): Promise<Response> {
    const url = `${this.host}${path}`;
    const method = opts.method ?? 'GET';
    this.log.debug(`${method} ${url}`);
    return fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...opts.headers,
      },
    });
  }
}