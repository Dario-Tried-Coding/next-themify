import { State } from '../types/core'

export class StateManager {
  private static instance: StateManager
  private _state: State = null

  private constructor() {}

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager()
    }
    return StateManager.instance
  }

  get state(): StateManager['_state'] {
    return this._state
  }

  set state(state: NonNullable<State>) {
    this._state = new Map([...(this._state ? this._state : []), ...state])
  }
}