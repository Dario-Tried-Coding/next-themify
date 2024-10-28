import { CUSTOM, DARK, DEFAULT, LIGHT, LIGHT_DARK, MONO, MULTI, STATIC, SYSTEM } from '../constants'
import { AtLeastOne, IsLiteralArray } from './utils'

type Mono_Key = string
type Custom_Keys = string[]
type Multi_Keys = string[]
type Light_Dark_Keys = {
  light: string
  dark: string
  system: string
  custom: string[]
}

type Basic_Key = Mono_Key | Multi_Keys
type Mode_Key = Mono_Key | Custom_Keys | Partial<Light_Dark_Keys>

type Keys = {
  theme: Basic_Key
  mode: Mode_Key
  radius: Basic_Key
}
export type Keys_Config = AtLeastOne<Keys>

export type Prop = keyof Keys_Config

export type Mono_Strat<Key extends string> = { strategy: MONO; key: Key }
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; default: Keys[number] }
export type Custom_Strat<Keys extends string[]> = { strategy: CUSTOM; keys: Keys; default: Keys[number] }

export type Light_Dark_Strat<Overrides extends Partial<Light_Dark_Keys> = {}> = {
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
      } & (Overrides['custom'] extends string[]
        ? IsLiteralArray<Overrides['custom']> extends true
          ? { custom: Overrides['custom'] }
          : { custom?: string[] }
        : {})
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
      } & (Overrides['custom'] extends string[]
        ? IsLiteralArray<Overrides['custom']> extends true
          ? { custom: Overrides['custom'] }
          : { custom?: string[] }
        : {})
    }
)

type Generic_Prop<K extends Basic_Key> = K extends Mono_Key ? Mono_Strat<K> : K extends Multi_Keys ? Multi_Strat<K> : never
type Mode_Prop<K extends Mode_Key> = K extends Mono_Key
  ? Mono_Strat<K>
  : K extends Custom_Keys
    ? Custom_Strat<K>
    : K extends Partial<Light_Dark_Keys>
      ? Light_Dark_Strat<K>
      : never

export type Config<K extends Keys_Config | STATIC | null> = K extends STATIC
  ? {
      [P in keyof Keys]?: P extends 'mode'
        ? Mode_Prop<string> | Mode_Prop<string[]> | Mode_Prop<{ light: string; dark: string; system: string; custom: string[] }>
        : Generic_Prop<string> | Generic_Prop<string[]>
    }
  : K extends Keys_Config
    ? {
        [P in keyof K]-?: P extends 'mode' ? Mode_Prop<NonNullable<K[P]>> : P extends Exclude<Prop, 'mode'> ? Generic_Prop<NonNullable<K[P]>> : never
      } & {
        [P in keyof Omit<Keys, keyof K>]?: P extends 'mode' ? Mode_Prop<DEFAULT> | Mode_Prop<{}> : Generic_Prop<DEFAULT>
      }
    : AtLeastOne<{
        [P in keyof Keys]?: P extends 'mode' ? Mode_Prop<DEFAULT> | Mode_Prop<{}> : Generic_Prop<DEFAULT>
      }>