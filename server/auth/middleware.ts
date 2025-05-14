import type { Request, Response, NextFunction } from 'express'
import expressSession from 'express-session'
import IORedis from 'ioredis'
import { RedisStore } from 'connect-redis'

import config from '../config'

const redisClient = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  // Settings for AWS Elasticache.
  ...(process.env.REDIS_PASSWORD && {
    password: process.env.REDIS_PASSWORD,
    tls: {},
  }),
})

const redisStore = new RedisStore({ client: redisClient })

const session = expressSession({
  store: redisStore,
  secret: process.env.EXPRESS_SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.https,
  },
})

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/auth/')) {
    return next()
  }

  if (!req.session.isAuthenticated) {
    return res.redirect('/auth/login-screen') // redirect to sign-in route
  }

  next()
}

export { session, isAuthenticated }
