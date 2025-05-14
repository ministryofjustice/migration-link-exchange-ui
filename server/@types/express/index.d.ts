import type {
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
  AuthenticationResult
} from '@azure/msal-node'

export declare module 'express-session' {
  // Declare that the session will potentially contain these additional fields
  interface SessionData {
    returnTo: string
    nowInMinutes: number
    pkceCodes: {
      challengeMethod: string
      challenge?: string
      verifier?: string
    }
    isAuthenticated: boolean
    redirectUri: string
    tokenCache: string
    idToken: string
    authCodeRequest: AuthorizationCodeRequest
    authCodeUrlRequest: AuthorizationUrlRequest
    account: AuthenticationResult.AccountInfo | null
  }
}

export declare global {
  namespace Express {
    interface User {
      username: string
      token: string
      authSource: string
    }

    interface Request {
      verified?: boolean
      id: string
      errors: Record<string, string>
    }
  }
}
