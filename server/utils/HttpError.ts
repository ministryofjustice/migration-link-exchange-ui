/* eslint-disable @typescript-eslint/no-explicit-any */
export interface HttpError extends Error {
  status: number
  json?: boolean
}

export const HttpError: {
  new (statusCode: number, message?: string, json?: boolean): HttpError
  (statusCode: number, message?: string, json?: boolean): HttpError
} = function createHttpError(this: any, statusCode: number, message?: string, json?: boolean): HttpError {
  if (!(this instanceof HttpError)) {
    return new HttpError(statusCode, message, json)
  }

  Error.call(this, message)
  this.name = 'HttpError'
  this.status = statusCode
  this.message = message || 'An error occurred'
  this.json = json

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, HttpError)
  }

  return this
} as any

HttpError.prototype = Object.create(Error.prototype)
HttpError.prototype.constructor = HttpError
