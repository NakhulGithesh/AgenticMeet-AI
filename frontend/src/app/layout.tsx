import type { Metadata } from "next";
import "./globals.css";
import { SmoothCursor } from "@/registry/magicui/smooth-cursor";

export const metadata: Metadata = {
  title: "AgenticMeet AI — AI-Powered Meeting Assistant",
  description:
    "Upload your meeting recordings for AI transcription, summarization, speaker detection, risk analysis, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('agenticmeet_theme') || 'system';
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <SmoothCursor />
        {children}
      </body>
    </html>
  );
}
