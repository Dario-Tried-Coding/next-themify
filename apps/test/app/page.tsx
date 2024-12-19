'use client'

import { useTheming } from '../lib/next-themify'

export default function Home() {
  const { values, setValue } = useTheming()
  return (
    <pre>
      {JSON.stringify(values)} <br />{' '}
      {values && (
        <div>
          <button onClick={() => (values?.theme === 'custom-1' ? setValue('theme', 'custom-2') : setValue('theme', 'custom-1'))}>update theme</button> <br />
          <button onClick={() => (values?.radius === 'custom-radius-2' ? setValue('radius', 'custom-radius-1') : setValue('radius', 'custom-radius-2'))}>update radius</button>
        </div>
      )}
    </pre>
  )
}
