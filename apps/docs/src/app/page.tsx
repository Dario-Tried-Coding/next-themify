'use client'

import { useTheming } from '../lib/next-themify'

export default function Home() {
  // const { values, setValue } = useTheming()

  return (
    <div>page
      {/* <pre>{JSON.stringify(values, null, 2)}</pre>
      {values && (
        <>
          <button onClick={() => setValue('mode', (prev) => (prev === 'dark' ? 'light' : 'dark'))}>mode</button>
          <button onClick={() => setValue('color', (prev) => (prev === 'blue' ? 'red' : 'blue'))}>color</button>
        </>
      )} */}
    </div>
  )
}
