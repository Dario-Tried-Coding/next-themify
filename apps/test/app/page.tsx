'use client'

import { useValues } from "@dariotriedcoding/next-themify"

export default function Home() {
  const { values } = useValues()
  return <pre>{JSON.stringify(values)}</pre>
}
