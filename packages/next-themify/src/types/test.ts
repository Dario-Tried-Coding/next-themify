import { CUSTOM, DARK, DEFAULT, LIGHT, LIGHT_DARK, MONO, MULTI, STATIC, SYSTEM } from '../constants'
import { AtLeastOne, IsLiteralArray } from './utils'

type Mono_Key = string
type Custom_Keys = string[]
type Multi_Keys = string[]
type Mode_Keys = {
  light: string
  dark: string
  system: string
  custom: string[]
}

type Basic_Key = Mono_Key | Multi_Keys
type Mode_key = Mono_Key | Custom_Keys | Partial<Mode_Keys>

type Keys = {
  theme: Basic_Key
  mode: Mode_key
  radius: Basic_Key
}
export type Keys_Config = AtLeastOne<Keys>

export type Prop = keyof Keys_Config

export type Mono_Strat<Key extends string> = { strategy: MONO; key: Key }
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; default: Keys[number] }
export type Custom_Strat<Keys extends string[]> = { strategy: CUSTOM; keys: Keys; default: Keys[number] }

export type Light_Dark_Strat<Overrides extends Partial<Mode_Keys> = {}> =
  Overrides extends Partial<Mode_Keys>
    ? {
        strategy: LIGHT_DARK
      } & (
        | {
            enableSystem: true
            default:
              | (Overrides['light'] extends string ? Overrides['light'] : LIGHT)
              | (Overrides['dark'] extends string ? Overrides['dark'] : DARK)
              | (Overrides['system'] extends string ? Overrides['system'] : SYSTEM)
              | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
            fallback:
              | (Overrides['light'] extends string ? Overrides['light'] : LIGHT)
              | (Overrides['dark'] extends string ? Overrides['dark'] : DARK)
              | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
            keys: {
              light: Overrides['light'] extends string ? Overrides['light'] : LIGHT
              dark: Overrides['dark'] extends string ? Overrides['dark'] : DARK
              system: Overrides['system'] extends string ? Overrides['system'] : SYSTEM
            } & (Overrides['custom'] extends string[] ? { custom: Overrides['custom'] } : {})
          }
        | {
            enableSystem: false
            default:
              | (Overrides['light'] extends string ? Overrides['light'] : LIGHT)
              | (Overrides['dark'] extends string ? Overrides['dark'] : DARK)
              | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
            keys: {
              light: Overrides['light'] extends string ? Overrides['light'] : LIGHT
              dark: Overrides['dark'] extends string ? Overrides['dark'] : DARK
            } & (IsLiteralArray<Overrides['custom']> extends true
                ? { custom: Overrides['custom'] } : Overrides['custom'] extends unknown ? {}
                : { custom?: string[] })
          }
      )
    : {
        strategy: LIGHT_DARK
        default: string
      } & (
        | { enableSystem: true; keys: Pick<Mode_Keys, 'light' | 'dark' | 'system'> & Pick<Partial<Mode_Keys>, 'custom'>; fallback: string }
        | { enableSystem: false; keys: Pick<Mode_Keys, 'light' | 'dark'> & Pick<Partial<Mode_Keys>, 'custom'> }
      )

type Generic_Prop<K extends Basic_Key> = K extends Mono_Key ? Mono_Strat<K> : K extends Multi_Keys ? Multi_Strat<K> : never

const test: Light_Dark_Strat<{custom: ['a', 'b']}> = {
  strategy: 'light_dark',
  enableSystem: false,
  default: 'light',
  keys: {
    light: 'light',
    dark: 'dark',
    
  },
}