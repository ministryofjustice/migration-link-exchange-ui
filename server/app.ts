import express from 'express'
import { skipAuth } from './auth-config'
import { session, isAuthenticated } from './auth/middleware'
import nunjucksSetup from './middleware/nunjucks/nunjucksSetup'
import setUpStaticResources from './middleware/setUpStaticResources'
import setUpWebRequestParsing from './middleware/setupRequestParsing'
import setUpWebSecurity from './middleware/setUpWebSecurity'
import routes from './routes'
import authRouter from './routes/auth'
import type { Services } from './services'
import setUpHealthChecks from './middleware/setUpHealthChecks'

export default function createApp(services: Services): express.Application {
  const app = express()

  app.set('json spaces', 2)
  app.set('trust proxy', true)
  app.set('port', process.env.PORT || 3000)

  // Use express-session to manage user sessions - i.e. login via Entra.
  if (!skipAuth) {
    app.use(session)
  }

  app.use(setUpWebSecurity())
  app.use(setUpHealthChecks(services.applicationInfo))
  app.use(setUpWebRequestParsing())
  app.use(setUpStaticResources())
  nunjucksSetup(app)

  // Add the middleware and routes for auth.
  if (!skipAuth) {
    app.use(isAuthenticated)
    app.use('/auth', authRouter)
  }

  app.use(routes(services))

  return app
}
