import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { useEffect } from "react";
import { api } from "@shared/routes";

const loginSchema = api.auth.login.input.omit({ portalRole: true });
type LoginForm = z.infer<typeof loginSchema>;

type RoleType = "ADMIN" | "MANAGER" | "EXECUTIVE";

const PortalConfig: Record<RoleType, { title: string; icon: any; color: string; desc: string }> = {
  ADMIN: {
    title: "Admin Portal",
    icon: ShieldCheck,
    color: "text-purple-600",
    desc: "System configuration and oversight",
  },
  MANAGER: {
    title: "Manager Portal",
    icon: LayoutDashboard,
    color: "text-blue-600",
    desc: "Team management and analytics",
  },
  EXECUTIVE: {
    title: "Executive Portal",
    icon: Users,
    color: "text-emerald-600",
    desc: "Lead tracking and sales tools",
  },
};

export default function LoginPage({ role }: { role: RoleType }) {
  const { login, isLoggingIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const config = PortalConfig[role];
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) setLocation("/");
  }, [user, setLocation]);

  async function onSubmit(data: LoginForm) {
    try {
      await login({ ...data, portalRole: role });
      setLocation("/");
    } catch (error) {
      form.setError("root", { 
        message: error instanceof Error ? error.message : "Login failed" 
      });
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <Button 
          variant="ghost" 
          className="pl-0 hover:bg-transparent hover:text-primary"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Selection
        </Button>

        <div className="text-center space-y-2">
          <div className={`mx-auto w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${config.color}`}>
            <config.icon className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {config.title}
          </h1>
          <p className="text-muted-foreground">{config.desc}</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.root && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? "Authenticating..." : "Sign In"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
