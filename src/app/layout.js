import "./globals.css";

export const metadata = {
  title: "MUJinny",
  description: "MUJinny conversational workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
