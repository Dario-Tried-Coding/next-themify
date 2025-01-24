import { LIBRARY_NAME } from '../constants'
import { Core } from '../core'
import { UndefinedOr } from './utils'

declare global {
  interface Window {
    [LIBRARY_NAME]: UndefinedOr<Core>
  }
}

export {}
