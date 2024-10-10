export type AtLeastOne<T> = NonNullable<
  {
    [K in keyof T]: Required<Pick<T, K>> & Partial<Omit<T, K>>
  }[keyof T]
>