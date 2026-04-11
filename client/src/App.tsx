import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmailInbox from "./pages/EmailInbox";
import EmailDetail from "./pages/EmailDetail";
import TaskBoard from "./pages/TaskBoard";
import Settings from "./pages/Settings";
import WhatsAppInbox from "./pages/WhatsAppInbox";
import WhatsAppDetail from "./pages/WhatsAppDetail";
import Employees from "./pages/Employees";
import DashboardLayout from "./components/DashboardLayout";
import PriorityView from "./pages/PriorityView";
import Invoices from "./pages/Invoices";
import Festivals from "./pages/Festivals";
import Chat from "./pages/Chat";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/dashboard"}>
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      </Route>
      <Route path={"/emails"}>
        <DashboardLayout>
          <EmailInbox />
        </DashboardLayout>
      </Route>
      <Route path={"/emails/:id"}>
        {(params) => (
          <DashboardLayout>
            <EmailDetail id={params.id} />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/whatsapp"}>
        <DashboardLayout>
          <WhatsAppInbox />
        </DashboardLayout>
      </Route>
      <Route path={"/whatsapp/:id"}>
        {(params) => (
          <DashboardLayout>
            <WhatsAppDetail />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/employees"}>
        <DashboardLayout>
          <Employees />
        </DashboardLayout>
      </Route>
      <Route path={"/tasks"}>
        <DashboardLayout>
          <TaskBoard />
        </DashboardLayout>
      </Route>
      <Route path={"/invoices"}>
        <DashboardLayout>
          <Invoices />
        </DashboardLayout>
      </Route>
      <Route path={"/festivals"}>
        <DashboardLayout>
          <Festivals />
        </DashboardLayout>
      </Route>
      <Route path={"/priority"} component={PriorityView} />
      <Route path={"/chat"}>
        <DashboardLayout>
          <Chat />
        </DashboardLayout>
      </Route>
      <Route path={"/settings"}>
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
