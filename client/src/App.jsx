import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import GreenNavbar from './components/GreenNavbar.jsx';
import AllPosts from './pages/AllPosts.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import SignUp from './pages/Auth/SignUp.jsx';
import Login from './pages/Auth/Login.jsx';
import ForgotPassword from './pages/Auth/ForgotPassword.jsx';
import AddPost from './pages/AddPost.jsx';
import TierSelection from './pages/TierSelection.jsx';
import BuyerView from './pages/BuyerView.jsx';
import Saledone from './pages/Saledone.jsx';
import SaleUndone from './pages/SaleUndone.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import AadhaarVerify from './pages/AadhaarVerify.jsx';
import PublicWall from './pages/PublicWall.jsx';
import Notifications from './pages/Notifications.jsx';
import Complaints from './pages/Complaints.jsx';
import Feedback from './pages/Feedback.jsx';
import MyHome from './pages/MyHome.jsx';
import BoughtPosts from './pages/BoughtPosts.jsx';
import SoldPosts from './pages/SoldPosts.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Rewards from './pages/Rewards.jsx';
import MyRecommendations from './pages/MyRecommendations.jsx';
import Categories from './pages/Categories.jsx';
import { Toaster } from "@/components/ui/toaster";
import FeedPage from './pages/FeedPage.jsx';
import MyFeedPage from './pages/MyFeedPage.jsx';
import PostAdd from './pages/PostAdd.jsx';
import { FilterProvider } from './context/FilterContext.jsx';

function App() {
  return (
    <FilterProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Top and bottom navbars are handled inside GreenNavbar */}
        <GreenNavbar />
        <main className="flex-1">
          <Routes>
            {/* Authentication routes without navbar */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* Main app routes */}
            <Route path="/" element={<Navigate to="/all-posts" replace />} />
            <Route path="/all-posts" element={<AllPosts />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/add-post" element={<AddPost />} />
            <Route path="/tier-selection" element={<TierSelection />} />
            <Route path="/my-home" element={<MyHome />} />
            <Route path="/bought-posts" element={<BoughtPosts />} />
            <Route path="/sold-posts" element={<SoldPosts />} />
            <Route path="/buyer-view" element={<BuyerView />} />
            <Route path="/saledone" element={<Saledone />} />
            <Route path="/saleundone" element={<SaleUndone />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/aadhaar-verify" element={<AadhaarVerify />} />
            <Route path="/public-wall" element={<PublicWall />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/my-recommendations" element={<MyRecommendations />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/my-feed" element={<MyFeedPage />} />
            <Route path="/post_add" element={<PostAdd />} />
            <Route path="*" element={<Navigate to="/all-posts" replace />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </FilterProvider>
  );
}

export default App;
