import { ClientWrapper } from "./ClientWrapper"

export const metadata = {
  robots: "noindex, nofollow",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ClientWrapper>{children}</ClientWrapper>
}
