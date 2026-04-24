import "./globals.css";

export const metadata = {
  title: "MUJinny — AI Assistant for MU Students",
  description: "MUJinny is an AI-powered conversational assistant built for Metropolitan University students. Ask questions, get help with studies, and more.",
  keywords: ["MUJinny", "Metropolitan University", "AI assistant", "student chatbot", "MU Bangladesh"],
  authors: [{ name: "Metropolitan University" }],
  openGraph: {
    title: "MUJinny — AI Assistant for MU Students",
    description: "MUJinny is an AI-powered conversational assistant built for Metropolitan University students.",
    url: "https://mujinny.vercel.app",
    siteName: "MUJinny",
    images: [
      {
        url: "/MUJinny-Logo.png",
        width: 1200,
        height: 630,
        alt: "MUJinny Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUJinny — AI Assistant for MU Students",
    description: "MUJinny is an AI-powered conversational assistant built for Metropolitan University students.",
    images: ["/MUJinny-Logo.png"],
  },
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
