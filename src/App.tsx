import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";

// Error page
import ErrorPage from "./pages/ErrorPage";

// Public Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreatorPage from "./pages/CreatorPage";
import NotFound from "./pages/NotFound";
import VotingPage from "./pages/VotingPage";
import Account from "./pages/Account";
import Explore from "./pages/Explore";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCreators from "./pages/admin/AdminCreators";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminDonations from "./pages/admin/AdminDonations";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminAwards from "./pages/admin/AdminAwards";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";

// Creator Pages
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorDonations from "./pages/creator/CreatorDonations";
import CreatorWithdrawals from "./pages/creator/CreatorWithdrawals";
import CreatorLinks from "./pages/creator/CreatorLinks";
import CreatorCustomize from "./pages/creator/CreatorCustomize";
import CreatorSettings from "./pages/creator/CreatorSettings";
import CreatorStore from "./pages/creator/CreatorStore";
import CreatorEvents from "./pages/creator/CreatorEvents";

// Support & legal
import Support from "./pages/Support";
import Help from "./pages/Help";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookiePolicy from "./pages/CookiePolicy";

// Creator info
import AboutCreators from "./pages/creators/AboutCreators";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/vote" element={<VotingPage />} />
                <Route path="/vote/:slug" element={<VotingPage />} />
                <Route path="/vote/:slug" element={<VotingPage />} />
                <Route path="/account" element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                } />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/creators" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminCreators />
                  </ProtectedRoute>
                } />
                <Route path="/admin/categories" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminCategories />
                  </ProtectedRoute>
                } />
                <Route path="/admin/donations" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDonations />
                  </ProtectedRoute>
                } />
                <Route path="/admin/withdrawals" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminWithdrawals />
                  </ProtectedRoute>
                } />
                <Route path="/admin/transactions" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminTransactions />
                  </ProtectedRoute>
                } />
                <Route path="/admin/awards" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminAwards />
                  </ProtectedRoute>
                } />
                <Route path="/admin/payments" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminPayments />
                  </ProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminSettings />
                  </ProtectedRoute>
                } />

                {/* Creator Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/donations" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorDonations />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/withdrawals" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorWithdrawals />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/links" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorLinks />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/store" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorStore />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/events" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorEvents />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/customize" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorCustomize />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard/settings" element={
                  <ProtectedRoute requiredRole="creator">
                    <CreatorSettings />
                  </ProtectedRoute>
                } />

                {/* Creator public page - must be last */}
                {/* Support & legal pages */}
                <Route path="/support" element={<Support />} />
                <Route path="/help" element={<Help />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/community" element={<CommunityGuidelines />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cookies" element={<CookiePolicy />} />

                {/* Creator about */}
                <Route path="/creators/about" element={<AboutCreators />} />

                <Route path="/:username" element={<CreatorPage />} />
                <Route path="/error" element={<ErrorPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
