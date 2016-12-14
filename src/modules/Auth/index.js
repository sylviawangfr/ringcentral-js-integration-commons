import RcModule from '../../lib/RcModule';
import url from 'url';
import getAuthReducer from './getAuthReducer';
import actionTypes from './actionTypes';
import loginStatus from './loginStatus';
import authMessages from './authMessages';
import moduleStatus from '../../enums/moduleStatus';

export { loginStatus };

function getDefaultRedirectUri() {
  if (typeof window !== 'undefined') {
    return url.resolve(window.location.href, './redirect.html');
  }
  return null;
}

function getDefaultProxyUri() {
  if (typeof window !== 'undefined') {
    return url.resolve(window.location.href, './proxy.html');
  }
  return null;
}

/**
 * @class
 * @description Authentication module
 */
export default class Auth extends RcModule {
  /**
   * @constructor
   */
  constructor({
    client,
    alert,
    redirectUri = getDefaultRedirectUri(),
    proxyUri = getDefaultProxyUri(),
    brand,
    locale,
    ...options
  } = {}) {
    super({
      ...options,
      actionTypes,
    });
    this._client = client;
    this._alert = alert;
    this._brand = brand;
    this._locale = locale;
    this._redirectUri = redirectUri;
    this._proxyUri = proxyUri;
    this._reducer = getAuthReducer(this.actionTypes);
    this._beforeLogoutHandlers = new Set();
  }
  _bindEvents() {
    const platform = this._client.service.platform();
    platform.on(platform.events.loginSuccess, () => {
      this.store.dispatch({
        type: this.actionTypes.loginSuccess,
        token: platform.auth().data(),
      });
    });
    platform.on(platform.events.loginError, error => {
      this.store.dispatch({
        type: this.actionTypes.loginError,
        error,
      });
      if (error) {
        this._alert.danger({
          message: authMessages.loginError,
          payload: error,
        });
      }
    });
    platform.on(platform.events.logoutSuccess, () => {
      this.store.dispatch({
        type: this.actionTypes.logoutSuccess,
      });
    });
    platform.on(platform.events.logoutError, error => {
      this.store.dispatch({
        type: this.actionTypes.logoutError,
        error,
      });
      if (error) {
        this._alert.danger({
          message: authMessages.logoutError,
          payload: error,
        });
      }
    });
    platform.on(platform.events.refreshSuccess, () => {
      this.store.dispatch({
        type: this.actionTypes.refreshSuccess,
        token: platform.auth().data(),
      });
    });
    platform.on(platform.events.refreshError, error => {
      // user is still considered logged in if the refreshToken is still valid
      const refreshTokenValid = platform.auth().refreshTokenValid();
      this.store.dispatch({
        type: this.actionTypes.refreshError,
        error,
        refreshTokenValid,
      });
      if (!refreshTokenValid && this._client.service.platform().auth().data().access_token !== '') {
        this._alert.danger({
          message: authMessages.sessionExpired,
          payload: error,
          ttl: 0,
        });
        // clean the cache so the error doesn't show again
        platform._cache.clean();
      }
    });
  }
  initialize() {
    this._bindEvents();
    this.store.subscribe(async () => {
      if (
        this.status === moduleStatus.pending &&
        this._locale.ready
      ) {
        this.store.dispatch({
          type: this.actionTypes.init,
        });
        const platform = this._client.service.platform();
        const loggedIn = await platform.loggedIn();
        this.store.dispatch({
          type: this.actionTypes.initSuccess,
          loggedIn,
          token: loggedIn ? platform.auth().data() : null,
        });
      }
    });
  }

  get redirectUri() {
    return this._redirectUri;
  }

  get proxyUri() {
    return this._proxyUri;
  }

  get ownerId() {
    return this.state.ownerId;
  }

  get status() {
    return this.state.status;
  }

  get ready() {
    return this.state.status === moduleStatus.ready;
  }

  get loginStatus() {
    return this.state.loginStatus;
  }

  get isFreshLogin() {
    return this.state.freshLogin;
  }

