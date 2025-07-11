import type { Logger } from 'homebridge'
import validator from 'validator'
import fetch from 'node-fetch'
import { parse, Cookie } from 'set-cookie-parser'

globalThis.fetch = fetch as unknown as typeof globalThis.fetch

export const HEJ_CLIENT_ID     = 'e08a10573e37452daf2b948b390d5ef7'
export const HEJ_CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12'

const basic = (id: string, pw: string) =>
  `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}`

class SquareOAuthClient {
  constructor(private log: Logger) {}

  private async startSession(mail: string, pw: string): Promise<string | undefined> {
    const resp = await fetch('https://square.hej.so/oauth/login?vendor=shop', {
      method: 'POST',
      headers: { authorization: basic(mail, pw) },
      redirect: 'manual',
    })

    if (resp.status !== 200 && resp.status !== 302) {
      this.log.error(`Login failed: ${resp.status}`)
      return
    }

    const raw = (resp.headers as any).raw()['set-cookie'] as string[] | undefined
    const cookies = parse(raw ?? []) as Cookie[]
    const js  = cookies.find((c: Cookie) => c.name === 'JSESSIONID')?.value
    const xs  = cookies.find((c: Cookie) => c.name === 'XSRF-TOKEN')?.value
    return js && xs ? `JSESSIONID=${js}; XSRF-TOKEN=${xs}` : undefined
  }

  private async getCode(cookies: string): Promise<string | null> {
    const u = new URL('https://square.hej.so/oauth/authorize')
    u.searchParams.set('client_id', HEJ_CLIENT_ID)
    u.searchParams.set('redirect_uri', 'https://square.hej.so/list')
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', 'shop')
    u.searchParams.set('vendor', 'shop')

    const r = await fetch(u, {
      headers: {
        Cookie: cookies,
        'X-XSRF-TOKEN': /XSRF-TOKEN=([^;]+)/.exec(cookies)?.[1] ?? '',
      },
      redirect: 'manual',
    })

    const loc = r.headers.get('location')
    if (!loc) { this.log.error(`Authorize failed: ${r.status}`); return null }
    return /code=([^&]+)/.exec(loc)?.[1] ?? null
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
    const code = await this.getCode(ck)
    if (!code) return
    return this.exchange(code)
  }
}

export const obtainSquareToken = (log: Logger, e: string, p: string) =>
  new SquareOAuthClient(log).fetchToken(e, p)
