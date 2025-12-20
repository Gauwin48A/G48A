import React from 'react';
import './Skeleton.css';

// Card skeleton for posts
export const PostCardSkeleton = () => (
    <div className="skeleton-card">
        <div className="skeleton-image shimmer" />
        <div className="skeleton-content">
            <div className="skeleton-title shimmer" />
            <div className="skeleton-text shimmer" />
            <div className="skeleton-price shimmer" />
        </div>
    </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
    <div className="skeleton-profile">
        <div className="skeleton-avatar shimmer" />
        <div className="skeleton-info">
            <div className="skeleton-name shimmer" />
            <div className="skeleton-email shimmer" />
        </div>
    </div>
);

// List skeleton
export const ListSkeleton = ({ count = 5 }) => (
    <div className="skeleton-list">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="skeleton-list-item">
                <div className="skeleton-circle shimmer" />
                <div className="skeleton-lines">
                    <div className="skeleton-line shimmer" style={{ width: '80%' }} />
                    <div className="skeleton-line shimmer" style={{ width: '60%' }} />
                </div>
            </div>
        ))}
    </div>
);

// Detail page skeleton
export const DetailSkeleton = () => (
    <div className="skeleton-detail">
        <div className="skeleton-hero shimmer" />
        <div className="skeleton-detail-content">
            <div className="skeleton-title-lg shimmer" />
            <div className="skeleton-text shimmer" />
            <div className="skeleton-text shimmer" style={{ width: '70%' }} />
            <div className="skeleton-price-lg shimmer" />
        </div>
    </div>
);

// Grid of post cards
export const PostGridSkeleton = ({ count = 8 }) => (
    <div className="skeleton-grid">
        {[...Array(count)].map((_, i) => (
            <PostCardSkeleton key={i} />
        ))}
    </div>
);

// Rewards page skeleton
export const RewardsSkeleton = () => (
    <div className="skeleton-rewards">
        <div className="skeleton-tier-card shimmer" />
        <div className="skeleton-stats">
            <div className="skeleton-stat shimmer" />
            <div className="skeleton-stat shimmer" />
            <div className="skeleton-stat shimmer" />
        </div>
        <ListSkeleton count={3} />
    </div>
);

export default PostCardSkeleton;
