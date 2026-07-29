import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

// Public Pages
import Landing from '@/pages/landing';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Fixtures from '@/pages/fixtures';
import Results from '@/pages/results';
import Champions from '@/pages/champions';

// Admin Pages
import Dashboard from '@/pages/admin/dashboard';
import Tournaments from '@/pages/admin/tournaments';
import Events from '@/pages/admin/events';
import Registrations from '@/pages/admin/registrations';
import AdminFixtures from '@/pages/admin/fixtures';
import Schedule from '@/pages/admin/schedule';
import AdminResults from '@/pages/admin/results';
import AdminChampions from '@/pages/admin/champions';
import Reports from '@/pages/admin/reports';
import Settings from '@/pages/admin/settings';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/results" component={Results} />
      <Route path="/champions" component={Champions} />

      {/* Admin Routes - Protected */}
      <Route path="/admin/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/tournaments">
        <ProtectedRoute>
          <Tournaments />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/events">
        <ProtectedRoute>
          <Events />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/registrations">
        <ProtectedRoute>
          <Registrations />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/fixtures">
        <ProtectedRoute>
          <AdminFixtures />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/schedule">
        <ProtectedRoute>
          <Schedule />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/results">
        <ProtectedRoute>
          <AdminResults />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/champions">
        <ProtectedRoute>
          <AdminChampions />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
