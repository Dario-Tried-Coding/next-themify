import { ThemeProvider } from "."
import { Keys } from "./types"

const themeOpts = {mode: 'custom-mode'} as const satisfies Keys
type ThemeOpts = typeof themeOpts

export function test() {
  return (
    <ThemeProvider<ThemeOpts>
      config={{
        mode: {
          strategy: 'mono',
          key: 'custom-mode'
        }
      }}
    >
      ciao
    </ThemeProvider>
  )
}