  /**
   * @function
   * @param {String} options.username
   * @param {String} options.password
   * @param {String} options.extension
   * @param {Booleal|Number} options.remember
   * @param {String} params.code,
   * @param {String} params.redirectUri,
   * @return {Promise}
   * @description Login either with username/password or with authorization code
   */
  async login({ username, password, extension, remember, code, redirectUri }) {
    this.store.dispatch({
      type: this.actionTypes.login,
    });
    return await this._client.login({
      username,
      password,
      extension,
      remember,
      code,
      redirectUri,
    });
  }
  /**
   * @function
   * @param {String} options.redirectUri
   * @param {String} options.brandId
   * @param {Boolean} options.force
   * @return {String}
   * @description get OAuth page url
   */
  getLoginUrl({ redirectUri, state, brandId, display, prompt, force }) {
    return `${this._client.loginUrl({
      redirectUri,
      state,
      brandId,
      display,
      prompt,
    })}${force ? '&force' : ''}`;
  }
  /**
   * @function
   * @param {String} callbackUri
   * @return {String} code
   */
  parseCallbackUri(callbackUri) {
    const { query } = url.parse(callbackUri, true);
    if (query.error) {
      const error = new Error(query.error);
      for (const key in query) {
        if (query::Object.prototype.hasOwnProperty(key)) {
          error[key] = query[key];
        }
      }
      throw error;
    }
    return query.code;
  }

  /**
   * @function
   * @description Triggers the beforeLogoutHandlers to run
   *  and then proceed to logout from ringcentral.
   */
  async logout() {
    this.store.dispatch({
      type: this.actionTypes.beforeLogout,
    });
    const handlers = [...this._beforeLogoutHandlers];
    try {
      for (const handler of handlers) {
        const result = await (async () => handler())();
        if (result) {
          this.store.dispatch({
            type: this.actionTypes.cancelLogout,
          });
          return Promise.reject(result);
        }
      }
    } catch (error) {
      this._alert.danger({
        message: authMessages.beforeLogoutError,
        payload: error,
      });
    }
    this.store.dispatch({
      type: this.actionTypes.logout,
    });
    return await this._client.logout();
  }

   /**
   * @function
   * @param {Function} handler
   * @returns {Function}
   */
  addBeforeLogoutHandler(handler) {
    this._beforeLogoutHandlers.add(handler);
    return () => {
      this.removeBeforeLogoutHandler(handler);
    };
  }

   /**
   * @function
   * @param {Function} handler
   */
  removeBeforeLogoutHandler(handler) {
    this._beforeLogoutHandlers.remove(handler);
  }

  async checkIsLoggedIn() {
    // SDK would return false when there's temporary network issues,
    // but we should not return use back to welcome string and should
    // still consider the user as being logged in.
    await this._client.service.platform().loggedIn();
    return this.loginStatus === loginStatus.loggedIn;
  }

  /**
   * @function
   * @description Create the proxy frame and append to document if available.
   * @param {Function} onLogin - Function to be called when user successfully logged in
   *  through oAuth.
   */
  setupProxyFrame(onLogin) {
    if (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      this._proxyUri &&
      this._proxyUri !== '' &&
      !this._proxyFrame
    ) {
      this._proxyFrame = document.createElement('iframe');
      this._proxyFrame.src = this.proxyUri;
      this._proxyFrame.style.display = 'none';
      document.body.appendChild(this._proxyFrame);
      this._callbackHandler = async ({ origin, data }) => {
        // TODO origin check
        if (data) {
          const {
            callbackUri,
          } = data;
          if (callbackUri) {
            try {
              const code = this.parseCallbackUri(callbackUri);
              if (code) {
                await this.login({
                  code,
                  redirectUri: this.redirectUri,
                });
                if (typeof onLogin === 'function') {
                  onLogin();
                }
              }
            } catch (error) {
              let message;
              switch (error.message) {
                case 'invalid_request':
                case 'unauthorized_client':
                case 'access_denied':
                case 'unsupported_response_type':
                case 'invalid_scope':
                  message = authMessages.accessDenied;
                  break;
                case 'server_error':
                case 'temporarily_unavailable':
                default:
                  message = authMessages.internalError;
                  break;
              }

              this._alert.danger({
                message,
                payload: error,
              });
            }
          }
        }
      };
      window.addEventListener('message', this._callbackHandler);
    }
  }
  clearProxyFrame() {
    if (this._proxyFrame) {
      document.body.removeChild(this._proxyFrame);
      this._proxyFrame = null;
      window.removeEventListener('message', this._callbackHandler);
      this._callbackHandler = null;
    }
  }
  openOAuthPage() {
    if (this._proxyFrame) {
      this._proxyFrame.contentWindow.postMessage({
        oAuthUri: `${this.getLoginUrl({
          redirectUri: this.redirectUri,
          brandId: this._brand.id,
        })}&force=true&localeId=${encodeURIComponent(this._locale.currentLocale)}`,
      }, '*');
    }
  }
}
