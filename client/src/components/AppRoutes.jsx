import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AllPosts from '../pages/AllPosts';
import MyHome from '../pages/MyHome';
import PostDetail from '../pages/PostDetail';
import PostDetailView from './PostDetailView';
import RewardsPage from '../pages/RewardsPage';
import FeedPage from '../pages/FeedPage';
import MyFeedPage from '../pages/MyFeedPage';
import CreateChannelPage from '../pages/CreateChannelPage';
import ChannelsListPage from '../pages/ChannelsListPage';
import ChannelPage from '../pages/ChannelPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AllPosts />} />
      <Route path="/all-posts" element={<AllPosts />} />
      <Route path="/my-home" element={<MyHome />} />
      <Route path="/rewards" element={<RewardsPage />} />
      <Route path="/post/:postId" element={<PostDetail />} />
      <Route path="/post-detail-view" element={<PostDetailView />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/my-feed" element={<MyFeedPage />} />
      <Route path="/channels" element={<ChannelsListPage />} />
      <Route path="/channels/create" element={<CreateChannelPage />} />
      <Route path="/channels/:id" element={<ChannelPage />} />
    </Routes>
  );
};

export default AppRoutes;
