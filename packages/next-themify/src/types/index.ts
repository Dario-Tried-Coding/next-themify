import { CUSTOM, DEFAULT, LIGHT_DARK, MONO, MULTI, STATIC, SYSTEM } from '../constants'
import { AtLeastOne } from './utils'

// #region OPTS
type Mono_Opt = string
type Custom_Opts = string[]
type Mode_Opts = {
  light: string
  dark: string
  system?: string
  custom?: string[]
}
// #endregion

// #region KEYS
type Basic_Prop_Keys = Mono_Opt | Custom_Opts
type Mode_Prop_Keys = Basic_Prop_Keys | Mode_Opts

type Keys = {
  theme?: Basic_Prop_Keys
  mode?: Mode_Prop_Keys
  radius?: Basic_Prop_Keys
}
export type Keys_Config = AtLeastOne<Keys> | undefined
// #endregion

// #region PROPS
export type Prop = keyof NonNullable<Keys_Config>
// #endregion

// #region STRATS
export type Mono_Strat<String extends string> = { strategy: MONO; key: String }
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; default: Keys[number] }
export type Custom_Mode_Strat<Keys extends string[]> = { strategy: CUSTOM; keys: Keys; default: Keys[number] }

export type Light_Dark_Mode_Strat<Prov_Opts extends Mode_Opts | STATIC> = Prov_Opts extends Mode_Opts
  ? {
      strategy: LIGHT_DARK
      fallback: Prov_Opts['light'] | Prov_Opts['dark'] | (Prov_Opts['custom'] extends string[] ? Prov_Opts['custom'][number] : never)
    } & (
      | {
          enableSystem: true
          default:
            | Prov_Opts['light']
            | Prov_Opts['dark']
            | (Prov_Opts['system'] extends string ? Prov_Opts['system'] : SYSTEM)
            | (Prov_Opts['custom'] extends string[] ? Prov_Opts['custom'][number] : never)
          keys: {
            light: Prov_Opts['light']
            dark: Prov_Opts['dark']
            system: Prov_Opts['system'] extends string ? Prov_Opts['system'] : SYSTEM
          } & (Prov_Opts['custom'] extends string[] ? { custom: Prov_Opts['custom'] } : {})
        }
      | {
          enableSystem: false
          default: Prov_Opts['light'] | Prov_Opts['dark'] | (Prov_Opts['custom'] extends string[] ? Prov_Opts['custom'][number] : never)
          keys: {
            light: Prov_Opts['light']
            dark: Prov_Opts['dark']
          } & (Prov_Opts['custom'] extends string[] ? { custom: Prov_Opts['custom'] } : {})
        }
    )
  : {
      strategy: LIGHT_DARK
      default: string
      fallback: string
    } & (
      | {
          enableSystem: true
          keys: Omit<Mode_Opts, 'system'> & Required<Pick<Mode_Opts, 'system'>>
        }
      | {
          enableSystem: false
          keys: Omit<Mode_Opts, 'system'>
        }
    )
// #endregion

// #region CONFIG
type Config_Prop<Prov_Keys extends Basic_Prop_Keys | DEFAULT | STATIC = DEFAULT> = Prov_Keys extends STATIC
  ? Mono_Strat<string> | Multi_Strat<string[]>
  : Prov_Keys extends DEFAULT
    ? Mono_Strat<DEFAULT>
    : Prov_Keys extends Mono_Opt
      ? Mono_Strat<Prov_Keys>
      : Prov_Keys extends Custom_Opts
        ? Multi_Strat<Prov_Keys>
        : never

type Mode_Prop<Prov_Keys extends Mode_Prop_Keys | DEFAULT | STATIC = DEFAULT> = Prov_Keys extends STATIC
  ? Mono_Strat<string> | Light_Dark_Mode_Strat<STATIC> | Custom_Mode_Strat<string[]>
  : Prov_Keys extends DEFAULT
    ? Mono_Strat<DEFAULT>
    : Prov_Keys extends Mono_Opt
      ? Mono_Strat<Prov_Keys>
      : Prov_Keys extends Custom_Opts
        ? Custom_Mode_Strat<Prov_Keys>
        : Prov_Keys extends Mode_Opts
          ? Light_Dark_Mode_Strat<Prov_Keys>
          : never

export type Config<Prov_Keys extends Keys_Config | STATIC = undefined> = Prov_Keys extends STATIC
  ? {
      [Curr_Prop in keyof Keys]?: Curr_Prop extends 'mode' ? Mode_Prop<STATIC> : Config_Prop<STATIC>
    }
  : Prov_Keys extends undefined
    ? AtLeastOne<{
        [Curr_Prop in keyof Keys]?: Curr_Prop extends 'mode' ? Mode_Prop<DEFAULT> : Config_Prop<DEFAULT>
      }>
    : Prov_Keys extends NonNullable<Keys_Config>
      ? {
          [Curr_Prop in keyof Prov_Keys]-?: Curr_Prop extends 'mode'
            ? Mode_Prop<NonNullable<Prov_Keys[Curr_Prop]>>
            : Curr_Prop extends Exclude<Prop, 'mode'>
              ? Config_Prop<NonNullable<Prov_Keys[Curr_Prop]>>
              : never
        } & {
          [Curr_Prop in keyof Omit<Keys, keyof Prov_Keys>]?: Curr_Prop extends 'mode' ? Mode_Prop<DEFAULT> : Config_Prop<DEFAULT>
        }
      : never
// #endregion

const test: Config<undefined> = {
  theme: {
    strategy: 'mono',
    key: 'default',
  },
  
}
