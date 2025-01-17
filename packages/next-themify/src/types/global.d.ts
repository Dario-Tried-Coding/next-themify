import { UPDATED_STORAGE_CEK, UPDATE_STORAGE_CEK } from '../constants'
import { CustomSE } from './script'

declare global {
  interface WindowEventMap {
    [UPDATE_STORAGE_CEK]: CustomSE
    [UPDATED_STORAGE_CEK]: CustomSE
  }
}

export {}
