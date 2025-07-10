import { Logger } from 'homebridge';
import validator from 'validator';

// These API credentials are referenced by other modules (e.g. realtime.ts). Do not
// remove them, as MQTT authentication relies on their presence.
export const HEJ_CLIENT_ID = 'e08a10573e37452daf2b948b390d5ef7';
export const HEJ_CLIENT_SECRET = '097a8d169af04e48a33abb33b8788f12';

/**
 * Helper to build a Basic auth string.
 */
const encodeBasicAuth = (id: string, pw: string): string =>
  `Basic ${Buffer.from(`${id}:${pw}`).toString('base64')}`;

class SquareOAuthClient {
  constructor(private readonly log: Logger) {}

  private async fetchSession(auth: string): Promise<string | undefined> {
    const resp = await fetch('https://square.hej.so/oauth/login?vendor=shop', {
      method: 'POST',
      headers: { authorization: auth },
    });
    const cookie = resp.headers.get('set-cookie');
    return cookie?.match(/JSESSIONID=([^;]+)/)?.[1];
  }

  private async requestAuthCode(cookie: string): Promise<string | null> {
    const url = new URL('https://square.hej.so/oauth/authorize');
    url.searchParams.set('client_id', HEJ_CLIENT_ID);
    url.searchParams.set('redirect_uri', 'https://square.hej.so/list');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'shop');

    const res = await fetch(url.toString(), {
      headers: { cookie },
      redirect: 'manual',
    });

    const location = res.headers.get('location');
    return location ? location.match(/code=([^&]+)/)?.[1] ?? null : null;
  }

  private async exchangeToken(code: string): Promise<string> {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: HEJ_CLIENT_ID,
      redirect_uri: 'https://square.hej.so/list',
    });

    const resp = await fetch('https://square.hej.so/oauth/token', {
      method: 'POST',
      headers: {
        authorization: encodeBasicAuth(HEJ_CLIENT_ID, HEJ_CLIENT_SECRET),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      referrer: `https://square.hej.so/list?code=${code}`,
      referrerPolicy: 'strict-origin-when-cross-origin',
      credentials: 'include',
      mode: 'cors',
    });

    const { access_token } = await resp.json() as { access_token: string };
    return access_token;
  }

  async fetchToken(email?: string, password?: string): Promise<string | undefined> {
    if (!email || !password) {
      this.log.error('Email and password are required');
      return;
    }

    if (!validator.isEmail(email)) {
      this.log.error('Invalid email address');
      return;
    }

    if (password.length < 4) {
      this.log.error('Password must be at least 4 characters');
      return;
    }

    const auth = encodeBasicAuth(email, password);
    const session = await this.fetchSession(auth);
    if (!session) {
      this.log.error('Failed to start OAuth session');
      return;
    }

    const cookie = `username=${encodeURIComponent(email)}; JSESSIONID=${session}`;
    const code = await this.requestAuthCode(cookie);
    if (!code) {
      this.log.error('Failed to obtain authorization code');
      return;
    }

    return this.exchangeToken(code);
  }
}

export const obtainSquareToken = async (
  log: Logger,
  email?: string,
  password?: string,
): Promise<string | undefined> => {
  const client = new SquareOAuthClient(log);
  return client.fetchToken(email, password);
};

