'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Users,
  Settings,
  BarChart3,
  FolderOpen,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Search,
  ChevronDown,
  PlusCircle,
  Eye,
  Upload,
  History,
  ClipboardList,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrentUserWithRole, signOut } from '@/lib/auth/actions';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Role-based navigation configuration - WITHOUT locale prefix
const getNavItems = (role: string) => {
  const baseItems = [
    { name: 'Tableau de bord', href: '/lpl-access-2026/panel', icon: LayoutDashboard },
  ];

  // Admin - Full access
  if (role === 'admin') {
    return [
      ...baseItems,
      { name: 'Articles', href: '/lpl-access-2026/panel/articles', icon: FileText },
      { name: 'Catégories', href: '/lpl-access-2026/panel/categories', icon: FolderOpen },
      { name: 'Médias', href: '/lpl-access-2026/panel/media', icon: ImageIcon },
      { name: 'Publicités', href: '/lpl-access-2026/panel/ads', icon: Upload },
      { name: 'Utilisateurs', href: '/lpl-access-2026/panel/users', icon: Users },
      { name: 'Statistiques', href: '/lpl-access-2026/panel/analytics', icon: BarChart3 },
      { name: "Journal d'audit", href: '/lpl-access-2026/panel/audit-log', icon: History },
      { name: 'Rapports', href: '/lpl-access-2026/panel/reports', icon: ClipboardList },
      { name: 'Corbeille', href: '/lpl-access-2026/panel/trash', icon: Trash2 },
      { name: 'Paramètres', href: '/lpl-access-2026/panel/settings', icon: Settings },
    ];
  }

  // Editor - Review and content management
  if (role === 'editor') {
    return [
      ...baseItems,
      { name: 'File de relecture', href: '/lpl-access-2026/panel/editor', icon: Eye },
      { name: 'Articles', href: '/lpl-access-2026/panel/articles', icon: FileText },
      { name: 'Médias', href: '/lpl-access-2026/panel/media', icon: ImageIcon },
      { name: 'Publicités', href: '/lpl-access-2026/panel/ads', icon: Upload },
      { name: 'Statistiques', href: '/lpl-access-2026/panel/analytics', icon: BarChart3 },
    ];
  }

  // Writer - Create and manage own articles
  if (role === 'writer') {
    return [
      ...baseItems,
      { name: 'Mes articles', href: '/lpl-access-2026/panel/writer', icon: FileText },
      { name: 'Nouvel article', href: '/lpl-access-2026/panel/articles/new', icon: PlusCircle },
      { name: 'Médias', href: '/lpl-access-2026/panel/media', icon: ImageIcon },
      { name: 'Statistiques', href: '/lpl-access-2026/panel/analytics', icon: BarChart3 },
    ];
  }

  // Contributor - Submit and track submissions
  if (role === 'contributor') {
    return [
      ...baseItems,
      { name: 'Mes soumissions', href: '/lpl-access-2026/panel/contributor', icon: FileText },
      { name: 'Soumettre un article', href: '/lpl-access-2026/panel/articles/new', icon: PlusCircle },
    ];
  }

  return baseItems;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userRole, setUserRole] = useState<string>('contributor');
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Check mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on mobile when path changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  // Load user data - with refresh capability
  const loadUser = async () => {
    try {
      setLoading(true);
      // DB role (public.users), not the session JWT's user_metadata.role -
      // the JWT claim only refreshes on a full login, so reading it here
      // meant the sidebar/nav (getNavItems(userRole) below) and the role
      // badge kept showing a promoted/demoted user's OLD role - and for
      // an admin, that meant seeing the restricted contributor nav on
      // their own dashboard - until they logged out and back in, even
      // though the role change had already taken effect in the database.
      const result = await getCurrentUserWithRole();
      const user = result?.user;
      if (user) {
        const role = result?.role || 'contributor';
        setUserRole(role);
        setUserEmail(user.email || '');

        // getCurrentUser() only returns the raw Supabase Auth user -
        // user_metadata is a snapshot from signup time and never picks
        // up edits made on /admin/profile (name, avatar_url, ...), which
        // write straight to the `users` table instead (see
        // updateOwnProfile() in user-service.ts). That's why this
        // sidebar/header used to show the signup name forever and the
        // avatar was always a generated ui-avatars.com placeholder, even
        // right after uploading a real profile photo - there was no
        // code path that ever read avatar_url at all. Fetch the real row
        // from the same endpoint /admin/profile itself uses so both stay
        // in sync.
        let name = user.user_metadata?.name || user.email?.split('@')[0] || 'User';
        let avatarUrl = '';
        try {
          const profileRes = await fetch('/api/users/profile', { cache: 'no-store' });
          if (profileRes.ok) {
            const profileJson = await profileRes.json();
            if (profileJson.user?.name) name = profileJson.user.name;
            avatarUrl = profileJson.user?.avatar_url || '';
          }
        } catch (profileError) {
          console.error('Failed to load profile avatar/name:', profileError);
        }
        setUserName(name);
        setUserAvatarUrl(avatarUrl);

        console.log(`👤 User loaded: ${user.email} with role: ${role}`);
      } else {
        // No user, redirect to login
        router.push('/lpl-access-2026');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      router.push('/lpl-access-2026');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh on key change
  useEffect(() => {
    loadUser();
  }, [refreshKey]);

  // Listen for role changes from URL or storage
  useEffect(() => {
    // Check for role change in URL parameters (for debugging)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam) {
      console.log(`🔍 Role parameter detected: ${roleParam}`);
      // Refresh user data
      loadUser();
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Listen for storage events (role changes from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_role') {
        console.log(`🔄 Role changed in another tab: ${e.newValue}`);
        loadUser();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // /admin/profile dispatches this after a successful save so the
    // sidebar/header avatar and name update immediately - this layout
    // persists across admin route changes (it doesn't remount when
    // navigating from /admin/profile to another /admin/* page), so
    // without this the new photo/name only showed up after a hard
    // refresh.
    window.addEventListener('profile-updated', loadUser);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profile-updated', loadUser);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: 'Déconnexion réussie',
        description: 'Vous avez été déconnecté avec succès.',
      });
      // Clear any stored role
      localStorage.removeItem('user_role');
      router.push('/lpl-access-2026');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Échec de la déconnexion. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  // Force refresh user data (called after role changes)
  const refreshUser = () => {
    setRefreshKey(prev => prev + 1);
  };

  const navItems = getNavItems(userRole);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell flex h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - bg-slate-100/dark:bg-slate-900 is deliberately a shade
          darker than the main content's bg-background, so the admin nav
          rail reads as a distinct panel rather than blending into the
          page. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-slate-100 dark:bg-slate-900 transition-transform duration-200 lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image
              src="/logo.png"
              alt="Les Pages Libres"
              width={36}
              height={36}
              className="flex-shrink-0 object-contain"
            />
            {/* Dark blue, matching the brand navy used in the public
                header/footer - was split primary/secondary colored
                before. */}
            <span className="text-base font-bold text-[#1a2a3a] dark:text-[#7fa8d9] truncate">
              Les Pages Libres
            </span>
            <Badge variant="secondary" className="ml-1 text-[10px] capitalize shrink-0">
              {userRole}
            </Badge>
          </Link>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t p-4 space-y-3">
          {/* Plain <a>, not next/link's <Link> - same reasoning as the
              public-site nav links (see header.tsx): this leaves the
              admin route tree entirely, so a real navigation is what we
              want here anyway. */}
          <a
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
            Voir le site
          </a>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={userAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1a2a3a&color=fff&size=32`}
              />
              <AvatarFallback>{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher dans l'admin..."
                className="w-64 pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                src={userAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1a2a3a&color=fff&size=32`}
              />
                    <AvatarFallback>{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline capitalize">{userRole}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Previously had no onClick/href at all - clicking it did
                    nothing. Now routes to the new self-service profile page
                    (/admin/profile), reachable by every role. */}
                <DropdownMenuItem onClick={() => router.push('/lpl-access-2026/panel/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profil
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/lpl-access-2026/panel/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {/* Pass refresh function to children for role updates */}
          {children}
        </main>
      </div>

      {/* Without this, every toast() call anywhere in the admin section
          (ads, articles, users, ...) fired into use-toast.ts's store with
          nothing subscribed to render it - the action would silently
          succeed or fail with zero visible feedback. */}
      <Toaster />
    </div>
  );
}
