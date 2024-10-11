import { CUSTOM, DARK, DEFAULT, LIGHT, LIGHT_DARK, MONO, MULTI, SYSTEM } from '../constants'
import { AtLeastOne } from './utils'

// OPTIONS ------------------------------------------------------------------
type Mono_Opt = string
type Custom_Opts = string[]

export type Light_Dark_Mode_Opts = {
  light?: string
  dark?: string
  system?: string
  custom?: string[]
}
type Mode_Opts = AtLeastOne<Light_Dark_Mode_Opts>

// KEYS ---------------------------------------------------------------------
type Keys = {
  theme?: Mono_Opt | Custom_Opts
  mode?: Mono_Opt | Custom_Opts | Mode_Opts
  radius?: Mono_Opt | Custom_Opts
}
export type Keys_Config = AtLeastOne<Keys> | undefined

// STRATEGIES ----------------------------------------------------------------
export type Mono_Strat<String extends string> = { strategy: MONO; key: String }
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; default: Keys[number] }
export type Custom_Mode_Strat<Keys extends string[]> = { strategy: CUSTOM; keys: Keys; default: Keys[number] }

type Light_Dark_Mode_Keys<Keys extends Mode_Opts, Include_System extends 'exclude_system' | undefined = undefined> = {
  [Key in keyof Light_Dark_Mode_Opts as Key extends CUSTOM
    ? Keys[Key] extends string[]
      ? Key
      : never
    : Key extends SYSTEM
      ? Include_System extends 'exclude_system'
        ? never
        : Key
      : Key]-?: Keys[Key] extends string | string[]
    ? Keys[Key]
    : Key extends LIGHT
      ? LIGHT
      : Key extends DARK
        ? DARK
        : Key extends SYSTEM
          ? SYSTEM
          : Key extends CUSTOM
            ? Keys[Key]
            : never
}
type Light_Dark_Mode_Strat<Keys extends Mode_Opts> = {
  strategy: LIGHT_DARK
  fallback?:
    | (Keys[LIGHT] extends string ? Keys[LIGHT] : LIGHT)
    | (Keys[DARK] extends string ? Keys[DARK] : DARK)
    | (Keys[CUSTOM] extends string[] ? Keys[CUSTOM][number] : never)
} & (
  | {
      enableSystem: true
      default:
        | (Keys[LIGHT] extends string ? Keys[LIGHT] : LIGHT)
        | (Keys[DARK] extends string ? Keys[DARK] : DARK)
        | (Keys[SYSTEM] extends string ? Keys[SYSTEM] : SYSTEM)
        | (Keys[CUSTOM] extends string[] ? Keys[CUSTOM][number] : never)
      keys: Light_Dark_Mode_Keys<Keys>
    }
  | {
      enableSystem: false
      default:
        | (Keys[LIGHT] extends string ? Keys[LIGHT] : LIGHT)
        | (Keys[DARK] extends string ? Keys[DARK] : DARK)
        | (Keys[CUSTOM] extends string[] ? Keys[CUSTOM][number] : never)
      keys: Light_Dark_Mode_Keys<Keys, 'exclude_system'>
    }
)

// CONFIG -------------------------------------------------------------------
type Construct_Prop<K extends NonNullable<Keys_Config>['theme']> = K extends undefined
  ? Mono_Strat<DEFAULT>
  : K extends Mono_Opt
    ? Mono_Strat<K>
    : K extends Custom_Opts
      ? Multi_Strat<K>
      : never

type Construct_Mode<K extends NonNullable<Keys_Config>['mode']> = K extends undefined
  ? Mono_Strat<DEFAULT>
  : K extends Mono_Opt
    ? Mono_Strat<K>
    : K extends Custom_Opts
      ? Custom_Mode_Strat<K>
      : K extends Mode_Opts
        ? K[CUSTOM] extends string[]
          ? Custom_Mode_Strat<K[CUSTOM]> | Light_Dark_Mode_Strat<K>
          : Light_Dark_Mode_Strat<K>
        : never

export type Config<K extends Keys_Config> = AtLeastOne<{
  [Prop in keyof NonNullable<Keys_Config>]?: Prop extends 'mode'
    ? Construct_Mode<K extends Record<Prop, any> ? K[Prop] : undefined>
    : Construct_Prop<K extends Record<Prop, any> ? K[Prop] : undefined>
}>
