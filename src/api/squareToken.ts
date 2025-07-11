import type { Logger } from 'homebridge'
import validator from 'validator'
//import fetch, { Headers as FetchHeaders } from 'node-fetch'

globalThis.fetch = fetch as unknown as typeof globalThis.fetch

export const HEJ_CLIENT_ID = 'e08a10573e37452daf2b948b390d5ef7'
export const HEJ_CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12'

const encodeBasic = (id: string, pw: string): string =>
  `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}`

class SquareOAuthClient {
  constructor(private readonly log: Logger) {}

  private async startSession(email: string, pw: string): Promise<string | undefined> {
  const resp = await fetch('https://square.hej.so/oauth/login?vendor=shop', {
    method: 'POST',
    headers: { authorization: encodeBasic(email, pw) },
    redirect: 'manual',
  });

  // 200 또는 302 둘 다 성공으로 처리
  if (resp.status !== 200 && resp.status !== 302) {
    this.log.error(`Login failed: ${resp.status}`);
    return;
  }

  const raw = resp.headers.getSetCookie?.()
            ?? resp.headers.get('set-cookie')?.split(/,(?=[^;]+=[^;]+)/);

  const cookies = raw?.join('; ');
  const m = cookies?.match(/(JSESSIONID=[^;]+).*?(XSRF-TOKEN=[^;]+)/);
  return m ? `${m[1]}; ${m[2]}` : undefined;
}

  private async fetchAuthCode(cookies: string): Promise<string | null> {
    const url = new URL('https://square.hej.so/oauth/authorize')
    url.searchParams.set('client_id', HEJ_CLIENT_ID)
    url.searchParams.set('redirect_uri', 'https://square.hej.so/list')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'shop')
    url.searchParams.set('vendor', 'shop')
    const res = await fetch(url.toString(), {
      headers: {
        Cookie: cookies,
        'X-XSRF-TOKEN': cookies.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
      },
      redirect: 'manual',
    })
    const location = res.headers.get('location')
    if (!location) {
      this.log.error(`Authorize request failed: ${res.status}`)
      return null
    }
    return location.match(/code=([^&]+)/)?.[1] ?? null
  }

  private async exchange(code: string): Promise<string | undefined> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HEJ_CLIENT_ID,
      redirect_uri: 'https://square.hej.so/list',
    })
    const res = await fetch('https://square.hej.so/oauth/token', {
      method: 'POST',
      headers: {
        authorization: encodeBasic(HEJ_CLIENT_ID, HEJ_CLIENT_SECRET),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!res.ok) {
      this.log.error(`Token exchange failed: ${res.status}`)
      return
    }
    const { access_token } = (await res.json()) as { access_token: string }
    return access_token
  }

  async fetchToken(email: string, password: string): Promise<string | undefined> {
    if (!validator.isEmail(email)) {
      this.log.error('Invalid email address')
      return
    }
    if (password.length < 4) {
      this.log.error('Password must be at least 4 characters')
      return
    }
    const cookies = await this.startSession(email, password)
    if (!cookies) return
    const code = await this.fetchAuthCode(cookies)
    if (!code) return
    return this.exchange(code)
  }
}

export const obtainSquareToken = async (
  log: Logger,
  email: string,
  password: string,
): Promise<string | undefined> => {
  return new SquareOAuthClient(log).fetchToken(email, password);
};
