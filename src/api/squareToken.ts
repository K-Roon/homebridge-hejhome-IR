import { URL, URLSearchParams } from 'url';
import type { Logger } from 'homebridge';
import { Buffer } from 'node:buffer';
import { HejhomeApiClient } from './GoqualClient.js';

const CLIENT_ID = 'e08a10573e37452daf2b948b390d5ef7';
const CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12';

declare module './GoqualClient.js' {
  interface HejhomeApiClient {
    /** 간편 로그인(패스워드 그랜트) */
    login(username: string, password: string): Promise<void>;
  }
}

export interface SquareToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/* ------------------------------------------------------------------ */
/* 1) Hejhome Open API(POST /oauth/login?vendor=openapi) — Basic Auth  */
/* ------------------------------------------------------------------ */
export async function obtainSquareToken(
  log: Logger,
  email: string,
  password: string,
): Promise<string | null> {
  
  // ① 세션 쿠키 얻기
  const loginRes = await fetch(
    'https://goqual.io/oauth/login?vendor=openapi',
    { method: 'POST', headers: { Authorization: basicAuth(email, password) } }
  );
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const cookie = loginRes.headers.get('set-cookie'); // JSESSIONID=…

  if (!cookie) {
    throw new Error('Failed to get session cookie from login response.');
  }

  // ② 인가 코드 얻기 (리다이렉트 수동 처리)
  const authURL =
    'https://goqual.io/oauth/authorize' +
    `?response_type=code&client_id=${CLIENT_ID}&scope=all&redirect_uri=oob`;
  const authRes = await fetch(authURL, {
    redirect: 'manual',
    headers: { Cookie: cookie, Authorization: basicAuth(email, password) },
  });
  
  const loc = authRes.headers.get('location');

  // ✅ [수정됨] location 헤더가 null일 경우를 대비한 에러 처리
  if (!loc) {
    log.error(`Authorization redirect failed. Status: ${authRes.status}. Did not receive a location header. Check your credentials.`);
    throw new Error('Authorization failed: Redirect location header not found.');
  }
  
  const code = new URL(loc).searchParams.get('code');
  if (!code) throw new Error('Authorization code missing in redirect URL');

  // ③ 토큰 교환
  const tokenURL =
    `https://goqual.io/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=oob`;
  const tokenRes = await fetch(tokenURL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(CLIENT_ID, CLIENT_SECRET),
    },
  });
  if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
  const { access_token } = await tokenRes.json();
  return access_token;
}

const basicAuth = (id: string, pw: string) =>
  'Basic ' + Buffer.from(`${id}:${pw}`).toString('base64');

/* ------------------------------------------------------------------ */
/* 2) Square OAuth 3-leg 플로우: login → code → token                 */
/* ------------------------------------------------------------------ */
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

  /* --------------------------- private ---------------------------- */
  private async loginAndGetCookie(id: string, pw: string): Promise<string | null> {
    /* 1) 쿠키·XSRF 선취 */
    const pre = await fetch(
      `https://square.hej.so/oauth/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(
        this.redirectUri,
      )}`,
      { redirect: 'manual' },
    );
    if (![302, 303].includes(pre.status)) {
      this.log.warn(`Square authorize failed ${pre.status}`);
      return null;
    }

    const rawCookie = pre.headers.get('set-cookie') ?? '';
    const xsrf = /XSRF-TOKEN=([^;]+)/.exec(rawCookie)?.[1];
    if (!xsrf) {
      this.log.warn('No XSRF token');
      return null;
    }

    /* 2) 실제 로그인 */
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

    /* 세션 쿠키 병합 */
    return rawCookie + '; ' + (post.headers.get('set-cookie') ?? '');
  }

  private async getCode(cookie: string): Promise<string | null> {
    const url = new URL('https.square.hej.so/oauth/authorize');
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
    const res = await fetch('https.square.hej.so/oauth/token', {
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

  /* XSRF 값 추출 유틸 */
  private extractXsrf(cookie: string): string {
    return /XSRF-TOKEN=([^;]+)/.exec(cookie)?.[1] ?? '';
  }
}