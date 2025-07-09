export interface HejhomeDevice {
  id: string;
  name: string;
  // Additional properties may be provided by Hejhome
}

export class HejhomeApiClient {
  constructor(private readonly host: string, private readonly token: string) {}

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

  async getIRDevices(): Promise<HejhomeDevice[]> {
    const res = await this.request('/api/ir/devices');
    if (!res.ok) {
      throw new Error(`Failed to fetch devices: ${res.status}`);
    }
    return await res.json() as HejhomeDevice[];
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
