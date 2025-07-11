/* Hej Square OAuth helper — patched 2025-07-11 */
import { URL, URLSearchParams } from 'url';
import type { Logger } from 'homebridge';

export interface SquareToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}


export async function obtainSquareToken(
  log: Logger,
  email: string,
  password: string,
): Promise<string | null> {
  const makeAuth = (id: string, pw: string) =>
    'Basic ' + Buffer.from(`${id}:${pw}`).toString('base64');

  const HEJ_CLIENT_ID = '62f4020744ca4510827d3b4a4d2c7e7f';
  const HEJ_CLIENT_SECRET = 'fcd4302cece447a9ab009296f649d2c0';

  /* 1️⃣  Basic-Auth 로그인 → JSESSIONID */
  const loginRes = await fetch('https://square.hej.so/oauth/login?vendor=shop', {
    method: 'POST',
    headers: { authorization: makeAuth(email, password) },
    redirect: 'manual',
  });
  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const jsession = /JSESSIONID=([^;]+)/.exec(setCookie)?.[1];
  if (!jsession) { log.error('JSESSIONID 얻기 실패'); return null; }

  /* 2️⃣  GET /oauth/authorize → code */
  const username = encodeURIComponent(email);
  const cookie = `username=${username}; JSESSIONID=${jsession}`;
  const authURL =
    `https://square.hej.so/oauth/authorize?client_id=${HEJ_CLIENT_ID}` +
    `&redirect_uri=https%3A%2F%2Fsquare.hej.so%2Flist&response_type=code&scope=shop`;

  const authRes = await fetch(authURL, {
    method: 'GET',
    headers: { cookie },
    redirect: 'manual',
  });
  const location = authRes.headers.get('location') ?? '';
  const codeMatch = /code=([^&]+)/.exec(location);
  if (!codeMatch) { log.error('authorization code 획득 실패'); return null; }
  const code = codeMatch[1];

  /* 3️⃣  POST /oauth/token → access_token */
  const tokenRes = await fetch('https://square.hej.so/oauth/token', {
    method: 'POST',
    headers: {
      authorization: makeAuth(HEJ_CLIENT_ID, HEJ_CLIENT_SECRET),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HEJ_CLIENT_ID,
      redirect_uri: 'https://square.hej.so/list',
    }),
  });
  if (!tokenRes.ok) { log.error(`token 교환 실패 ${tokenRes.status}`); return null; }
  const { access_token } = await tokenRes.json() as { access_token: string };
  return access_token;
}


export class SquareTokenService {
  private log: Logger;
  private clientId: string;
  private redirectUri: string;
  private userAgent =
    'homebridge-hejhome-ir/0.0.99 (+https://github.com/k-roon/homebridge-hejhome-ir)';

  constructor(log: Logger, clientId: string, redirectUri: string) {
    this.log = log;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  /** 3-leg OAuth: login → code → token */
  public async getToken(
    username: string,
    password: string,
  ): Promise<SquareToken | null> {
    const cookie = await this.loginAndGetCookie(username, password);
    if (!cookie) return null;

    const code = await this.getCode(cookie);
    if (!code) return null;

    return this.exchangeCode(code, cookie);
  }

  /* ---------- private ---------- */
  private async loginAndGetCookie(id: string, pw: string): Promise<string | null> {
    /* ---------- 1) 쿠키 선취 ---------- */
    const pre = await fetch(
      `https://square.hej.so/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}`,
      { redirect: 'manual' },
    );

    if (![302, 303].includes(pre.status)) {
      this.log.warn(`Square authorize failed ${pre.status}`);
      return null;
    }

    /* 쿠키·XSRF 추출 */
    const rawCookie = pre.headers.get('set-cookie') ?? '';
    const xsrf = /XSRF-TOKEN=([^;]+)/.exec(rawCookie)?.[1];
    if (!xsrf) { this.log.warn('No XSRF token'); return null; }

    /* ---------- 2) 실제 로그인 ---------- */
    const post = await fetch('https://square.hej.so/oauth/login', {
      method: 'POST',
      headers: {
        Cookie: rawCookie,
        'X-XSRF-TOKEN': xsrf,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({ loginId: id, password: pw }),
      redirect: 'manual',
    });

    if (![302, 303].includes(post.status)) {
      this.log.warn(`Square login failed ${post.status}`);
      return null;
    }

    /* 쿠키 병합해 세션 반환 */
    return rawCookie + '; ' + (post.headers.get('set-cookie') ?? '');
  }

  private async getCode(cookie: string): Promise<string | null> {
    const url = new URL('https://square.hej.so/oauth/authorize');
    url.search = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid offline_access',
      redirect_uri: this.redirectUri,
    }).toString();

    const res = await fetch(url, {
      headers: {
        Cookie: cookie,
        'X-XSRF-TOKEN': this.extractXsrf(cookie),
        'User-Agent': this.userAgent,
      },
      redirect: 'manual',
    });

    if (![302, 303, 307].includes(res.status)) return null;
    const m = /[?&]code=([^&]+)/.exec(res.headers.get('location') ?? '');
    return m ? decodeURIComponent(m[1]) : null;
  }

  private async exchangeCode(
    code: string,
    cookie: string,
  ): Promise<SquareToken | null> {
    const res = await fetch('https://square.hej.so/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        'X-XSRF-TOKEN': this.extractXsrf(cookie),
        'User-Agent': this.userAgent,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    return res.ok ? ((await res.json()) as SquareToken) : null;
  }

  private extractXsrf(cookie: string): string {
    return /XSRF-TOKEN=([^;]+)/.exec(cookie)?.[1] ?? '';
  }
}
