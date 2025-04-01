/*
 * Do appinsights first as it does some magic instrumentation work, i.e. it affects other 'require's
 * In particular, applicationinsights automatically collects bunyan logs
 */
import applicationInfoSupplier from '../applicationInfo'
import MigrationLinkExchangeApiClient from './migrationLinkExchangeApiClient'

const applicationInfo = applicationInfoSupplier()

export const dataAccess = () => ({
  applicationInfo,
  migrationLinkExchangeApi: new MigrationLinkExchangeApiClient(),
})

export type DataAccess = ReturnType<typeof dataAccess>
