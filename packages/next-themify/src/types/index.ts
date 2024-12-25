import { Color_Scheme, DARK, LIGHT, SYSTEM } from '../constants'

type IsLiteralArray<T> = T extends readonly string[] ? (string[] extends T ? false : true) : false
type ToObjects<T extends string[], ObjType extends { key: string }, Acc extends any[] = []> = IsLiteralArray<T> extends true ? (T extends readonly [infer First extends string, ...infer Rest extends string[]] ? ToObjects<Rest, ObjType, [...Acc, { key: First } & Omit<ObjType, 'key'>]> : Acc) : ObjType[]

type Light_Dark_Keys = { light: string; dark: string; system: string; custom: string[] }

type Values = string | string[] | Partial<Light_Dark_Keys>
type Keys = Record<string, Values>

type Mode_Prop<V extends Values> = {
      type: 'mode'
    } & (V extends string
      ? { strategy: 'mono'; key: V; colorScheme: Color_Scheme }
      : V extends string[]
        ? { strategy: 'multi'; keys: ToObjects<V, { key: string; colorScheme: Color_Scheme }>; preferred: V[number] }
        : V extends Partial<Light_Dark_Keys>
          ? {
              strategy: 'light-dark'
              keys: { light: V['light'] extends string ? V['light'] : LIGHT; dark: V['dark'] extends string ? V['dark'] : DARK; system: V['system'] extends string ? V['system'] : SYSTEM } & (V['custom'] extends string[] ? { custom: ToObjects<V['custom'], { key: string; colorScheme: Color_Scheme }> } : {})
              preferred: (V['light'] extends string ? V['light'] : LIGHT) | (V['dark'] extends string ? V['dark'] : DARK) | (V['system'] extends string ? V['system'] : SYSTEM) | (V['custom'] extends string[] ? V['custom'][number] : never)
              fallback: (V['light'] extends string ? V['light'] : LIGHT) | (V['dark'] extends string ? V['dark'] : DARK) | (V['custom'] extends string[] ? V['custom'][number] : never)
            }
          : never)
type Static_Mode_Prop = {
  type: 'mode'
} & ({ strategy: 'mono'; key: string; colorScheme: Color_Scheme } | { strategy: 'multi'; keys: { key: string; colorScheme: Color_Scheme }[]; preferred: string } | { strategy: 'light-dark'; keys: { light: string; dark: string; system: string; custom?: { key: string; colorScheme: Color_Scheme }[] }, preferred: string; fallback: string })

type Generic_Prop<V extends Values> = {
      type: 'generic'
    } & (V extends string ? { strategy: 'mono'; key: V } : V extends string[] ? { strategy: 'multi'; keys: V; preferred: V[number] } : never)
type Static_Generic_Prop = {
  type: 'generic'
} & ({ strategy: 'mono'; key: string } | { strategy: 'multi'; keys: string[]; preferred: string })

export type Config<K extends Keys> = {
  [P in keyof K]: K[P] extends Partial<Light_Dark_Keys> ? Mode_Prop<K[P]> : Mode_Prop<K[P]> | Generic_Prop<K[P]>
}
export type Static_Config = {
  [key: string]: Static_Mode_Prop | Static_Generic_Prop
}