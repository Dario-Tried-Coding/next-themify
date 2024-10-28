export type AtLeastOne<T> = NonNullable<
  {
    [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>
  }[keyof T]
  >

export type WithDefaults<T extends object, Defaults extends Record<keyof T, any>> = {
  [K in keyof T]: K extends keyof Defaults ? Defaults[K] : T[K]
}

export type IsLiteralArray<T> = T extends (infer U)[]
  ? U extends string
    ? T extends string[]
      ? false // Caso generico string[]
      : true // Caso array di stringhe letterali specifiche
    : false
  : false