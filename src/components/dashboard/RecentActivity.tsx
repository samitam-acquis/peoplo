import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRecentActivity } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const statusStyles = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  created: "bg-primary/10 text-primary border-primary/20",
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatActivityDetails = (log: {
  action: string;
  entity_type: string;
  details: unknown;
}) => {
  const details = (typeof log.details === 'object' && log.details !== null) 
    ? log.details as Record<string, unknown> 
    : null;
  const entityName = details?.name || details?.title || details?.employee_name || log.entity_type;
  
  return {
    userName: (details?.performed_by as string) || (details?.employee_name as string) || "System",
    action: log.action.toLowerCase(),
    type: String(entityName),
    status: log.action.toLowerCase().includes("approved") 
      ? "approved" 
      : log.action.toLowerCase().includes("rejected")
      ? "rejected"
      : log.action.toLowerCase().includes("pending")
      ? "pending"
      : "completed",
  };
};

export function RecentActivity() {
  const { data: activities, isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent activity to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((log) => {
          const { userName, action, type, status } = formatActivityDetails(log);
          const timeAgo = formatDistanceToNow(new Date(log.created_at), { addSuffix: true });
          
          return (
            <div
              key={log.id}
              className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-muted/50"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-foreground">{userName}</span>{" "}
                  <span className="text-muted-foreground">{action}</span>{" "}
                  <span className="font-medium text-foreground">{type}</span>
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
              <Badge
                variant="outline"
                className={statusStyles[status as keyof typeof statusStyles] || statusStyles.completed}
              >
                {status}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
