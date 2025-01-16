import { ThemingProvider } from '../lib/next-themify'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body>
        <ThemingProvider>{children}</ThemingProvider>
      </body>
    </html>
  )
}
