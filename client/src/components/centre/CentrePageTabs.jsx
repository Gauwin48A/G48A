import React, { useState } from "react";
import {
  Info,
  Package,
  Bell,
  Star,
  BarChart3,
  BadgeCheck,
  Crown,
  Award,
  Calendar,
  MapPin,
  Globe,
  Mail,
  Phone,
  Users,
  Clock,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tab navigation                                                    */
/* ------------------------------------------------------------------ */
const TABS = [
  { key: "about", label: "About", icon: Info },
  { key: "listings", label: "Listings", icon: Package },
  { key: "updates", label: "Updates", icon: Bell },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "analytics", label: "Analytics", icon: BarChart3, ownerOnly: true },
];

function TabBar({ active, onChange, isOwner }) {
  const visibleTabs = TABS.filter((tab) => !tab.ownerOnly || isOwner);

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200 dark:border-gray-700 pb-px mb-4">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
              isActive
                ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verification Badge                                                */
/* ------------------------------------------------------------------ */
export function CentreVerificationBadge({ channel }) {
  const isVerified = channel?.is_verified || channel?.verified;
  const isPremium =
    channel?.is_premium ||
    channel?.tier === "premium" ||
    channel?.owner_plan === "premium";

  if (!isVerified && !isPremium) return null;

  return (
    <div className="flex items-center gap-1.5">
      {isVerified && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
          <BadgeCheck className="h-3 w-3" />
          Verified
        </span>
      )}
      {isPremium && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
          <Crown className="h-3 w-3" />
          Premium
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  About Tab Content                                                 */
/* ------------------------------------------------------------------ */
function AboutTab({ channel }) {
  const memberSince = channel?.created_at
    ? new Date(channel.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";

  const stats = [
    {
      icon: Users,
      label: "Followers",
      value: channel?.follower_count || 0,
    },
    {
      icon: Package,
      label: "Listings",
      value: channel?.listing_count || channel?.post_count || 0,
    },
    {
      icon: Star,
      label: "Rating",
      value: channel?.average_rating
        ? `${Number(channel.average_rating).toFixed(1)} ★`
        : "—",
    },
    {
      icon: Calendar,
      label: "Member Since",
      value: memberSince || "—",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Description */}
      {(channel?.description || channel?.bio) && (
        <div className="bg-white dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            About
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            {channel.description || channel.bio}
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900/40 rounded-xl p-3 border border-gray-200 dark:border-gray-700 text-center"
            >
              <Icon className="h-5 w-5 mx-auto text-gray-400 dark:text-gray-500 mb-1" />
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Contact Info */}
      <ContactInfo channel={channel} />

      {/* Business Hours (if available) */}
      {channel?.business_hours && (
        <div className="bg-white dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Business Hours
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {channel.business_hours}
          </p>
        </div>
      )}

      {/* Milestones / Achievements */}
      <Milestones channel={channel} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Info                                                      */
/* ------------------------------------------------------------------ */
function ContactInfo({ channel }) {
  const items = [
    { icon: Phone, value: channel?.contact_phone, href: `tel:${channel?.contact_phone}` },
    { icon: Mail, value: channel?.contact_email, href: `mailto:${channel?.contact_email}` },
    {
      icon: Globe,
      value: channel?.contact_website,
      href: channel?.contact_website,
      external: true,
    },
    { icon: MapPin, value: channel?.location },
  ].filter((i) => i.value);

  if (!items.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Contact & Location
      </h4>
      <div className="space-y-2">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const content = (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">{item.value}</span>
            </div>
          );
          return item.href ? (
            <a
              key={idx}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="block hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {content}
            </a>
          ) : (
            <div key={idx}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Milestones                                                        */
/* ------------------------------------------------------------------ */
function Milestones({ channel }) {
  const followerCount = Number(channel?.follower_count || 0);
  const milestones = [
    { threshold: 10, label: "First 10 Followers", icon: "🎯", unlocked: followerCount >= 10 },
    { threshold: 50, label: "Growing Community", icon: "🌱", unlocked: followerCount >= 50 },
    { threshold: 100, label: "Century Club", icon: "💯", unlocked: followerCount >= 100 },
    { threshold: 500, label: "Popular Page", icon: "🔥", unlocked: followerCount >= 500 },
    { threshold: 1000, label: "1K Milestone", icon: "🏆", unlocked: followerCount >= 1000 },
  ];

  return (
    <div className="bg-white dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
        <Award className="h-3.5 w-3.5" />
        Milestones
      </h4>
      <div className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <div
            key={m.threshold}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold border ${
              m.unlocked
                ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
            }`}
          >
            <span className={m.unlocked ? "" : "opacity-30"}>{m.icon}</span>
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CentrePageTabs – main export                                      */
/* ------------------------------------------------------------------ */
export default function CentrePageTabs({
  channel,
  isOwner,
  children,
  activeTab: controlledTab,
  onTabChange,
}) {
  const [internalTab, setInternalTab] = useState("about");
  const activeTab = controlledTab || internalTab;
  const handleChange = onTabChange || setInternalTab;

  return (
    <div>
      <TabBar active={activeTab} onChange={handleChange} isOwner={isOwner} />

      {activeTab === "about" && <AboutTab channel={channel} />}

      {/* Other tabs rendered via children render prop or slots */}
      {activeTab !== "about" && children && children(activeTab)}
    </div>
  );
}

export { AboutTab, ContactInfo, Milestones, TabBar };
