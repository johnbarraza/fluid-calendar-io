import { Providers } from "@/components/providers";
import { metadata as baseMetadata } from "./metadata";
import "./globals.css";

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex h-full flex-col bg-background antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
