import { NextFunction, Request, Response } from 'express'
import { constants as http } from 'http2'
import { HttpError } from '../../utils/HttpError'
import localeBadRequest from './bad-request.locale.json'
import localeNotFound from './not-found.locale.json'
import localeServiceFault from './service-fault.locale.json'
import logger from '../../../logger'

export default class ErrorController {
  constructor() {}

  private errorHandler = async (error: HttpError, req: Request, res: Response, next: NextFunction) => {
    res.locals.stack = error.stack
    error.status ??= http.HTTP_STATUS_INTERNAL_SERVER_ERROR
    res.status(error.status)

    logger.error(error.stack)

    switch (error.status - (error.status % 100)) {
      case 400:
        return this.handleBadRequestErrors(error, req, res, next)

      case 500:
      default:
        return this.handleServiceErrors(error, req, res, next)
    }
  }

  private handleBadRequestErrors = async (error: HttpError, req: Request, res: Response, next: NextFunction) => {
    switch (error.status) {
      case http.HTTP_STATUS_NOT_FOUND:
        return res.render('error', {
          locale: localeNotFound,
          error,
        })
      default:
        return res.render('error', {
          locale: localeBadRequest,
          error,
        })
    }
  }

  private handleServiceErrors = async (error: HttpError, req: Request, res: Response, next: NextFunction) => {
    return res.render('error', {
      locale: localeServiceFault,
      error,
    })
  }

  any = this.errorHandler
}
