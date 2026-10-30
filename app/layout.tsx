import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "CHAMA VIVA | Gestão de Evangelismo",
  description: "Plataforma de organização de igrejas, cultos, viagens e equipes de evangelismo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
