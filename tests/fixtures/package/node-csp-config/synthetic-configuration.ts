export const DYNATRACE_CDN = 'synthetic-dynatrace-cdn';
export const FEATURE_DYNATRACE_ENABLED = 'synthetic-dynatrace-enabled';
export const showFeature = (key: string): boolean => key === FEATURE_DYNATRACE_ENABLED;
export const getConfigValue = <T>(key: string): T => (key === DYNATRACE_CDN ? 'https://synthetic.test/jstag/version/tenant/application_complete.js' : '') as T;
