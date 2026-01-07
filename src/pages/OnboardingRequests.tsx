import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Clock, UserPlus, Loader2, Eye, CheckCircle2, XCircle } from "lucide-react";
import { useOnboardingRequests, OnboardingRequest } from "@/hooks/useOnboardingRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const OnboardingRequests = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToAction, setRequestToAction] = useState<OnboardingRequest | null>(null);
  
  const { requests, isLoading, approveRequest, rejectRequest } = useOnboardingRequests();
  const { user } = useAuth();
  const navigate = useNavigate();

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleApprove = (request: OnboardingRequest) => {
    setRequestToAction(request);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: OnboardingRequest) => {
    setRequestToAction(request);
    setRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (requestToAction && user) {
      approveRequest.mutate({ requestId: requestToAction.id, userId: user.id });
      setApproveDialogOpen(false);
      setRequestToAction(null);
    }
  };

  const confirmReject = () => {
    if (requestToAction && user) {
      rejectRequest.mutate({ requestId: requestToAction.id, userId: user.id });
      setRejectDialogOpen(false);
      setRequestToAction(null);
    }
  };

  const handleCreateEmployee = (request: OnboardingRequest) => {
    // Navigate to onboarding page with pre-filled data
    navigate("/onboarding", {
      state: {
        prefillData: {
          email: request.email,
          fullName: request.full_name,
          linkedUserId: request.user_id,
        },
      },
    });
  };

  const renderRequestsTable = (requestsList: OnboardingRequest[], showActions: boolean = false) => {
    if (requestsList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">No Requests</h3>
          <p className="text-muted-foreground">
            {activeTab === "pending" 
              ? "There are no pending onboarding requests"
              : `No ${activeTab} requests found`}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requestsList.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(request.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{request.full_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{request.email}</TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {request.message || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(request.created_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {showActions && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleApprove(request)}
                        disabled={approveRequest.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(request)}
                        disabled={rejectRequest.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {request.status === "approved" && (
                    <Button
                      size="sm"
                      onClick={() => handleCreateEmployee(request)}
                    >
                      <UserPlus className="mr-1 h-4 w-4" />
                      Create Employee
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Onboarding Requests</h2>
          <p className="text-muted-foreground">
            Review and manage employee onboarding requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedRequests.length}</div>
              <p className="text-xs text-muted-foreground">Ready for onboarding</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedRequests.length}</div>
              <p className="text-xs text-muted-foreground">Not approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
            <CardDescription>
              Review onboarding requests from users who have signed up
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pending">
                  Pending
                  {pendingRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
              <TabsContent value="pending">
                {renderRequestsTable(pendingRequests, true)}
              </TabsContent>
              <TabsContent value="approved">
                {renderRequestsTable(approvedRequests)}
              </TabsContent>
              <TabsContent value="rejected">
                {renderRequestsTable(rejectedRequests)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* View Request Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Onboarding request from {selectedRequest?.full_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedRequest.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedRequest.full_name}</h3>
                  <p className="text-muted-foreground">{selectedRequest.email}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Message</h4>
                <p className="mt-1 text-foreground">
                  {selectedRequest.message || "No message provided"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Submitted</h4>
                <p className="mt-1 text-foreground">
                  {format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {selectedRequest.reviewed_at && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Reviewed</h4>
                  <p className="mt-1 text-foreground">
                    {format(new Date(selectedRequest.reviewed_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    handleReject(selectedRequest);
                    setSelectedRequest(null);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedRequest);
                    setSelectedRequest(null);
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {selectedRequest?.status === "approved" && (
              <Button onClick={() => {
                handleCreateEmployee(selectedRequest);
                setSelectedRequest(null);
              }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Employee Record
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the onboarding request from{" "}
              <strong>{requestToAction?.full_name}</strong>? You will then be able to create
              an employee record for them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>
              {approveRequest.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the onboarding request from{" "}
              <strong>{requestToAction?.full_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rejectRequest.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default OnboardingRequests;
