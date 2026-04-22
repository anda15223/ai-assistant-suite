import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Mail,
  CheckSquare,
  Settings,
  Home,
  MessageCircle,
  Users,
  Flame,
  FileText,
  Tent,
  Sparkles,
  Command,
  Brain,
  Search,
  Bell,
  ClipboardList,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Mail, label: "Email Inbox", path: "/emails" },
  { icon: MessageCircle, label: "WhatsApp", path: "/whatsapp" },
  { icon: Users, label: "Employees", path: "/employees" },
  { icon: CheckSquare, label: "Task Board", path: "/tasks" },
  { icon: FileText, label: "Invoices", path: "/invoices" },
  { icon: Tent, label: "Festivals", path: "/festivals" },
  { icon: Command, label: "Command Centre", path: "/festival-command-centre" },
  { icon: Brain, label: "Festival Brain", path: "/festival-brain" },
  { icon: ClipboardList, label: "Planner Admin", path: "/admin/sections" },
  { icon: Flame, label: "Priority Matrix", path: "/priority" },
  { icon: Sparkles, label: "AI Chat", path: "/chat" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fc]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-14 h-14 rounded-xl bg-[#eef2ff] border border-[#e5e7eb] flex items-center justify-center">
            <LayoutDashboard className="w-7 h-7 text-[#6366f1]" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-center text-[#111827]">
              AI Suite
            </h1>
            <p className="text-sm text-[#6b7280] text-center max-w-sm">
              Sign in to access your AI-powered festival management, email assistant, and more.
            </p>
          </div>
          <button
            onClick={() => { window.location.href = "/login"; }}
            className="w-full px-4 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => location.startsWith(item.path));
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-[#e5e7eb] bg-white" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-[#f3f4f6]">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-[#f1f3f9] rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-[#6b7280]" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-6 w-6 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
                    <LayoutDashboard className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="font-semibold tracking-tight text-[#111827] truncate">
                    AI Suite
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 bg-white">
            {/* Label */}
            {!isCollapsed && (
              <div className="px-4 pt-4 pb-2">
                <span className="text-[11px] uppercase tracking-[0.05em] text-[#9ca3af] font-medium">
                  Main Menu
                </span>
              </div>
            )}
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-9 transition-all font-normal text-[14px] rounded-lg ${
                        isActive
                          ? "bg-[#eef2ff] text-[#6366f1] font-medium border-l-[3px] border-[#6366f1]"
                          : "text-[#6b7280] hover:bg-[#f1f3f9] hover:text-[#111827]"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-[#6366f1]" : "text-[#9ca3af]"}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Back to Home */}
            <SidebarMenu className="px-2 mt-4 pt-4 border-t border-[#f3f4f6]">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setLocation("/")}
                  tooltip="Back to Home"
                  className="h-9 transition-all font-normal text-[14px] text-[#6b7280] hover:bg-[#f1f3f9] hover:text-[#111827] rounded-lg"
                >
                  <Home className="h-4 w-4 text-[#9ca3af]" />
                  <span>Back to Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 bg-white border-t border-[#f3f4f6]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#f1f3f9] transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]">
                  <div className="h-8 w-8 rounded-full bg-[#eef2ff] flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-[#6366f1]">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium text-[#111827] truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-[#9ca3af] truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-[#ef4444] focus:text-[#ef4444]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#6366f1]/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Top bar */}
        <div className="flex border-b border-[#e5e7eb] h-16 items-center justify-between bg-white px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg text-[#6b7280] hover:bg-[#f1f3f9]" />
            )}
            <h2 className="text-[18px] font-semibold text-[#111827] tracking-tight">
              {activeMenuItem?.label ?? "Menu"}
            </h2>
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-12 py-2 text-sm bg-[#f8f9fc] border border-[#e5e7eb] rounded-lg text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-[#9ca3af]">
                <kbd className="px-1.5 py-0.5 bg-white border border-[#e5e7eb] rounded text-[10px]">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-[#e5e7eb] rounded text-[10px]">K</kbd>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-[#f1f3f9] transition-colors relative">
              <Bell className="h-4 w-4 text-[#6b7280]" />
            </button>
            <div className="h-8 w-8 rounded-full bg-[#eef2ff] flex items-center justify-center">
              <span className="text-xs font-medium text-[#6366f1]">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 bg-[#f8f9fc]">{children}</main>
      </SidebarInset>
    </>
  );
}
