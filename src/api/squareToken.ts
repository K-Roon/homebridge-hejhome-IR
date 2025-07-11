import type { Logger } from 'homebridge'
import validator from 'validator'
//import fetch from 'node-fetch'

globalThis.fetch = fetch as unknown as typeof globalThis.fetch

export const HEJ_CLIENT_ID     = 'e08a10573e37452daf2b948b390d5ef7'
export const HEJ_CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12'

const basic = (id: string, pw: string) =>
  `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}`

const splitCookies = (h: any): string[] => {
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()  // Node 20+
  const s = h.get?.('set-cookie') ?? ''
  return s ? s.split(/,(?=[^;]+=[^;]+)/) : []
}

const pick = (arr: string[], name: string): string | undefined =>
  arr.find(c => c.startsWith(name + '='))?.split('=', 2)[1]?.split(';', 1)[0]

class SquareOAuthClient {
  constructor(private log: Logger) {}

  private async startSession(mail: string, pw: string): Promise<string | undefined> {
    const r = await fetch('https://square.hej.so/oauth/login?vendor=shop', {
      method: 'POST',
      headers: { authorization: basic(mail, pw) },
      redirect: 'manual',
    })
    if (r.status !== 200 && r.status !== 302) {
      this.log.error(`Login failed: ${r.status}`)
      return
    }
    const arr  = splitCookies(r.headers)
    const js   = pick(arr, 'JSESSIONID')
    const xsrf = pick(arr, 'XSRF-TOKEN')
    return js && xsrf ? `JSESSIONID=${js}; XSRF-TOKEN=${xsrf}` : undefined
  }

  private async getCode(cookie: string): Promise<string | null> {
    const u = new URL('https://square.hej.so/oauth/authorize')
    u.searchParams.set('client_id', HEJ_CLIENT_ID)
    u.searchParams.set('redirect_uri', 'https://square.hej.so/list')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'shop')
    u.searchParams.set('vendor', 'shop')

    const r = await fetch(u, {
      headers: {
        Cookie: cookie,
        'X-XSRF-TOKEN': /XSRF-TOKEN=([^;]+)/.exec(cookie)?.[1] ?? '',
      },
      redirect: 'manual',
    })
    const loc = r.headers.get('location')
    return loc ? /code=([^&]+)/.exec(loc)?.[1] ?? null : null
  }

  private async exchange(code: string): Promise<string | undefined> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HEJ_CLIENT_ID,
      redirect_uri: 'https://square.hej.so/list',
    })
    const r = await fetch('https://square.hej.so/oauth/token', {
      method: 'POST',
      headers: {
        authorization: basic(HEJ_CLIENT_ID, HEJ_CLIENT_SECRET),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    if (!r.ok) { this.log.error(`Token exchange failed: ${r.status}`); return }
    return (await r.json() as any).access_token
  }

  async fetchToken(mail: string, pw: string): Promise<string | undefined> {
    if (!validator.isEmail(mail) || pw.length < 4) return
    const ck = await this.startSession(mail, pw)
    if (!ck) return
    const cd = await this.getCode(ck)
    if (!cd) return
    return this.exchange(cd)
  }
}

export const obtainSquareToken = (log: Logger, e: string, p: string) =>
  new SquareOAuthClient(log).fetchToken(e, p)
