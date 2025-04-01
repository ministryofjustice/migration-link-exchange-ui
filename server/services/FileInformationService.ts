import { MigrationLinkExchangeApiClient } from '../data/migrationLinkExchangeApiClient'

export default class FileInformationService {
  constructor(private readonly migrationLinkExchangeApiClient: MigrationLinkExchangeApiClient) {}

  getFilesBySourceURL = (url: string) => this.migrationLinkExchangeApiClient.getFilesBySourceURL(url)

  extractFileId(url: string): string | null {
    if (!/^https?:\/\/(?:docs\.google|drive\.google)\.com/.test(url)) {
      return null
    }

    const regex = /\/(?:d|folders)\/([a-zA-Z0-9_-]+)/
    const match = url.match(regex)
    return match ? match[1] : null
  }
}
