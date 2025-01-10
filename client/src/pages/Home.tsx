import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Link } from "wouter";
import {
  School,
  MessageCircle,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";

export default function Home() {
  const { user } = useUser();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="h-[600px] bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(rgba(10, 34, 64, 0.8), rgba(10, 34, 64, 0.8)), url(${"https://images.unsplash.com/photo-1590579491624-f98f36d4c763"})`,
        }}
      >
        <div className="container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl text-white">
            <h1 className="text-5xl font-bold mb-6">
              Your AI-Powered College Research Assistant
            </h1>
            <p className="text-xl mb-8">
              Make informed decisions about your college applications with
              personalized AI recommendations and insights.
            </p>
            <Link href="/find-school">
              <Button size="lg" className="text-lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16">
            Everything You Need for College Research
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={School}
              title="Find Schools"
              description="Get personalized college recommendations based on your preferences and profile"
              href="/find-school"
            />
            <FeatureCard
              icon={MessageCircle}
              title="Chat"
              description="Have conversations about specific schools and get instant answers"
              href="/chat"
            />
            <FeatureCard
              icon={GraduationCap}
              title="ChanceMe"
              description="Get AI-powered admission chances based on your academic profile"
              href="/chance-me"
            />
            <FeatureCard
              icon={LayoutDashboard}
              title="Dashboard"
              description="Track your college research progress and organize your applications"
              href="/dashboard"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof School;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="p-6 bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
        <Icon className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
