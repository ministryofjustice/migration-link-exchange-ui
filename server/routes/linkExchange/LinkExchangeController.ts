import { NextFunction, Request, Response } from 'express'
import FileInformationService from '../../services/FileInformationService'
import locale from './link-exchange.locale.json'
import { HttpError } from '../../utils/HttpError'
import { FileInformation } from '../../interfaces/FileInformation'

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

  private filesHaveDuplicates = (files: FileInformation[]) => {
    if (!files || files.length === 1) {
      return false
    }

    return files.some(file => {
      // Check if the file name ends in a number in parentheses, e.g. (1), (2), etc.
      // Or ends in a number in parentheses with a file extension e.g. (1).txt, (2).docx, etc.
      const match = file.microsoftPath?.match(/\((\d+)\)(\.[a-z]{2,4})?$/)
      return !!match
    })
  }

  private filesHaveLinkToMsFormsRoot = (files: FileInformation[]) => {
    if (!files?.length) {
      return false
    }
    return files.some(file => {
      // Check if the file's Microsoft URL is the root of MS Forms
      return file.microsoftUrl === 'https://forms.office.com/'
    })
  }

  private updateFilesToOpenInWeb = (files: FileInformation[]) => {
    return files?.map(file => {
      if (file.microsoftFileType === 'file' && !file.microsoftUrl.includes('?')) {
        return {
          ...file,
          microsoftUrl: `${file.microsoftUrl}?web=1`,
        }
      }
      return file
    })
  }

  // TODO: This should not be in the UI layer, but in the API service layer.
  // It is practical to keep it here for now, as it's easier to write in JavaScript.
  private extractOwnerFromMicrosoftPath = (microsoftPath: string): string | undefined => {
    // It should match the pattern `/personal/firstname_lastname_justice_gov_uk/Documents/GW`
    const justiceMatch = microsoftPath.match(/^\/personal\/([^/]+)_justice_gov_uk(1|2)?\/Documents\/GW/)
    if (justiceMatch) {
      return justiceMatch[1].replace(/_/g, '.') + '@justice.gov.uk'
    }
    // Or, it could match the pattern `/personal/firstname_lastname_ppo_gov_uk/Documents/GW`
    const ppoMatch = microsoftPath.match(/^\/personal\/([^/]+)_ppo_gov_uk(1|2)?\/Documents\/GW/)
    if (ppoMatch) {
      return ppoMatch[1].replace(/_/g, '.') + '@ppo.gov.uk'
    }
    // Or, it could match the pattern `/personal/firstname_lastname_publicguardian_gov_uk/Documents/GW`
    const publicGuardianMatch = microsoftPath.match(/^\/personal\/([^/]+)_publicguardian_gov_uk(1|2)?\/Documents\/GW/)
    if (publicGuardianMatch) {
      return publicGuardianMatch[1].replace(/_/g, '.') + '@publicguardian.gov.uk'
    }
    // If no match is found, return undefined
    return
  }

  private updateFilesWithCurrentOwner = (files: FileInformation[]) => {
    return files?.map(file => {
      if (file.microsoftFileType === 'file') {
        return {
          ...file,
          microsoftOwnerEmail: this.extractOwnerFromMicrosoftPath(file.microsoftPath),
        }
      }
      return file
    })
  }

  private render = async (req: Request, res: Response, next: NextFunction) => {
    const { errors, body } = req
    let files: FileInformation[]

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
        files = (await this.fileInformationService.getFilesBySourceURL(req.body.link)) satisfies FileInformation[]
      }

      const formDetected = this.filesHaveLinkToMsFormsRoot(files)

      if (formDetected) {
        files = []
      }

      files = this.updateFilesToOpenInWeb(files)

      files = this.updateFilesWithCurrentOwner(files)

      return res.render('linkExchange', {
        locale,
        data: {
          form: body,
          files,
          duplicatesDetected: this.filesHaveDuplicates(files),
          formDetected,
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
