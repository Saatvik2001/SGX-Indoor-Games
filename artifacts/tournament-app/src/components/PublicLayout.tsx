import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Menu,
  X,
  ShieldAlert,
  Flame,
  Calendar,
  Award,
  UserPlus,
  ClipboardList,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SolugenixLogo } from '@/components/SolugenixLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Overview', icon: Flame },
  { href: '/register', label: 'Register', icon: UserPlus },
  { href: '/fixtures', label: 'Fixtures & Brackets', icon: Calendar },
  { href: '/results', label: 'Results', icon: ClipboardList },
  { href: '/champions', label: 'Hall of Fame', icon: Award },
];

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isLandingPage = location === '/';

  return (
    <div className={cn(
      "bg-gradient-to-br from-background via-blue-600/5 to-sky-500/10 flex flex-col selection:bg-blue-600 selection:text-white relative overflow-x-hidden",
      isLandingPage ? "h-screen max-h-screen overflow-hidden justify-between" : "min-h-screen justify-between"
    )}>
      {/* Ambient background glows */}
      <div className="fixed top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 md:w-[680px] h-96 md:h-[680px] bg-blue-600/12 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-1/4 right-1/4 translate-x-1/4 translate-y-1/4 w-80 md:w-[580px] h-80 md:h-[580px] bg-sky-400/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Gradient Stripe */}
      <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 relative z-50 shrink-0" />

      {/* Main Floating Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-xs shrink-0">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group" data-testid="link-home">
            <SolugenixLogo size="md" className="group-hover:opacity-90 transition-opacity" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/40">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    isActive
                      ? "bg-background text-blue-600 dark:text-sky-400 shadow-xs font-bold border border-blue-500/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                  data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className={cn("h-3.5 w-3.5", isActive ? "text-blue-600 dark:text-sky-400" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" data-testid="link-admin">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 hover:border-sky-500/50 hover:bg-sky-500/5">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" />
                Admin Console
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-xl"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            data-testid="button-mobile-menu"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl shadow-xl">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => setIsMobileOpen(false)}
                    data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 mt-2 border-t border-border">
                <Link href="/login" onClick={() => setIsMobileOpen(false)} data-testid="link-mobile-admin">
                  <Button variant="outline" size="sm" className="w-full justify-center gap-2 rounded-xl">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Admin Console Login
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className={cn(
        "flex-1",
        isLandingPage && "flex flex-col items-center justify-center overflow-hidden"
      )}>
        {children}
      </main>

      {/* Modern Compact Footer */}
      <footer className={cn(
        "border-t border-border/60 bg-background/50 backdrop-blur-md shrink-0",
        isLandingPage ? "py-3 md:py-3.5" : "py-6 mt-auto"
      )}>
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6 text-center md:text-left">
            <div className="flex items-center gap-3">
              <SolugenixLogo size="sm" />
              <p className="text-xs text-muted-foreground hidden sm:block border-l border-border pl-3">
                Corporate Championship & Tournament Arena
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground font-medium">
              <Link href="/fixtures" className="hover:text-foreground transition-colors">
                Brackets & Fixtures
              </Link>
              <Link href="/results" className="hover:text-foreground transition-colors">
                Match Results
              </Link>
              <Link href="/champions" className="hover:text-foreground transition-colors">
                Hall of Fame
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors flex items-center gap-1">
                Admin Console <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="text-xs text-muted-foreground">
              &copy; 2026 Solugenix. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
