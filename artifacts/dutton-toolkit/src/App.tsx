import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/store";
import { RoleProvider, useRole } from "@/lib/role";
import { AuthProvider, useAuth } from "@/lib/auth";
import { FirestoreSyncBridge } from "@/lib/firestore-sync";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import JobsList from "@/pages/jobs/index";
import NewJob from "@/pages/jobs/new";
import EditJob from "@/pages/jobs/edit";
import JobDetail from "@/pages/jobs/detail";
import QuotesList from "@/pages/quotes/index";
import NewQuote from "@/pages/quotes/new";
import QuoteDetail from "@/pages/quotes/detail";
import CustomersList from "@/pages/customers/index";
import CustomerDetail from "@/pages/customers/detail";
import PaymentsList from "@/pages/payments/index";
import MapView from "@/pages/map";
import MileageTracker from "@/pages/mileage";
import ReceiptTracker from "@/pages/receipts";
import NearbyJobs from "@/pages/nearby-jobs";
import RoutePlanner from "@/pages/route-planner";
import NotFound from "@/pages/not-found";

import ChooseAccountType from "@/pages/choose-account-type";
import CustomerDashboard from "@/pages/customer/dashboard";
import PostJobRequest from "@/pages/customer/post-request";
import MyJobRequests from "@/pages/customer/my-requests";
import MyJobs from "@/pages/customer/my-jobs";
import JobQuotes from "@/pages/customer/job-quotes";
import LeaveReview from "@/pages/customer/leave-review";
import FindNearbyPros from "@/pages/customer/find-pros";
import MyQuotes from "@/pages/customer/my-quotes";
import ProProfilePage from "@/pages/pros/profile";
import MessagesList from "@/pages/messages/index";
import ChatPage from "@/pages/messages/chat";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";

import CalendarPage from "@/pages/calendar";
import AdminPanel from "@/pages/admin/index";
import ReportBug from "@/pages/report-bug";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import LeadInbox from "@/pages/lead-inbox";
import CustomerCRM from "@/pages/customer-crm";
import EstimatesPage from "@/pages/estimates";

const queryClient = new QueryClient();

function ProRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jobs" component={JobsList} />
        <Route path="/jobs/new" component={NewJob} />
        <Route path="/jobs/:id/edit" component={EditJob} />
        <Route path="/jobs/:id" component={JobDetail} />
        <Route path="/quotes" component={QuotesList} />
        <Route path="/quotes/new" component={NewQuote} />
        <Route path="/quotes/:id" component={QuoteDetail} />
        <Route path="/customers" component={CustomersList} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/payments" component={PaymentsList} />
        <Route path="/map" component={MapView} />
        <Route path="/mileage" component={MileageTracker} />
        <Route path="/receipts" component={ReceiptTracker} />
        <Route path="/nearby-jobs" component={NearbyJobs} />
        <Route path="/lead-inbox" component={LeadInbox} />
        <Route path="/customer-crm" component={CustomerCRM} />
        <Route path="/estimates" component={EstimatesPage} />
        <Route path="/route-planner" component={RoutePlanner} />
        <Route path="/messages" component={MessagesList} />
        <Route path="/messages/:id" component={ChatPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/report-bug" component={ReportBug} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function CustomerRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={CustomerDashboard} />
        <Route path="/post-request" component={PostJobRequest} />
        <Route path="/my-requests" component={MyJobRequests} />
        <Route path="/my-jobs" component={MyJobs} />
        <Route path="/my-jobs/:jobId/quotes" component={JobQuotes} />
        <Route path="/my-jobs/:jobId/review/:proId" component={LeaveReview} />
        <Route path="/my-quotes" component={MyQuotes} />
        <Route path="/find-pros" component={FindNearbyPros} />
        <Route path="/pros/:proId" component={ProProfilePage} />
        <Route path="/messages" component={MessagesList} />
        <Route path="/messages/:id" component={ChatPage} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/report-bug" component={ReportBug} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// Syncs role to/from Firestore whenever the user or role changes.
function RoleCloudBridge() {
  const { user, loadRoleFromCloud, saveRoleToCloud } = useAuth();
  const { role, setRole } = useRole();

  useEffect(() => {
    if (!user) return;
    loadRoleFromCloud().then((cloudRole) => {
      if (cloudRole && !role) setRole(cloudRole);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (user && role) saveRoleToCloud(role);
  }, [user?.uid, role]);

  return null;
}

function RoleGate() {
  const { role } = useRole();
  if (!role) return <ChooseAccountType />;
  if (role === "customer") return <CustomerRoutes />;
  return <ProRoutes />;
}

function AuthGate() {
  const { user, loading, isConfigured } = useAuth();
  const [location] = useLocation();

  // While Firebase is resolving auth state, show a minimal loading screen.
  if (isConfigured && loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="text-xl font-bold text-primary">Dutton Connect</div>
          <div className="text-sm text-gray-500">Loading…</div>
        </div>
      </div>
    );
  }

  // If Firebase is configured and user is NOT logged in → auth pages.
  if (isConfigured && !user) {
    return (
      <Switch>
        <Route path="/signup" component={Signup} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Redirect /login and /signup away once logged in (or in offline mode).
  if (location === "/login" || location === "/signup") {
    return <RoleGate />;
  }

  return (
    <>
      <RoleCloudBridge />
      <FirestoreSyncBridge />
      <RoleGate />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <AuthProvider>
            <RoleProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <AuthGate />
              </WouterRouter>
              <Toaster />
            </RoleProvider>
          </AuthProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
