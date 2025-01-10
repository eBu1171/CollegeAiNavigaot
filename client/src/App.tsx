import { Switch, Route } from "wouter";
import { Loader2 } from "lucide-react";
import { useUser } from "./hooks/use-user";
import { Sidebar } from "./components/layout/Sidebar";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import FindSchool from "./pages/FindSchool";
import Chat from "./pages/Chat";
import ChanceMe from "./pages/ChanceMe";
import Dashboard from "./pages/Dashboard";
import LearningPath from "./pages/LearningPath";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/find-school" component={FindSchool} />
          <Route path="/chat" component={Chat} />
          <Route path="/chance-me" component={ChanceMe} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/learning-path" component={LearningPath} />
          <Route>
            <div className="flex items-center justify-center h-full">
              <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

export default App;