import ky from 'ky';
import { HejhomePlatform } from '../platform.js';

/** ky 요청 래퍼 – 제네릭 제약 완화 */
export const hejRequest = async <
  Req = unknown,                      // 제약 제거
  Res = unknown
>(
  platform: HejhomePlatform,
  method: 'GET' | 'POST',
  path: string,
  data?: Req,
  expectJson = true,
) => {
  const url = `https://square.hej.so/${path}`;

  const response = await ky(url, {
    method,
    headers: {
      authorization: `Bearer ${platform.token}`,
      'x-requested-with': 'XMLHttpRequest',
      Referer: 'https://square.hej.so/square',
    },
    /* ky는 옵션 이름이 json → json, body → rawBody */
    ...(data !== undefined && { json: data }),
  });

  const text = await response.text();
  return expectJson ? (JSON.parse(text || '[]') as Res) : (text as unknown as Res);
};
