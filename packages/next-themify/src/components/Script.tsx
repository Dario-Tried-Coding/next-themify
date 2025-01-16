import { script } from '../script'
import { ScriptParams } from '../types/script'

interface ScriptProps {
  params: ScriptParams
}
export const Script = ({params}: ScriptProps) => {
  const stringParams = JSON.stringify(params satisfies ScriptParams)

  return <script dangerouslySetInnerHTML={{ __html: `(${script.toString()})(${stringParams})` }} />
}
