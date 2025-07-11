import { PlatformConfig } from 'homebridge';

/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'HejhomeIR';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = '@k-roon/homebridge-hejhome-ir';

// Config
export interface HejhomePlatformConfig extends PlatformConfig {
  credentials?: Credentials;
}

interface Credentials {
  email: string;
  password: string;
  // TODO: Will be required in the future
  // familyId?: string;
  // roomId?: string;
}
