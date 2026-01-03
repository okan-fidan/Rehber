import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Groups from "./pages/Groups";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Posts from "./pages/Posts";
import Collaboration from "./pages/Collaboration";
import Messages from "./pages/Messages";
import PrivateChat from "./pages/PrivateChat";
import Communities from "./pages/Communities";
import MyCommunities from "./pages/MyCommunities";
import CommunityDetail from "./pages/CommunityDetail";
import SubGroupChat from "./pages/SubGroupChat";
import AdminPanel from "./pages/AdminPanel";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Components
import BottomNav from "./components/BottomNav";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading, userProfile, profileLoading } = useAuth();
  
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If user exists but profile is incomplete, redirect to register
  if (!userProfile || !userProfile.firstName) {
    return <Navigate to="/register" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to my-communities if logged in with complete profile)
const PublicRoute = ({ children }) => {
  const { user, loading, userProfile, profileLoading } = useAuth();
  
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#0e1621] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // Only redirect if user has complete profile
  if (user && userProfile && userProfile.firstName) {
    return <Navigate to="/my-communities" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { user, userProfile } = useAuth();
  const location = useLocation();
  
  // Show bottom nav only for logged in users with complete profile
  const showBottomNav = user && userProfile && userProfile.firstName && 
    !['/login', '/register'].includes(location.pathname);

  return (
    <>
      <div className={showBottomNav ? 'pb-16' : ''}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
          <Route path="/collaboration" element={<ProtectedRoute><Collaboration /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/messages/:id" element={<ProtectedRoute><PrivateChat /></ProtectedRoute>} />
          <Route path="/communities" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
          <Route path="/my-communities" element={<ProtectedRoute><MyCommunities /></ProtectedRoute>} />
          <Route path="/community/:id" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
          <Route path="/subgroup/:id" element={<ProtectedRoute><SubGroupChat /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/communities" replace />} />
          <Route path="*" element={<Navigate to="/communities" replace />} />
        </Routes>
      </div>
      {showBottomNav && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
