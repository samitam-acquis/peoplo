import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Target, Loader2, Calendar, Users, Save, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface TeamGoalsViewProps {
  managerId: string;
}

interface TeamMemberWithGoals {
  id: string;
  first_name: string;
  last_name: string;
  designation: string;
  avatar_url: string | null;
  goals: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    priority: string;
    status: string;
    progress: number;
    due_date: string | null;
  }[];
}

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

export function TeamGoalsView({ managerId }: TeamGoalsViewProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [pendingProgress, setPendingProgress] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-goals", managerId],
    queryFn: async () => {
      // Get team members managed by this manager
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, first_name, last_name, designation, avatar_url")
        .eq("manager_id", managerId)
        .eq("status", "active");

      if (empError) throw empError;
      if (!employees || employees.length === 0) return [];

      // Get goals for all team members
      const { data: goals, error: goalsError } = await supabase
        .from("goals")
        .select("*")
        .in("employee_id", employees.map(e => e.id))
        .order("created_at", { ascending: false });

      if (goalsError) throw goalsError;

      // Combine employees with their goals
      const result: TeamMemberWithGoals[] = employees.map(emp => ({
        ...emp,
        goals: (goals || []).filter(g => g.employee_id === emp.id),
      }));

      return result;
    },
    enabled: !!managerId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ goalId, progress, status }: { goalId: string; progress: number; status: string }) => {
      const { error } = await supabase
        .from("goals")
        .update({ 
          progress, 
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null 
        })
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-goals", managerId] });
      toast.success("Goal progress updated");
      setEditingGoal(null);
    },
    onError: (error) => {
      toast.error("Failed to update progress: " + error.message);
    },
  });

  const handleProgressChange = (goalId: string, value: number[]) => {
    setPendingProgress(prev => ({ ...prev, [goalId]: value[0] }));
  };

  const handleSaveProgress = (goalId: string, currentStatus: string) => {
    const progress = pendingProgress[goalId];
    if (progress === undefined) return;

    let newStatus = currentStatus;
    if (progress === 100) {
      newStatus = "completed";
    } else if (progress > 0 && currentStatus === "not_started") {
      newStatus = "in_progress";
    }

    updateProgressMutation.mutate({ goalId, progress, status: newStatus });
    setPendingProgress(prev => {
      const updated = { ...prev };
      delete updated[goalId];
      return updated;
    });
  };

  const startEditing = (goalId: string, currentProgress: number) => {
    setEditingGoal(goalId);
    setPendingProgress(prev => ({ ...prev, [goalId]: currentProgress }));
  };

  const cancelEditing = (goalId: string) => {
    setEditingGoal(null);
    setPendingProgress(prev => {
      const updated = { ...prev };
      delete updated[goalId];
      return updated;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!teamData || teamData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Goals
          </CardTitle>
          <CardDescription>View goals for your team members</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>No team members found</p>
          <p className="text-sm">You don't have any direct reports</p>
        </CardContent>
      </Card>
    );
  }

  const filteredData = selectedEmployee === "all" 
    ? teamData 
    : teamData.filter(emp => emp.id === selectedEmployee);

  const totalGoals = teamData.reduce((sum, emp) => sum + emp.goals.length, 0);
  const completedGoals = teamData.reduce(
    (sum, emp) => sum + emp.goals.filter(g => g.status === "completed").length, 
    0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Goals
          </CardTitle>
          <CardDescription>
            {totalGoals} total goals • {completedGoals} completed
          </CardDescription>
        </div>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Team Members</SelectItem>
            {teamData.map(emp => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filteredData.map(employee => (
            <div key={employee.id} className="space-y-3">
              {/* Employee Header */}
              <div className="flex items-center gap-3 pb-2 border-b">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback>
                    {employee.first_name[0]}{employee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                  <p className="text-xs text-muted-foreground">{employee.designation}</p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  {employee.goals.length} goals
                </Badge>
              </div>

              {/* Employee Goals */}
              {employee.goals.length > 0 ? (
                <div className="space-y-3 pl-11">
                  {employee.goals.map(goal => (
                    <div key={goal.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <h4 className="font-medium text-sm">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {goal.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={`text-xs ${statusColors[goal.status]}`}>
                          {goal.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${priorityColors[goal.priority]}`}>
                          {goal.priority}
                        </Badge>
                        {goal.due_date && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(goal.due_date), "MMM d")}
                          </Badge>
                        )}
                      </div>

                      {editingGoal === goal.id ? (
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[pendingProgress[goal.id] ?? goal.progress]}
                            onValueChange={(value) => handleProgressChange(goal.id, value)}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-xs font-medium w-10 text-right">
                            {pendingProgress[goal.id] ?? goal.progress}%
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => handleSaveProgress(goal.id, goal.status)}
                            disabled={updateProgressMutation.isPending}
                          >
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => cancelEditing(goal.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => startEditing(goal.id, goal.progress)}
                          title="Click to edit progress"
                        >
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all" 
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{goal.progress}%</span>
                          <Save className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-11">No goals set</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
