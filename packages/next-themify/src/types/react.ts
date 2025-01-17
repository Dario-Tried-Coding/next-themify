import { HasKeys, Keyof, Prettify } from "./utils";

// #region PROPS ---------------------------------------------------------------------------------------
type SystemValues = Partial<{ light: string; dark: string; system: string; custom: string[] }>
type Options = string | string[] | SystemValues
type ExplicitProp = { prop: string; values: Options }
export type Props = (string | ExplicitProp)[]

export type ColorScheme = 'light' | 'dark'
export type Selector = 'class' | 'colorScheme'
export type Listener = 'attributes' | 'storage'

// #region STRATEGIES - generic -----------------------------------------------------------------------
type Generic = { type: 'generic' }
type Generic_Mono<V extends string = string> = Generic & { strategy: 'mono'; key: V }
type Generic_Multi<V extends string[] = string[]> = Generic & { strategy: 'multi'; keys: V; preferred: V[number] }
type GenericProp = Generic_Mono | Generic_Multi

// #region STRATEGIES - mode -------------------------------------------------------------------------
type Mode = { type: 'mode'; selectors?: Selector[]; store?: boolean }
type Mode_Mono<V extends string = string> = Mode & { strategy: 'mono'; key: V; colorScheme: ColorScheme }
type Mode_Multi<V extends string[] = string[]> = Mode & { strategy: 'multi'; keys: { [K in V[number]]: ColorScheme }; preferred: V[number] }
type Mode_System<V extends SystemValues = { light: undefined; dark: undefined; system: undefined; custom: undefined }> = Mode & {
  strategy: 'system'
} & (
    | ({
        enableSystem: true
        preferred: [V['light'], V['dark'], V['system'], V['custom']] extends [undefined, undefined, undefined, undefined]
          ? string
          : (V['light'] extends string ? V['light'] : 'light') | (V['dark'] extends string ? V['dark'] : 'dark') | (V['system'] extends string ? V['system'] : 'system') | (V['custom'] extends string[] ? V['custom'][number] : never)
        fallback: [V['light'], V['dark'], V['system'], V['custom']] extends [undefined, undefined, undefined, undefined]
          ? string
          : (V['light'] extends string ? V['light'] : 'light') | (V['dark'] extends string ? V['dark'] : 'dark') | (V['custom'] extends string[] ? V['custom'][number] : never)
      } & ([V['light'], V['dark'], V['system'], V['custom']] extends [undefined, undefined, undefined, undefined]
        ? {
            customKeys?: {
              light?: string
              dark?: string
              system?: string
              custom?: Record<string, ColorScheme>
            }
          }
        : HasKeys<V> extends true
          ? {
              customKeys: (V['light'] extends string ? { light: V['light'] } : {}) &
                (V['dark'] extends string ? { dark: V['dark'] } : {}) &
                (V['system'] extends string ? { system: V['system'] } : {}) &
                (V['custom'] extends string[] ? { custom: Record<V['custom'][number], ColorScheme> } : {})
            }
          : {}))
    | ({
        enableSystem: false
        preferred: [V['light'], V['dark'], V['system'], V['custom']] extends [undefined, undefined, undefined, undefined]
          ? string
          : (V['light'] extends string ? V['light'] : 'light') | (V['dark'] extends string ? V['dark'] : 'dark') | (V['custom'] extends string[] ? V['custom'][number] : never)
      } & ([V['light'], V['dark'], V['system'], V['custom']] extends [undefined, undefined, undefined, undefined]
        ? {
            customKeys?: {
              light?: string
              dark?: string
              custom?: Record<string, ColorScheme>
            }
          }
        : HasKeys<V> extends true
          ? { customKeys: (V['light'] extends string ? { light: V['light'] } : {}) & (V['dark'] extends string ? { dark: V['dark'] } : {}) & (V['custom'] extends string[] ? { custom: Record<V['custom'][number], ColorScheme> } : {}) }
          : {}))
  )
type ModeProp = Mode_Mono | Mode_Multi | Mode_System

// #region CONFIG --------------------------------------------------------------------------------------
type ExtractProps<Ps extends Props> = Ps[number] extends infer U ? (U extends string ? U : U extends ExplicitProp ? U['prop'] : never) : never
type ResolveProp<P extends Props[number]> = P extends ExplicitProp
  ? P['values'] extends string
    ? Generic_Mono<P['values']> | Mode_Mono<P['values']>
    : P['values'] extends string[]
      ? Generic_Multi<P['values']> | Mode_Multi<P['values']>
      : P['values'] extends SystemValues
        ? Mode_System<P['values']>
        : never
  : Generic_Mono<'default'> | Mode_Mono<'default'> | Mode_System<{}>

export type Config<Ps extends Props> = {
  [P in ExtractProps<Ps>]: ResolveProp<Extract<Ps[number], { prop: P } | P>>
}
export type StaticConfig = {
  [key: string]: GenericProp | ModeProp
}

// #region VALUES --------------------------------------------------------------------------------------
export type Values<Ps extends Props, C extends Config<Ps>> = Prettify<{
  [P in ExtractProps<Ps>]: C[P] extends { strategy: 'mono' }
    ? C[P]['key']
    : C[P] extends { strategy: 'multi' }
      ? C[P] extends { type: 'generic' }
        ? C[P]['keys'][number]
        : Keyof<C[P]['keys']>
      : C[P] extends { strategy: 'system' }
        ? C[P] extends { customKeys: any }
          ?
              | (C[P]['customKeys'] extends { light: string } ? C[P]['customKeys']['light'] : 'light')
              | (C[P]['customKeys'] extends { dark: string } ? C[P]['customKeys']['dark'] : 'dark')
              | (C[P]['customKeys'] extends { system: string } ? C[P]['customKeys']['system'] : 'system')
              | (C[P]['customKeys'] extends { custom: Record<string, ColorScheme> } ? Keyof<C[P]['customKeys']['custom']> : never)
          : 'light' | 'dark' | (C[P]['enableSystem'] extends false ? never : 'system')
        : never
}>
