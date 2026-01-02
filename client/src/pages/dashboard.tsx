import { useAuth } from "@/hooks/use-auth";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, 
  CalendarClock, 
  CheckCircle2, 
  Briefcase,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return <div className="p-8 text-center animate-pulse">Loading dashboard...</div>;
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Briefcase,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Follow Ups Today",
      value: stats.todayFollowUps,
      icon: CalendarClock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Converted",
      value: stats.convertedCount,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Overdue",
      value: stats.overdueFollowUps,
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
  ];

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, {user?.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
        </div>
        <div className="text-sm bg-white border px-4 py-2 rounded-lg shadow-sm">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <Card key={idx} className="dashboard-card border-l-4 border-l-primary/0 hover:border-l-primary/100">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                <div className="text-3xl font-bold">{card.value}</div>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdminOrManager && stats.teamPerformance && (
        <Card className="shadow-lg border-border/60">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="executiveName" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px' 
                    }}
                  />
                  <Bar dataKey="assignedCount" name="Leads Assigned" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="convertedCount" name="Converted" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions or Recent Activity could go here */}
    </div>
  );
}
