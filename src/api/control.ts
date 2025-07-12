import { HejhomePlatform } from '../platform.js';
import { HejDeviceState } from './get_devices.js';
import { hejRequest } from './request.js';

export const control = async (
  platform: HejhomePlatform,
  deviceId: string,
  body: Data,
) => {
  const res = await hejRequest<Data, null>(platform, 'POST', `dashboard/control/${deviceId}`, body, false);

  platform.log.debug(`Control device: ${deviceId} ⇒ ${JSON.stringify(body)}`);

  return res;
};

export type Data = {
  requirments: HejDeviceState;
};

export const postIrCommand = async (
  platform: HejhomePlatform,
  deviceId: string,
  command: string,
) => {
  const res = await hejRequest<{ command: string }, null>(
    platform,
    'POST',
    `dashboard/control/${deviceId}`,
    { command },
    false,
  );

  platform.log.debug(`Send IR command: ${deviceId} ⇒ ${command}`);

  return res;
};
