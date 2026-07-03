import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { AdspxMark } from "@/components/AdspxLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  BarChart3,
  Trophy,
  Wallet,
  Send,
  History,
  Inbox,
  Shield,
  Users,
  DollarSign,
  Megaphone,
  Activity,
  FlaskConical,
  Settings2,
  LogOut,
  UserCircle,
  Link2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavChild = { title: string; to: string; search?: Record<string, string>; icon: any };
type NavGroup = { label: string; items: (NavChild & { children?: NavChild[] })[] };

function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const search = useRouterState({ select: (r) => r.location.search }) as unknown as Record<string, string>;

  const groups: NavGroup[] = [
    {
      label: "Main",
      items: [
        { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
        { title: "Create Link", to: "/create-link", icon: Link2 },
        { title: "Statistics", to: "/statistics", icon: BarChart3 },
        { title: "Leaderboard", to: "/leaderboard", icon: Trophy },
      ],
    },
    {
      label: "Earnings",
      items: [
        {
          title: "Withdraw",
          to: "/withdraw",
          icon: Wallet,
          children: [
            { title: "New Request", to: "/withdraw", search: { view: "request" }, icon: Send },
            { title: "History", to: "/withdraw", search: { view: "history" }, icon: History },
          ],
        },
      ],
    },
    {
      label: "Communication",
      items: [{ title: "Messages", to: "/inbox", icon: Inbox }],
    },
    {
      label: "Account",
      items: [{ title: "Settings", to: "/settings", icon: Settings }],
    },
  ];

  if (isAdmin) {
    groups.push({
      label: "Control Center",
      items: [
        {
          title: "Admin Panel",
          to: "/admin",
          icon: Shield,
          children: [
            { title: "Overview", to: "/admin", search: { tab: "overview" }, icon: LayoutDashboard },
            { title: "Users", to: "/admin", search: { tab: "users" }, icon: Users },
            { title: "User History", to: "/admin", search: { tab: "history" }, icon: History },
            { title: "Payouts", to: "/admin", search: { tab: "withdrawals" }, icon: DollarSign },
            { title: "Ads Setup", to: "/admin", search: { tab: "ads" }, icon: Megaphone },
            { title: "Performance", to: "/admin", search: { tab: "performance" }, icon: Activity },
            { title: "Messages", to: "/admin", search: { tab: "messages" }, icon: Inbox },
            { title: "System", to: "/admin", search: { tab: "system" }, icon: Settings2 },
            { title: "Simulator", to: "/admin", search: { tab: "simulator" }, icon: FlaskConical },
          ],
        },
      ],
    });
  }

  const isActive = (item: NavChild) => {
    if (pathname !== item.to) return false;
    if (!item.search) return true;
    return Object.entries(item.search).every(([k, v]) => search?.[k] === v);
  };

  const anyChildActive = (children?: NavChild[]) =>
    !!children?.some((c) => isActive(c));

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link
          to="/dashboard"
          className="flex items-center justify-center px-2 py-2"
          aria-label="AdsPx home"
        >
          <AdspxMark className={collapsed ? "h-7 w-7" : "h-9 w-9"} glow />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item) || anyChildActive(item.children);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active && !item.children}
                        tooltip={item.title}
                      >
                        <Link
                          to={item.to as any}
                          search={item.search as any}
                          className="flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>

                      {item.children && !collapsed && (
                        <SidebarMenuSub>
                          {item.children.map((child) => {
                            const ChildIcon = child.icon;
                            return (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(child)}>
                                  <Link
                                    to={child.to as any}
                                    search={child.search as any}
                                    className="flex items-center gap-2"
                                  >
                                    <ChildIcon className="h-3.5 w-3.5" />
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}


        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Home">
                  <Link to="/" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    {!collapsed && <span>Home</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut} tooltip="Sign out">
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sign out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        if (mounted) setReady(true);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (mounted) {
        setIsAdmin(!!roles?.some((r: any) => r.role === "admin" || r.role === "super_admin"));
        setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 backdrop-blur px-3 py-2">
            <SidebarTrigger />
            <span className="text-sm font-medium tracking-tight lg:hidden">AdsPx</span>
          </header>
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default AppShell;
