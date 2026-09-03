import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata = {
  title: 'Ribeègo - Bitcoin Lightning Wholesale Trade Marketplace',
  description: 'Multi-location wholesale sourcing, RFQ negotiation, and instant Lightning Network settlement.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-800 py-6 text-center text-xs text-stone-500 bg-stone-950">
          <p>Ribeègo Phase 0 Prototype • Single Source of Truth: PRD Draft v1.0 • Lightning Testnet Simulation</p>
        </footer>
      </body>
    </html>
  );
}
