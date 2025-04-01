import { RestClient } from '@ministryofjustice/hmpps-rest-client'
import config from '../config'
import logger from '../../logger'
import { FileInformation } from '../interfaces/FileInformation'

export default class MigrationLinkExchangeApiClient extends RestClient {
  constructor() {
    super('Migration Exchange Link API', config.apis.migrationLinkExchangeApi, logger)
  }

  getFilesBySourceURL(url: string) {
    return this.get<FileInformation[]>({
      path: '/link',
      query: {
        q: url,
      },
    })
  }
}
