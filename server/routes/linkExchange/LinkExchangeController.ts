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

  private filesHaveDuplicates = (files: any[]) => {
    if(!files || files.length === 1) {
      return false;
    }

    return files.some((file, index) => {
      // Check if the file name ends in a number in parentheses, e.g. (1), (2), etc.
      // Or ends in a number in parentheses with a file extension e.g. (1).txt, (2).docx, etc.
      const match = file.microsoftPath?.match(/\((\d+)\)(\.[a-z]{2,4})?$/);
      return !!match
    })
  }

  private filesHaveLinkToMsFormsRoot = (files: any[]) => {
    if(!files?.length) {
      return false;
    }
    console.log(files)
    return files.some((file) => {
      // Check if the file's Microsoft URL is the root of MS Forms
      return file.microsoftUrl === 'https://forms.office.com/'
    })
  }

  private updateFilesToOpenInWeb = (files: any[]) => {
    return files?.map((file) => {
      if(file.microsoftFileType === 'file' && !file.microsoftUrl.includes('?')) {
        return {
          ...file,
          microsoftUrl: `${file.microsoftUrl}?web=1`,
        }
      }
    });
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

      const banners = [];

      if(this.filesHaveDuplicates(files)) {
        banners.push(locale.banners.duplicatesFound);
      }

      if(this.filesHaveLinkToMsFormsRoot(files)) {
        banners.push(locale.banners.formFound);
      }

      files = this.updateFilesToOpenInWeb(files);

      return res.render('linkExchange', {
        locale,
        data: {
          form: body,
          files,
          banners,
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
