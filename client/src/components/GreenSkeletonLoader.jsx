import React from 'react';
import { useTranslation } from "react-i18next";

const GreenSkeletonLoader = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-elevation-1 p-4 animate-pulse flex flex-col">
        <div className="h-40 w-full bg-category rounded mb-4 shimmer" />
        <div className="h-6 w-3/4 bg-category rounded mb-2 shimmer" />
        <div className="h-4 w-1/2 bg-category rounded mb-2 shimmer" />
        <div className="h-4 w-1/3 bg-category rounded shimmer" />
      </div>
    ))}
  </div>
);

export const SkeletonLoader = ({ height = 24, width = '100%', className = '' }) => {
  const { t } = useTranslation();
  return (
    <div className={`skeleton-loader`} style={{ height, width }} aria-busy="true" aria-label={t("common_loading")} />
  );
};

export default GreenSkeletonLoader;
