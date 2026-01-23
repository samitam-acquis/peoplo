import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, MapPin, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MyAttendanceHistoryProps {
  employeeId: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
  work_mode: string | null;
  clock_in_location_name: string | null;
  clock_out_location_name: string | null;
}

const statusStyles: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  late: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  "half-day": "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

export function MyAttendanceHistory({ employeeId }: MyAttendanceHistoryProps) {
  const { data: records, isLoading } = useQuery({
    queryKey: ["my-attendance-history", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, date, clock_in, clock_out, total_hours, status, work_mode, clock_in_location_name, clock_out_location_name")
        .eq("employee_id", employeeId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: !!employeeId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return "-";
    return format(new Date(timestamp), "h:mm a");
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return "-";
    return `${hours.toFixed(1)}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Attendance History
        </CardTitle>
        <CardDescription>Your recent attendance records (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {records && records.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(record.date), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            {formatTime(record.clock_in)}
                            {record.clock_in_location_name && (
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </TooltipTrigger>
                          {record.clock_in_location_name && (
                            <TooltipContent>
                              <p>{record.clock_in_location_name}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            {formatTime(record.clock_out)}
                            {record.clock_out_location_name && (
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </TooltipTrigger>
                          {record.clock_out_location_name && (
                            <TooltipContent>
                              <p>{record.clock_out_location_name}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{formatHours(record.total_hours)}</TableCell>
                    <TableCell>
                      {record.work_mode ? (
                        <Badge variant="outline" className="text-xs">
                          {record.work_mode === "wfh" ? "WFH" : "Office"}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[record.status] || ""}>
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No attendance records yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
