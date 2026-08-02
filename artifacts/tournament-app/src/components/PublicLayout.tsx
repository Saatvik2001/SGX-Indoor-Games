import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Trophy, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/register', label: 'Register' },
    { href: '/fixtures', label: 'Fixtures' },
  { href: '/results', label: 'Results' },
  { href: '/champions', label: 'Champions' },
];

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3" data-testid="link-home">
            <Trophy className="h-7 w-7 text-primary" />
            <span className="font-bold text-lg hidden sm:inline-block">Office Indoor Games 2026</span>
            <span className="font-bold text-lg sm:hidden">Indoor Games 2026</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  data-testid={`link-${item.label.toLowerCase()}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link href="/login" data-testid="link-admin">
              <Button variant="outline" size="sm" className="ml-2">
                Admin Login
              </Button>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase()}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/login" onClick={() => setIsMobileOpen(false)} data-testid="link-mobile-admin">
                <Button variant="outline" size="sm" className="w-full">
                  Admin Login
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
