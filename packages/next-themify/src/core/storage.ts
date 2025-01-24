import { ModeConfig, StorageKeys } from "../types/core"
import { NullOr } from "../types/utils"
import { jsonToMap } from "./utils"

export class StorageManager {
  private storageKeys: StorageKeys
  private modeConfig: ModeConfig

  constructor({ storageKeys, modeConfig }: { storageKeys: StorageKeys; modeConfig: NullOr<ModeConfig> }) {
    this.storageKeys = storageKeys
    this.modeConfig = modeConfig
  }

  #retrieve(key: string) {
    return localStorage.getItem(key)
  }

  #store(key: string, value: string) {
    localStorage.setItem(key, value)
  }

  retrieveState() {
    return this.#retrieve(this.storageKeys.state)
  }

  storeState(value: string) {
    const isStored = this.#retrieve(this.storageKeys.state) === value
    if (!isStored) this.#store(this.storageKeys.state, value)

    const mode = jsonToMap(value).get(this.modeConfig?.prop)
    if (mode && this.modeConfig?.store) this.#store(this.storageKeys.mode, mode)
  }
}
