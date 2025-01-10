import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  School,
  MessageCircle,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Trophy,
  Calendar,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useUser();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    {
      title: "Learning Path",
      icon: Trophy,
      href: "/learning-path",
    },
    {
      title: "Find School",
      icon: School,
      href: "/find-school",
    },
    {
      title: "Timeline",
      icon: Calendar,
      href: "/timeline",
    },
    {
      title: "Chat",
      icon: MessageCircle,
      href: "/chat",
    },
    {
      title: "ChanceMe",
      icon: GraduationCap,
      href: "/chance-me",
    },
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
  ];

  return (
    <div className="h-screen w-64 bg-primary text-primary-foreground p-4 flex flex-col">
      <div className="flex items-center justify-center py-4">
        <Link href="/">
          <h1 className="text-2xl font-bold cursor-pointer">CollegeAI</h1>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 mt-8">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={location === item.href ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                location === item.href && "bg-primary-foreground text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Button>
          </Link>
        ))}
      </nav>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 mt-auto"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        Logout
      </Button>
    </div>
  );
}