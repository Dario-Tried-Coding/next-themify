'use client'

import { useTheming } from '../lib/next-themify'

export default function Home() {
  const { values, setValue } = useTheming()
  return (
    <div>
      <pre>{JSON.stringify(values)}</pre>
      <br />
      {values && (
        <>
          <button onClick={() => setValue('theme', values.theme === 'custom-1' ? 'custom-2' : 'custom-1')}>change theme</button>
        </>
      )}
    </div>
  )
}
