import "./globals.css";

export const metadata = {
  title: "APPWARS LMS Portal",
  description: "APPWARS TECHNOLOGIES PVT. LTD. Learning Management System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
