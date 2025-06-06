import msal, {
  type Configuration,
  type AuthorizationCodeRequest,
  type AuthorizationUrlRequest,
  type ConfidentialClientApplication,
} from '@azure/msal-node'
import type { Request, Response, NextFunction } from 'express'

import logger from '../../logger'
import config from '../config'
import { msalConfig as rootMsalConfig } from '../auth-config'

import locale from '../routes/auth/login-screen.locale.json'

class AuthProvider {
  msalConfig

  cryptoProvider

  constructor(msalConfig: Configuration) {
    this.msalConfig = msalConfig
    this.cryptoProvider = new msal.CryptoProvider()
  }

  prompt() {
    return (req: Request, res: Response) => {
      // If the user is already authenticated, redirect to the home page
      if (req.session.isAuthenticated) {
        return res.redirect('/')
      }

      // Render the sign-in prompt from the views folder
      return res.render('../auth/login-screen', {
        locale,
      })
    }
  }

  login(options: { successRedirect?: string; scopes?: string[]; redirectUri?: string } = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      /**
       * MSAL Node library allows you to pass your custom state as state parameter in the Request object.
       * The state parameter can also be used to encode information of the app's state before redirect.
       * You can pass the user's state in the app, such as the page or view they were on, as input to this parameter.
       */
      const state = this.cryptoProvider.base64Encode(
        JSON.stringify({
          successRedirect: options.successRedirect || '/',
        }),
      )

      const authCodeUrlRequestParams = {
        state,

        /**
         * By default, MSAL Node will add OIDC scopes to the auth code url request. For more information, visit:
         * https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
         */
        scopes: options.scopes || [],
        redirectUri: options.redirectUri,
      }

      const authCodeRequestParams = {
        state,

        /**
         * By default, MSAL Node will add OIDC scopes to the auth code request. For more information, visit:
         * https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
         */
        scopes: options.scopes || [],
        redirectUri: options.redirectUri,
      }

      /**
       * If the current msal configuration does not have cloudDiscoveryMetadata or authorityMetadata, we will
       * make a request to the relevant endpoints to retrieve the metadata. This allows MSAL to avoid making
       * metadata discovery calls, thereby improving performance of token acquisition process. For more, see:
       * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/performance.md
       */
      if (!this.msalConfig.auth.cloudDiscoveryMetadata || !this.msalConfig.auth.authorityMetadata) {
        const [cloudDiscoveryMetadata, authorityMetadata] = await Promise.all([
          this.getCloudDiscoveryMetadata(this.msalConfig.auth.authority),
          this.getAuthorityMetadata(this.msalConfig.auth.authority),
        ])

        this.msalConfig.auth.cloudDiscoveryMetadata = JSON.stringify(cloudDiscoveryMetadata)
        this.msalConfig.auth.authorityMetadata = JSON.stringify(authorityMetadata)
      }

      const msalInstance = this.getMsalInstance(this.msalConfig)

      // trigger the first leg of auth code flow
      return this.redirectToAuthCodeUrl(authCodeUrlRequestParams, authCodeRequestParams, msalInstance)(req, res, next)
    }
  }

  handleRedirect() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.body || !req.body.state) {
        return next(new Error('Error: response not found'))
      }

      const authCodeRequest: AuthorizationCodeRequest = {
        ...req.session.authCodeRequest,
        code: req.body.code,
        codeVerifier: req.session.pkceCodes.verifier,
      }

      try {
        const msalInstance = this.getMsalInstance(this.msalConfig)

        if (req.session.tokenCache) {
          msalInstance.getTokenCache().deserialize(req.session.tokenCache)
        }

        const tokenResponse = await msalInstance.acquireTokenByCode(authCodeRequest, req.body)

        req.session.tokenCache = msalInstance.getTokenCache().serialize()
        req.session.idToken = tokenResponse.idToken
        req.session.account = tokenResponse.account
        req.session.isAuthenticated = true

        const state = JSON.parse(this.cryptoProvider.base64Decode(req.body.state))

        // Ensure we're not redirecting to an arbitrary URL
        const redirectUri = state.successRedirect.startsWith('/') ? state.successRedirect : ''

        return res.redirect(`${config.ingressUrl}${redirectUri}`)
      } catch (error) {
        return next(error)
      }
    }
  }

  logout(options: { postLogoutRedirectUri?: string } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      /**
       * Construct a logout URI and redirect the user to end the
       * session with Azure AD. For more information, visit:
       * https://docs.microsoft.com/azure/active-directory/develop/v2-protocols-oidc#send-a-sign-out-request
       */
      let logoutUri = `${this.msalConfig.auth.authority}/oauth2/v2.0/`

      if (options.postLogoutRedirectUri) {
        logoutUri += `logout?post_logout_redirect_uri=${options.postLogoutRedirectUri}`
      }

      req.session.destroy(() => {
        res.redirect(logoutUri)
      })
    }
  }

  /**
   * Instantiates a new MSAL ConfidentialClientApplication object
   * @param msalConfig: MSAL Node Configuration object
   * @returns
   */
  getMsalInstance(msalConfig: Configuration) {
    return new msal.ConfidentialClientApplication(msalConfig)
  }

  /**
   * Prepares the auth code request parameters and initiates the first leg of auth code flow
   * @param req: Express request object
   * @param res: Express response object
   * @param next: Express next function
   * @param authCodeUrlRequestParams: parameters for requesting an auth code url
   * @param authCodeRequestParams: parameters for requesting tokens using auth code
   */
  redirectToAuthCodeUrl(
    authCodeUrlRequestParams: AuthorizationUrlRequest,
    authCodeRequestParams: {
      state: string
      scopes: string[]
      redirectUri: string
    },
    msalInstance: ConfidentialClientApplication,
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Generate PKCE Codes before starting the authorization flow
      const { verifier, challenge } = await this.cryptoProvider.generatePkceCodes()

      // Set generated PKCE codes and method as session vars
      req.session.pkceCodes = {
        challengeMethod: 'S256',
        verifier,
        challenge,
      }

      /**
       * By manipulating the request objects below before each request, we can obtain
       * auth artifacts with desired claims. For more information, visit:
       * https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_node.html#authorizationurlrequest
       * https://azuread.github.io/microsoft-authentication-library-for-js/ref/modules/_azure_msal_node.html#authorizationcoderequest
       * */
      req.session.authCodeUrlRequest = {
        ...authCodeUrlRequestParams,
        responseMode: msal.ResponseMode.FORM_POST, // recommended for confidential clients
        codeChallenge: req.session.pkceCodes.challenge,
        codeChallengeMethod: req.session.pkceCodes.challengeMethod,
      }

      req.session.authCodeRequest = {
        ...authCodeRequestParams,
        code: '',
      }

      try {
        const authCodeUrlResponse = await msalInstance.getAuthCodeUrl(req.session.authCodeUrlRequest)
        res.redirect(authCodeUrlResponse)
      } catch (error) {
        next(error)
      }
    }
  }

  /**
   * Retrieves cloud discovery metadata from the /discovery/instance endpoint
   * @returns
   */
  async getCloudDiscoveryMetadata(authority: string) {
    const endpoint = 'https://login.microsoftonline.com/common/discovery/instance'

    const params = `api-version=1.1&authorization_endpoint=${encodeURIComponent(`${authority}/oauth2/v2.0/authorize`)}`

    try {
      const response = await fetch(`${endpoint}?${params}`)

      return await response.json()
    } catch (error) {
      logger.error(error)
    }
    return {}
  }

  /**
   * Retrieves oidc metadata from the openid endpoint
   * @returns
   */
  async getAuthorityMetadata(authority: string) {
    const endpoint = `${authority}/v2.0/.well-known/openid-configuration`

    try {
      const response = await fetch(endpoint)

      return await response.json()
    } catch (error) {
      logger.error(error)
    }
    return {}
  }
}

const authProvider = rootMsalConfig && new AuthProvider(rootMsalConfig)

export default authProvider
