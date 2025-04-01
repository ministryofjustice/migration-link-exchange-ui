import { NextFunction, Request, Response } from 'express'
import FileInformationService from '../../services/FileInformationService'
import locale from './link-exchange.locale.json'
import { HttpError } from '../../utils/HttpError'

export default class LinkExchangeController {
  constructor(private readonly fileInformationService: FileInformationService) {}

  private validate = (req: Request, res: Response, next: NextFunction) => {
    const { link } = req.body
    req.errors = {}

    if (!link) {
      req.errors.link = locale.errors.noLinkProvided
    }

    if (link && !this.fileInformationService.extractFileId(link as string)) {
      req.errors.link = locale.errors.invalidLink
    }

    return next()
  }

  private render = async (req: Request, res: Response, next: NextFunction) => {
    const { errors, body } = req
    let files

    if (Object.keys(errors ?? {}).length) {
      return res.render('linkExchange', {
        locale,
        data: {
          form: body,
        },
        errors,
      })
    }

    try {
      if (req.body.link) {
        files = await this.fileInformationService.getFilesBySourceURL(req.body.link)
      }

      return res.render('linkExchange', {
        locale,
        data: {
          form: body,
          files,
        },
      })
    } catch (e) {
      if (e.status === 404) {
        return res.render('linkExchange', {
          locale,
          data: {
            form: body,
            files: [],
          },
        })
      }

      return next(new HttpError(500, 'Failed to contact datastore'))
    }
  }

  GET = [this.render]

  POST = [this.validate, this.render]
}
