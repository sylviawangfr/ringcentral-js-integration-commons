import { expect } from 'chai';
import config from '../config';

import RcPhone from '../src/rc-phone';
import loginStatus from '../src/enums/login-status';

/* global describe it */

describe('Auth Test Suite', async () => {
  const phone = new RcPhone({
    sdkSettings: {
      ...config.sdk,
    },
    brandSettings: {
      ...config.brand,
    },
  });
  const auth = phone.auth;

  it('Login & Logout', async () => {
    await auth.login({ ...config.user });
    expect(await auth.getLoggedInStatus()).to.equal(loginStatus.userLoggedIn);
    await auth.logout();
    expect(await auth.getLoggedInStatus()).to.equal(loginStatus.notLoggedIn);
  });

  it('Request client credentials', async () => {
    await auth.requestClientCredential();
    expect(await auth.getLoggedInStatus()).to.equal(loginStatus.hasPublicToken);
  });

  it('Loin after request client credentials', async () => {
    await auth.login({ ...config.user });
    expect(await auth.getLoggedInStatus()).to.equal(loginStatus.userLoggedIn);
  });
});
