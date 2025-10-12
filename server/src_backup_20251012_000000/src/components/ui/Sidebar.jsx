
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Home, 
  LayoutDashboard, 
  User, 
  Bell, 
  Settings, 
  Shield,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path) => location.pathname === path;

  const sidebarItems = [
    { name: 'All Posts', path: '/all-posts', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Admin Panel', path: '/admin-panel', icon: Shield },
    { name: 'Feedback', path: '/feedback', icon: MessageSquare },
    { name: 'Complaints', path: '/complaints', icon: AlertCircle },
  ];

  // Sidebar removed as per new design (categories are now below navbar)
  return null;
};

export default Sidebar;
