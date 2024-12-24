import { Color_Scheme, CUSTOM, DARK, DEFAULT, LIGHT, LIGHT_DARK, MONO, MULTI, STATIC, SYSTEM } from '../constants'
import { AtLeastOne, IsLiteralArray, ToObjects } from './utils'

// #region Keys ------------------------------------------------------------------------------------------
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
export type Keys_Config = AtLeastOne<Keys> | null

// #region Prop ------------------------------------------------------------------------------------------
export type Prop = keyof NonNullable<Keys_Config>

// #region Strats ----------------------------------------------------------------------------------------
export type Selector = 'class' | 'color-scheme'
export type Mode<Key extends string = string> = {
  key: Key
  colorScheme: Color_Scheme
}

export type Mono_Strat<Key extends string> = { strategy: MONO; key: Key } // Static -> Mono_Strat<string>; Default -> Mono_Strat<PREFERRED>; Dynamic -> Mono_Strat<'string'>
export type Multi_Strat<Keys extends string[]> = { strategy: MULTI; keys: Keys; preferred: Keys[number] } // Static -> Multi_Strat<string[]>; Dynamic -> Multi_Strat<['string1', 'string2']>

// Static -> Mono_Mode_Strat<string>; Default -> Mono_Mode_Strat<PREFERRED>; Dynamic -> Mono_Mode_Strat<'some string'>
export type Mono_Mode_Strat<Key extends string> = {
  strategy: MONO
  selector?: Selector | Selector[]
} & Mode<Key>
// Static -> Custom_Strat<string[]>; Dynamic -> Custom_Strat<['string1', 'string2']>
export type Custom_Mode_Strat<Keys extends string[]> = {
  strategy: CUSTOM
  selector?: Selector | Selector[]
  keys: ToObjects<Keys, Mode>
  preferred: Keys[number]
}
// Static -> Light_Dark_Strat<{light: string, dark: string, system: string, custom: string[]}>;
// Default -> Light_Dark_Strat;
// Dynamic -> Light_Dark_Strat<{ light: 'custom light', dark: 'custom dark', system: 'custom system', custom: ['custom 1', 'custom 2'] }>
export type Light_Dark_Mode_Strat<Overrides extends Partial<Light_Dark_Keys> = {}> = {
  strategy: LIGHT_DARK
  selector?: Selector | Selector[]
} & (
  | {
      enableSystem: true
      preferred:
        | (Overrides['light'] extends string ? Overrides['light'] : LIGHT)
        | (Overrides['dark'] extends string ? Overrides['dark'] : DARK)
        | (Overrides['system'] extends string ? Overrides['system'] : SYSTEM)
        | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
      fallback: (Overrides['light'] extends string ? Overrides['light'] : LIGHT) | (Overrides['dark'] extends string ? Overrides['dark'] : DARK) | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
      keys: {
        light: Overrides['light'] extends string ? Overrides['light'] : LIGHT
        dark: Overrides['dark'] extends string ? Overrides['dark'] : DARK
        system: Overrides['system'] extends string ? Overrides['system'] : SYSTEM
      } & (Overrides['custom'] extends string[] ? (IsLiteralArray<Overrides['custom']> extends true ? { custom: ToObjects<Overrides['custom'], Mode> } : { custom?: Mode[] }) : {})
    }
  | {
      enableSystem: false
      preferred: (Overrides['light'] extends string ? Overrides['light'] : LIGHT) | (Overrides['dark'] extends string ? Overrides['dark'] : DARK) | (Overrides['custom'] extends string[] ? Overrides['custom'][number] : never)
      keys: {
        light: Overrides['light'] extends string ? Overrides['light'] : LIGHT
        dark: Overrides['dark'] extends string ? Overrides['dark'] : DARK
      } & (Overrides['custom'] extends string[] ? (IsLiteralArray<Overrides['custom']> extends true ? { custom: ToObjects<Overrides['custom'], Mode> } : { custom?: Mode[] }) : {})
    }
)

// #region Config ----------------------------------------------------------------------------------------

// Static Mono -> Generic_Prop<string>; Static Multi -> Generic_Prop<string[]>
// Default Mono -> Generic_Prop<PREFERRED>
// Dynamic Mono -> Generic_Prop<'some string'>; Dynamic Multi -> Generic_Prop<['string1', 'string2']>
type Generic_Prop<K extends Basic_Key> = K extends Mono_Key ? Mono_Strat<K> : K extends Multi_Keys ? Multi_Strat<K> : never

// Static Mono -> Mode_Prop<string>; Static Custom -> Mode_Prop<string[]>; Static Light_Dark -> Mode_Prop<{light: string, dark: string, system: string, custom: string[]}>
// Default Mono -> Mode_Prop<DEFAULT>; Default Light_Dark -> Mode_Prop<{}>;
// Dynamic Mono -> Mode_Prop<'some string'>; Dynamic Custom -> Mode_Prop<['string1', 'string2']>; Dynamic Light_Dark -> Mode_Prop<{ light: 'custom light', dark: 'custom dark', system: 'custom system', custom: ['custom 1', 'custom 2'] }>
type Mode_Prop<K extends Mode_Key> = K extends Mono_Key ? Mono_Mode_Strat<K> : K extends Custom_Keys ? Custom_Mode_Strat<K> : K extends Partial<Light_Dark_Keys> ? Light_Dark_Mode_Strat<K> : never

export type Config<K extends Keys_Config | STATIC = STATIC> = K extends STATIC
  ? {
      [P in keyof Keys]?: P extends 'mode' ? Mode_Prop<string> | Mode_Prop<string[]> | Mode_Prop<{ light: string; dark: string; system: string; custom: string[] }> : Generic_Prop<string> | Generic_Prop<string[]>
    }
  : K extends NonNullable<Keys_Config>
    ? {
        [P in keyof K]-?: P extends 'mode' ? Mode_Prop<NonNullable<K[P]>> : P extends Exclude<Prop, 'mode'> ? Generic_Prop<NonNullable<K[P]>> : never
      } & {
        [P in keyof Omit<Keys, keyof K>]?: P extends 'mode' ? Mode_Prop<DEFAULT> | Mode_Prop<{}> : Generic_Prop<DEFAULT>
      }
    : AtLeastOne<{
        [P in keyof Keys]?: P extends 'mode' ? Mode_Prop<DEFAULT> | Mode_Prop<{}> : Generic_Prop<DEFAULT>
      }>

export type Values<C extends Config<Keys_Config>> = {
  [P in keyof C]-?: P extends 'mode'
    ? C[P] extends { key: string }
      ? C[P]['key']
      : C[P] extends { keys: { key: string }[] }
        ? C[P]['keys'][number]['key']
        : C[P] extends { keys: { light: string; dark: string; system?: string; custom?: string[] } }
          ?
              | C[P]['keys']['light']
              | C[P]['keys']['dark']
              | (C[P]['keys']['system'] extends string ? C[P]['keys']['system'] : never)
              | (C[P]['keys']['custom'] extends { key: string; colorScheme: Color_Scheme }[] ? C[P]['keys']['custom'][number]['key'] : never)
          : never
    : C[P] extends { key: string }
      ? C[P]['key']
      : C[P] extends { keys: string[] }
        ? C[P]['keys'][number]
        : never
}
