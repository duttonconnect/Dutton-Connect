import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/store";
import { RoleProvider, useRole } from "@/lib/role";
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
import NotFound from "@/pages/not-found";

import ChooseAccountType from "@/pages/choose-account-type";
import CustomerDashboard from "@/pages/customer/dashboard";
import PostJobRequest from "@/pages/customer/post-request";
import MyJobRequests from "@/pages/customer/my-requests";
import FindNearbyPros from "@/pages/customer/find-pros";

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
        <Route path="/find-pros" component={FindNearbyPros} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function RoleGate() {
  const { role } = useRole();
  if (!role) return <ChooseAccountType />;
  if (role === "customer") return <CustomerRoutes />;
  return <ProRoutes />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <RoleProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <RoleGate />
            </WouterRouter>
            <Toaster />
          </RoleProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
