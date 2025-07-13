import ky from 'ky';
import { HejhomePlatform } from '../platform.js';

// src/api/request.ts
const BASE = 'https://goqual.io/openapi/';          // ✅ 도메인·루트 교체

export const hejRequest = async <Req = unknown, Res = unknown>(
  platform: HejhomePlatform,
  method: 'GET' | 'POST',
  path: string,
  data?: Req,
  expectJson = true,
) => {
  const url = `${BASE}${path}`;                     // ✅ dashboard → openapi

  const response = await ky(url, {
    method,
    headers: {
      Authorization: `Bearer ${platform.token}`,
      'Content-Type': 'application/json;charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
      Referer: 'https://square.hej.so/square',       // 그대로 두어도 무방
    },
    ...(data !== undefined && { json: data }),
    timeout: 10_000,
  });

  const txt = await response.text();
  return expectJson ? (JSON.parse(txt || '[]') as Res) : (txt as Res);
};
