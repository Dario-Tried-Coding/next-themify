import { LIBRARY_NAME } from '../constants'

interface ScriptProps {}
export const Script = ({}: ScriptProps) => {
  const script = () => window[LIBRARY_NAME]?.init()

  return <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})()` }} />
}
