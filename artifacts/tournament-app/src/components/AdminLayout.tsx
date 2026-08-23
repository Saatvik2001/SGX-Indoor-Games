import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Trophy,
  CalendarDays,
  Users,
  Gamepad2,
  ClipboardCheck,
  Award,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Globe,
  Clock,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { SolugenixLogo, SolugenixIcon } from '@/components/SolugenixLogo';

interface NavGroup {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    group: 'Management',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
      { href: '/admin/events', label: 'Events & Categories', icon: Gamepad2 },
      { href: '/admin/registrations', label: 'Participants', icon: Users },
    ],
  },
  {
    group: 'Operations',
    items: [
      { href: '/admin/fixtures', label: 'Fixtures & Brackets', icon: CalendarDays, badge: 'Active' },
      { href: '/admin/schedule', label: 'Match Schedule', icon: Calendar },
      { href: '/admin/results', label: 'Scores & Results', icon: ClipboardCheck },
      { href: '/admin/champions', label: 'Champions & Awards', icon: Award },
    ],
  },
  {
    group: 'Analytics & Config',
    items: [
      { href: '/admin/reports', label: 'Reports & Export', icon: BarChart3 },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [, setLocationHook] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    setLocationHook('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary selection:text-white">
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SolugenixLogo size="sm" textClassName="text-sidebar-foreground text-sm" />
          <Badge variant="outline" className="text-3xs py-0 px-1 border-primary/40 text-primary bg-primary/10">
            Admin
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-sidebar-foreground"
          data-testid="button-mobile-menu"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 flex flex-col shadow-2xl",
          isCollapsed ? "w-18" : "w-68",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Logo Header */}
        <div className="h-18 flex items-center justify-between px-4 border-b border-sidebar-border/80">
          {!isCollapsed && (
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <SolugenixLogo size="sm" textClassName="text-sidebar-foreground text-sm" />
              <Badge variant="outline" className="text-3xs py-0 px-1 border-primary/40 text-primary bg-primary/10">
                Admin
              </Badge>
            </Link>
          )}

          {isCollapsed && (
            <div className="mx-auto">
              <SolugenixIcon className="h-7 w-7" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
            data-testid="button-collapse-sidebar"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {navGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-3xs font-bold uppercase tracking-widest text-sidebar-foreground/40 mb-1.5">
                  {grp.group}
                </div>
              )}
              <ul className="space-y-1">
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-xs font-semibold group",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-md shadow-blue-500/25"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                        data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-sidebar-foreground/60")} />
                          {!isCollapsed && <span>{item.label}</span>}
                        </div>
                        {!isCollapsed && item.badge && (
                          <Badge variant="outline" className={cn("text-3xs py-0 px-1.5 uppercase font-bold", isActive ? "border-white/30 text-white bg-white/15" : "border-sky-500/40 text-sky-400 bg-sky-500/10")}>
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User & Logout Footer */}
        <div className="p-3 border-t border-sidebar-border/80 space-y-2 bg-sidebar-accent/20">
          {!isCollapsed && (
            <div className="px-2 py-1 flex items-center justify-between text-2xs text-sidebar-foreground/60">
              <span className="truncate">Admin: Tournament Official</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full text-xs text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent rounded-xl justify-center gap-1.5",
                  isCollapsed && "px-0"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                {!isCollapsed && <span>Public View</span>}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={cn(
                "text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl",
                isCollapsed ? "w-full justify-center px-0" : "px-3"
              )}
              data-testid="button-logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={cn(
          "min-h-screen bg-gradient-to-br from-background via-blue-600/5 to-sky-500/10 flex flex-col transition-all duration-300 pt-16 lg:pt-0 relative overflow-x-hidden",
          isCollapsed ? "lg:pl-18" : "lg:pl-68"
        )}
      >
        {/* Ambient background glows */}
        <div className="fixed top-1/4 right-1/4 w-96 md:w-[620px] h-96 md:h-[620px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="fixed bottom-1/4 left-1/3 w-80 md:w-[520px] h-80 md:h-[520px] bg-sky-400/12 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Control Bar */}
        <div className="h-16 border-b border-border/60 bg-card/60 backdrop-blur-md px-6 hidden lg:flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Control Console</span>
            <span>&bull;</span>
            <span className="capitalize">{location.replace('/admin/', '').replace('/', ' &bull; ') || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs py-1 px-3 gap-1.5 font-mono text-muted-foreground border-border/60">
              <Clock className="h-3.5 w-3.5 text-primary" /> {timeStr || '12:00'}
            </Badge>

            <Link href="/fixtures">
              <Button variant="outline" size="sm" className="text-xs rounded-xl font-semibold gap-1.5 hover:border-sky-500/50 hover:bg-sky-500/10">
                <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-sky-400" /> Public Fixtures
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
