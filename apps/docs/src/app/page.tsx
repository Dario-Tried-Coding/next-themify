'use client'

import { useTheming } from '../lib/next-themify'

export default function Home() {
  const { values } = useTheming()

  return <div>page</div>
}
