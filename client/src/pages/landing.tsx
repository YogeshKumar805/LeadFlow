import { Link } from "wouter";
import { ShieldCheck, LayoutDashboard, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-muted/50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="space-y-4">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Enterprise <span className="text-primary">CRM</span> System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage your leads, track performance, and grow your business with our comprehensive lead management solution.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12 text-left">
          {/* Admin Card */}
          <div className="group relative bg-card hover:bg-card/50 border border-border/50 hover:border-purple-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Admin Portal</h3>
            <p className="text-muted-foreground mb-6 h-12">System configuration, user management, and global oversight.</p>
            <Link href="/login/admin">
              <Button className="w-full group-hover:bg-purple-600 group-hover:text-white" variant="outline">
                Login as Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Manager Card */}
          <div className="group relative bg-card hover:bg-card/50 border border-border/50 hover:border-blue-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Manager Portal</h3>
            <p className="text-muted-foreground mb-6 h-12">Team performance tracking, lead distribution, and analytics.</p>
            <Link href="/login/manager">
              <Button className="w-full group-hover:bg-blue-600 group-hover:text-white" variant="outline">
                Login as Manager
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Executive Card */}
          <div className="group relative bg-card hover:bg-card/50 border border-border/50 hover:border-emerald-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Executive Portal</h3>
            <p className="text-muted-foreground mb-6 h-12">Lead management, follow-up tracking, and conversion tools.</p>
            <Link href="/login/executive">
              <Button className="w-full group-hover:bg-emerald-600 group-hover:text-white" variant="outline">
                Login as Executive
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground pt-8">
          © 2024 CRM Systems Inc. Secure Enterprise Access Only.
        </p>
      </div>
    </div>
  );
}
