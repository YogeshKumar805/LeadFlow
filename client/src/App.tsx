import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import TeamPage from "@/pages/team";
import Layout from "@/components/layout";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ 
  component: Component, 
  roles 
}: { 
  component: React.ComponentType<any>, 
  roles: string[] 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  if (!roles.includes(user.role)) {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login/admin">
        {() => <LoginPage role="ADMIN" />}
      </Route>
      <Route path="/login/manager">
        {() => <LoginPage role="MANAGER" />}
      </Route>
      <Route path="/login/executive">
        {() => <LoginPage role="EXECUTIVE" />}
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} roles={["ADMIN", "MANAGER", "EXECUTIVE"]} />}
      </Route>
      
      <Route path="/leads">
        {() => <ProtectedRoute component={LeadsPage} roles={["ADMIN", "MANAGER", "EXECUTIVE"]} />}
      </Route>

      <Route path="/team">
        {() => <ProtectedRoute component={TeamPage} roles={["ADMIN", "MANAGER"]} />}
      </Route>

      {/* Default redirect for logged in users from root is handled in LandingPage via logic or manual Nav */}
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
