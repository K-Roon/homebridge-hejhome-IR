import { URL, URLSearchParams } from 'url';
import type { Logger } from 'homebridge';
import { Buffer } from 'node:buffer';
import { HejhomeApiClient } from './GoqualClient.js';

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
): Promise<string> {
  const url  = 'https://goqual.io/oauth/login?vendor=openapi';
  const auth = 'Basic ' + Buffer.from(`${email}:${password}`).toString('base64');

  const res  = await fetch(url, {
    method: 'POST',
    headers: { Authorization: auth },
  });

  /* ➊ 401·403·204 → 자격 또는 파라미터 오류 */
  if ([401, 403, 204].includes(res.status)) {
    throw new Error(
      `Auth failed: HTTP ${res.status} — 이메일·비밀번호·vendor=openapi 확인`,
    );
  }

  /* ➋ 빈 본문 방어 — 0 byte면 Undici JSON 파서가 즉시 예외를 던짐 */
  const raw = await res.text();
  if (!raw) {
    throw new Error(`Empty body (status ${res.status}), cannot parse JSON`);
  }

  /* ➌ 안전 JSON 파싱 */
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Non-JSON response: ${raw.slice(0, 120)}…`);
  }
  if (!data.access_token) {
    throw new Error(`access_token missing: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

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

  /* XSRF 값 추출 유틸 */
  private extractXsrf(cookie: string): string {
    return /XSRF-TOKEN=([^;]+)/.exec(cookie)?.[1] ?? '';
  }
}
