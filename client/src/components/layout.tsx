import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useNotifications } from "@/hooks/use-dashboard";
import {
  LayoutDashboard,
  Users,
  Contact,
  LogOut,
  Bell,
  Menu,
  X,
  UserCircle
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: notifications } = useNotifications();

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "EXECUTIVE"] },
    { label: "Leads", href: "/leads", icon: Contact, roles: ["ADMIN", "MANAGER", "EXECUTIVE"] },
    { label: "Users", href: "/admin/users", icon: Users, roles: ["ADMIN"] },
    { label: "Team", href: "/manager/team", icon: Users, roles: ["MANAGER"] },
  ];

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-background border-b p-4 flex items-center justify-between sticky top-0 z-50">
        <h1 className="font-display font-bold text-xl text-primary">LeadsCRM</h1>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-full flex flex-col p-4">
          <div className="px-2 py-4 hidden md:block">
            <h1 className="font-display font-bold text-2xl text-primary tracking-tight">LeadsCRM</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium px-0.5">{user?.role} PORTAL</p>
          </div>

          <nav className="flex-1 mt-6 space-y-1">
            {filteredNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`nav-item cursor-pointer ${location === item.href ? "active" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
              </Link>
            ))}
          </nav>

          <div className="border-t pt-4 mt-auto">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-background border-b flex items-center justify-between px-6 md:px-8">
          <h2 className="font-display font-semibold text-lg hidden md:block">
            {navItems.find(i => i.href === location)?.label || "Welcome"}
          </h2>
          <div className="md:hidden"></div> {/* Spacer */}

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-[10px]">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    notifications?.map((n) => (
                      <DropdownMenuItem key={n.id} className="cursor-pointer flex flex-col items-start gap-1 p-3">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">{n.title}</span>
                          {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Scroll Area */}
        <div className="flex-1 overflow-auto bg-muted/20 p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
