import { dataAccess } from '../data'
import FileInformationService from './FileInformationService'

export const services = () => {
  const { applicationInfo, migrationLinkExchangeApi } = dataAccess()
  const fileInformationService = new FileInformationService(migrationLinkExchangeApi)

  return {
    applicationInfo,
    fileInformationService,
  }
}

export type Services = ReturnType<typeof services>
