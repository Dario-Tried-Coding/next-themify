export type DeepPartial<T extends Object> = {
  [P in keyof T]?: T[P] extends Object ? DeepPartial<T[P]> : T[P]
}

export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

export type HasKeys<T> = keyof T extends never ? false : true
export type Keyof<T> = keyof T & string

export type Nullable<T> = T | undefined | null
export type UndefinedOr<T> = T | undefined
export type NullOr<T> = T | null