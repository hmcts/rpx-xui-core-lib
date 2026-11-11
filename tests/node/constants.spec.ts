import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { AUTH, OAUTH2, OIDC, SESSION } from '../../projects/core-lib/node';

test('Node authentication and session constants retain the legacy values', () => {
  assert.deepEqual(AUTH, {
    EVENT: {
      AUTHENTICATE_SUCCESS: 'auth.authenticate.success',
      SERIALIZE_USER: 'auth.serializeUser',
      DESERIALIZE_USER: 'auth.deserializeUser',
      AUTHENTICATE_FAILURE: 'auth.authenticate.failure',
      AUTHENTICATE_ACCESS_DENIED: 'auth.authenticate.accessDenied',
    },
    ROUTE: {
      DEFAULT_REDIRECT: '/', LOGIN: '/auth/login', DEFAULT_AUTH_ROUTE: '/auth/isAuthenticated',
      KEEPALIVE_ROUTE: '/auth/keepalive', OAUTH_CALLBACK: '/oauth2/callback', LOGOUT: '/auth/logout',
      EXPIRED_LOGIN_LINK: '/expired-login-link', ACCESS_DENIED: '/access-denied',
    },
  });
  assert.deepEqual(OAUTH2, { PROMPT: 'login', STRATEGY_NAME: 'oauth2' });
  assert.deepEqual(OIDC, { PROMPT: 'login', STRATEGY_NAME: 'oidc' });
  assert.deepEqual(SESSION, {
    EVENT: { REDIS_CLIENT_ERROR: 'redisStore.ClientError', REDIS_CLIENT_READY: 'redisStore.ClientReady' },
    REDIS_STORE_NAME: 'redisStore', FILE_STORE_NAME: 'fileStore',
  });
});
