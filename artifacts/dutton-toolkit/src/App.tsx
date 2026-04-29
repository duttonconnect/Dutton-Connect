import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/store";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
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
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
