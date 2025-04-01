import { Router } from 'express'
import ErrorController from './error/ErrorController'
import { URLs } from './URLs'
import { HttpError } from '../utils/HttpError'
import { Services } from '../services'
import LinkExchangeController from './linkExchange/LinkExchangeController'

export default function routes({ fileInformationService }: Services): Router {
  const router = Router()

  const linkExchangeController = new LinkExchangeController(fileInformationService)
  router.get(URLs.linkExchange, linkExchangeController.GET)
  router.post(URLs.linkExchange, linkExchangeController.POST)

  const errorController = new ErrorController()
  router.use((req, res, next) => next(HttpError(404, req.path)))
  router.use(errorController.any)

  return router
}
