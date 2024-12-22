export type Nullable<T> = T | null | undefined
export type UndefinedOr<T> = T | undefined
export type NullOr<T> = T | null

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type AtLeastOne<T> = NonNullable<
  {
    [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>
  }[keyof T]
>

export type WithDefaults<T extends object, Defaults extends Record<keyof T, any>> = {
  [K in keyof T]: K extends keyof Defaults ? Defaults[K] : T[K]
}

export type IsLiteralArray<T> = T extends readonly string[] ? (string[] extends T ? false : true) : false

export type ToObjects<T extends string[], ObjType extends { key: string }, Acc extends any[] = []> =
  IsLiteralArray<T> extends true
    ? T extends readonly [infer First extends string, ...infer Rest extends string[]]
      ? ToObjects<Rest, ObjType, [...Acc, { key: First } & Omit<ObjType, 'key'>]>
      : Acc
    : ObjType[]
