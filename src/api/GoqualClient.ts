export interface HejhomeDevice {
  id: string;
  name: string;
  deviceType: string;
  // Additional properties may be provided by Hejhome
}

export class HejhomeApiClient {
  private token = '';

  constructor(private readonly host: string) {}

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
    return devices.filter(d => ['ir_air_conditioner', 'ir_fan', 'ir_lamp', 'ir_air_purifier', 'ir_tv'].includes(d.deviceType));
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
