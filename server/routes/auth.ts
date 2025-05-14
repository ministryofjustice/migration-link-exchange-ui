/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import express from 'express'

import authProvider from '../auth/provider'
import {
  OAUTH_REDIRECT_PATH,
  OAUTH_LOGOUT_REDIRECT_PATH,
} from '../auth-config'
import config from '../config'

const router = express.Router()

router.get('/login-screen', authProvider.prompt())

router.get(
  '/login',
  authProvider.login({
    scopes: [],
    redirectUri: config.ingressUrl + OAUTH_REDIRECT_PATH,
    successRedirect: '/',
  }),
)

router.post('/redirect', authProvider.handleRedirect())

router.get(
  '/signout',
  authProvider.logout({
    postLogoutRedirectUri: config.ingressUrl + OAUTH_LOGOUT_REDIRECT_PATH,
  }),
)

export default router
