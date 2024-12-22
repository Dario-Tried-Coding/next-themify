import { CUSTOM_SEK } from '../constants'
import { Custom_SE} from './script'

declare global {
  interface WindowEventMap {
    [CUSTOM_SEK]: Custom_SE
  }
}

export { }