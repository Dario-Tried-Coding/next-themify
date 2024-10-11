import { CUSTOM, DARK, DEFAULT, LIGHT, LIGHT_DARK, MONO, MULTI, SYSTEM } from '../constants'
import { AtLeastOne } from './utils'

type Mono_Opt = string
type Custom_Opts = string[]
type Light_Dark_Mode_Opts = {
  light?: string
  dark?: string
  system?: string
  custom?: string[]
}
type Mode_Opts = AtLeastOne<Light_Dark_Mode_Opts>

export type Keys =
  | AtLeastOne<{
      theme?: Mono_Opt | Custom_Opts
      mode?: Mono_Opt | Mode_Opts
      radius?: Mono_Opt | Custom_Opts
    }>
  | undefined

export type Mono_Strat<String extends string> = { strategy: MONO; key: String }
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; default: Keys[number] }
export type Custom_Mode_Strat<Keys extends string[]> = { strategy: CUSTOM; keys: Keys; default: Keys[number] }

type Construct_Light_Dark_Mode_Keys<Keys extends Mode_Opts, Include_System extends 'exclude_system' | undefined = undefined> = {
  [Key in keyof Light_Dark_Mode_Opts as Key extends 'custom'
    ? Keys[Key] extends string[]
      ? Key
      : never
    : Key extends 'system'
      ? Include_System extends 'exclude_system'
        ? never
        : Key
      : Key]-?: Keys[Key] extends string | string[]
    ? Keys[Key]
    : Key extends 'light'
      ? LIGHT
      : Key extends 'dark'
        ? DARK
        : Key extends 'system'
          ? SYSTEM
          : Key extends 'custom'
            ? Keys[Key]
            : never
}
type Light_Dark_Mode_Strat<Keys extends Mode_Opts> = {
  strategy: LIGHT_DARK
  fallback?:
    | (Keys['light'] extends string ? Keys['light'] : LIGHT)
    | (Keys['dark'] extends string ? Keys['dark'] : DARK)
    | (Keys['custom'] extends string[] ? Keys['custom'][number] : never)
} & (
  | {
      enableSystem: true
      default:
        | (Keys['light'] extends string ? Keys['light'] : LIGHT)
        | (Keys['dark'] extends string ? Keys['dark'] : DARK)
        | (Keys['system'] extends string ? Keys['system'] : SYSTEM)
        | (Keys['custom'] extends string[] ? Keys['custom'][number] : never)
      keys: Construct_Light_Dark_Mode_Keys<Keys>
    }
  | {
      enableSystem: false
      default:
        | (Keys['light'] extends string ? Keys['light'] : LIGHT)
        | (Keys['dark'] extends string ? Keys['dark'] : DARK)
        | (Keys['custom'] extends string[] ? Keys['custom'][number] : never)
      keys: Construct_Light_Dark_Mode_Keys<Keys, 'exclude_system'>
    }
)

type Construct_Prop<K extends NonNullable<Keys>['theme']> = K extends undefined
  ? Mono_Strat<DEFAULT>
  : K extends Mono_Opt
    ? Mono_Strat<K>
    : K extends Custom_Opts
      ? Multi_Strat<K>
      : never

type Construct_Mode<K extends NonNullable<Keys>['mode']> = K extends undefined
  ? Mono_Strat<DEFAULT>
  : K extends string
    ? Mono_Strat<K>
    : K extends Mode_Opts
      ? K['custom'] extends string[]
        ? Custom_Mode_Strat<K['custom']> | Light_Dark_Mode_Strat<K>
        : Light_Dark_Mode_Strat<K>
      : never

export type Config<K extends Keys> = AtLeastOne<{
  [Prop in keyof NonNullable<Keys>]?: Prop extends 'mode'
    ? Construct_Mode<K extends Record<Prop, any> ? K[Prop] : undefined>
    : Construct_Prop<K extends Record<Prop, any> ? K[Prop] : undefined>
}>
