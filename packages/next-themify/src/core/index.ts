import { Constraints, ModeConfig, StorageKeys } from '../types/core'
import { DOMManager } from './DOM'
import { StateManager } from './state'
import { jsonToMap, mapToJson } from './utils'
import { genValidation } from './validation'
import { StorageManager } from './storage'

// class Core {
//   private validation: ReturnType<typeof genValidation>
//   private state = StateManager.getInstance()
//   private storage: StorageManager
//   private DOM: DOMManager

//   constructor({ storageKeys, constraints, modeConfig }: { storageKeys: StorageKeys, constraints: Constraints; modeConfig: ModeConfig }) {
//     this.validation = genValidation(constraints)
//     this.storage = new StorageManager({ storageKeys, modeConfig })
//     this.DOM = new DOMManager({ modeConfig })
//   }

//   public init() {
//     const { values } = this.validation.validateValues(jsonToMap(this.storage.retrieveState()))

//     this.storage.storeState(mapToJson(values))
//     this.state.state = values
//     this.DOM.setAttrs(values)

//     alert('Core initialized')
//   }
// }

export class Core {
  public init() {
    alert('Core initialized')
  }
}