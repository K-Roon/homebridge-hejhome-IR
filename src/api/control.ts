import { HejhomePlatform } from '../platform.js';
import { hejRequest } from './request.js';

/** API가 허용하는 값 타입 */
export type CommandValue = boolean | string | number;

/** POST /control 본문 형태 */
export interface CommandBody {
  requirments: Record<string, CommandValue>;
}

/** 범용 제어 함수 (여러 키 동시 전송용) */
export const control = async (
  platform: HejhomePlatform,
  deviceId: string,
  body: CommandBody,
) => {
  const res = await hejRequest<CommandBody, null>(
    platform,
    'POST',
    `dashboard/control/${deviceId}`,
    body,
    false,
  );
  platform.log.debug(`Control device: ${deviceId} ⇒ ${JSON.stringify(body)}`);
  return res;
};

/** 단일 IR 명령 전송용 */
export const postIrCommand = async (
  platform: HejhomePlatform,
  deviceId: string,
  commandName: string,
  command: CommandValue,
) => {
  const body: CommandBody = {
    requirments: { [commandName]: command },
  };

  const res = await hejRequest<CommandBody, null>(
    platform,
    'POST',
    `dashboard/control/${deviceId}`,
    body,
    false,
  );
  platform.log.debug(`Send IR command: ${deviceId} ⇒ ${JSON.stringify(body)}`);
  return res;
};
