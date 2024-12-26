import { Color_Scheme, DARK, LIGHT, LIGHT_DARK, MONO, MULTI, SYSTEM } from '../constants'

type IsLiteralArray<T> = T extends readonly string[] ? (string[] extends T ? false : true) : false
type ToObjects<T extends string[], ObjType extends { key: string }, Acc extends any[] = []> = IsLiteralArray<T> extends true ? (T extends readonly [infer First extends string, ...infer Rest extends string[]] ? ToObjects<Rest, ObjType, [...Acc, { key: First } & Omit<ObjType, 'key'>]> : Acc) : ObjType[]

type Light_Dark_Keys = { light: string; dark: string; system: string; custom: string[] }

type Key = string | string[] | Partial<Light_Dark_Keys>
export type Keys = Record<string, Key>

type Mode_Selector = 'class' | 'colorScheme'

type Mode_Prop<V extends Key> = {
  type: 'mode'
  store?: boolean
  selector?: Mode_Selector | Mode_Selector[]
} & (V extends string
  ? { strategy: MONO; key: V; colorScheme: Color_Scheme }
  : V extends string[]
    ? { strategy: MULTI; keys: ToObjects<V, { key: string; colorScheme: Color_Scheme }>; preferred: V[number] }
    : V extends Partial<Light_Dark_Keys>
      ?
          | {
              strategy: LIGHT_DARK
              enableSystem: true
              keys: { light: V['light'] extends string ? V['light'] : LIGHT; dark: V['dark'] extends string ? V['dark'] : DARK; system: V['system'] extends string ? V['system'] : SYSTEM } & (V['custom'] extends string[] ? { custom: ToObjects<V['custom'], { key: string; colorScheme: Color_Scheme }> } : {})
              preferred: (V['light'] extends string ? V['light'] : LIGHT) | (V['dark'] extends string ? V['dark'] : DARK) | (V['system'] extends string ? V['system'] : SYSTEM) | (V['custom'] extends string[] ? V['custom'][number] : never)
              fallback: (V['light'] extends string ? V['light'] : LIGHT) | (V['dark'] extends string ? V['dark'] : DARK) | (V['custom'] extends string[] ? V['custom'][number] : never)
            }
          | {
              strategy: LIGHT_DARK
              enableSystem: false
              keys: { light: V['light'] extends string ? V['light'] : LIGHT; dark: V['dark'] extends string ? V['dark'] : DARK } & (V['custom'] extends string[] ? { custom: ToObjects<V['custom'], { key: string; colorScheme: Color_Scheme }> } : {})
              preferred: (V['light'] extends string ? V['light'] : LIGHT) | (V['dark'] extends string ? V['dark'] : DARK) | (V['custom'] extends string[] ? V['custom'][number] : never)
            }
      : never)
export type Static_Mode_Prop = {
  type: 'mode'
  store?: boolean
  selector?: Mode_Selector | Mode_Selector[]
} & ({ strategy: MONO; key: string; colorScheme: Color_Scheme } | { strategy: MULTI; keys: { key: string; colorScheme: Color_Scheme }[]; preferred: string } | { strategy: LIGHT_DARK; keys: { light: string; dark: string; system: string; custom?: { key: string; colorScheme: Color_Scheme }[] }; preferred: string; fallback: string; enableSystem?: boolean })

type Generic_Prop<V extends Key> = {
  type: 'generic'
} & (V extends string ? { strategy: MONO; key: V } : V extends string[] ? { strategy: MULTI; keys: V; preferred: V[number] } : never)
type Static_Generic_Prop = {
  type: 'generic'
} & ({ strategy: MONO; key: string } | { strategy: MULTI; keys: string[]; preferred: string })

export type Config<K extends Keys> = {
  [P in keyof K]: K[P] extends Partial<Light_Dark_Keys> ? Mode_Prop<K[P]> : Mode_Prop<K[P]> | Generic_Prop<K[P]>
}
export type Static_Config = {
  [key: string]: Static_Mode_Prop | Static_Generic_Prop
}

export type Values<K extends Keys, C extends Config<K>> = {
  [P in keyof C]: C[P] extends { type: 'mode' }
    ? C[P] extends { strategy: MONO }
      ? C[P]['key']
      : C[P] extends { strategy: MULTI }
        ? C[P]['keys'][number]['key']
        : C[P] extends { strategy: LIGHT_DARK }
          ? C[P]['keys']['light'] | C[P]['keys']['dark'] | (C[P] extends { enableSystem?: true } ? C[P]['keys']['system'] : never) | (C[P]['keys'] extends { custom: { key: string; colorScheme: Color_Scheme }[] } ? C[P]['keys']['custom'][number]['key'] : never)
          : 'altro'
    : C[P] extends { type: 'generic' }
      ? C[P] extends { strategy: MONO }
        ? C[P]['key']
        : C[P] extends { strategy: MULTI }
          ? C[P]['keys'][number]
          : never
      : never
}
