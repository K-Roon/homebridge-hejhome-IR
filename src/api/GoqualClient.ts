import type { Logger } from 'homebridge';
import { obtainSquareToken } from './squareToken.js';

export interface HejhomeDevice {
  id: string;
  name: string;
  deviceType: string;
  // Additional properties may be provided by Hejhome
}

export interface HejDeviceState {
  power?: boolean;
  lightMode?: 'WHITE' | 'COLOR' | 'SCENE';
  hsvColor?: {
    hue: number;
    saturation: number;
    brightness: number;
  };
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

export class HejhomeApiClient {
  private token = '';

  constructor(private readonly host: string) {}

  private static readonly CLIENT_ID = 'e08a10573e37452daf2b948b390d5ef7';
  private static readonly CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12';

  async login(username: string, password: string): Promise<void> {
    const res = await fetch(`${this.host}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error(`Failed to login: ${res.status}`);
    }

    const data = await res.json() as { token: string };
    this.token = data.token;
  }

  async getToken(
    clientId: string = HejhomeApiClient.CLIENT_ID,
    clientSecret: string = HejhomeApiClient.CLIENT_SECRET,
    username: string,
    password: string,
  ): Promise<void> {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${this.host}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get token: ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string };
    this.token = data.access_token;
  }

  async getTokenFromSquare(log: Logger, email: string, password: string): Promise<void> {
    const token = await obtainSquareToken(log, email, password);
    if (!token) {
      throw new Error('Failed to retrieve token from Hej Square');
    }
    this.token = token;
  }

  async getUser(): Promise<MemberList> {
    const res = await this.request('/dashboard/config/user');
    if (!res.ok) {
      throw new Error(`Failed to fetch user: ${res.status}`);
    }
    return await res.json() as MemberList;
  }

  async getDevicesState(familyId: number, roomId?: number): Promise<HejhomeDevice[]> {
    const path = roomId
      ? `/dashboard/${familyId}/room/${roomId}/devices-state?scope=shop`
      : `/dashboard/${familyId}/devices-state?scope=shop`;
    const res = await this.request(path);
    if (!res.ok) {
      throw new Error(`Failed to fetch devices state: ${res.status}`);
    }
    return await res.json() as HejhomeDevice[];
  }

  async controlDevice(deviceId: string, body: { requirments: HejDeviceState }): Promise<void> {
    const res = await this.request(`/dashboard/control/${deviceId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Failed to control device: ${res.status}`);
    }
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.host}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
      ...options,
    });
    return response;
  }

  async getDevices(): Promise<HejhomeDevice[]> {
    const res = await this.request('/api/devices');
    if (!res.ok) {
      throw new Error(`Failed to fetch devices: ${res.status}`);
    }
    return await res.json() as HejhomeDevice[];
  }

  async getIRDevices(): Promise<HejhomeDevice[]> {
    const devices = await this.getDevices();
    return devices.filter(d => SUPPORTED_DEVICE_TYPES.includes(d.deviceType as typeof SUPPORTED_DEVICE_TYPES[number]));
  }

  async sendIRCommand(deviceId: string, command: string): Promise<void> {
    const res = await this.request(`/api/ir/devices/${deviceId}/commands`, {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
    if (!res.ok) {
      throw new Error(`Failed to send command: ${res.status}`);
    }
  }
}
