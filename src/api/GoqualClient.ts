export interface HejhomeDevice {
  id: string;
  name: string;
  deviceType: string;
  // Additional properties may be provided by Hejhome
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

  async getUser(): Promise<unknown> {
    const res = await this.request('/api/user');
    if (!res.ok) {
      throw new Error(`Failed to fetch user: ${res.status}`);
    }
    return await res.json();
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
