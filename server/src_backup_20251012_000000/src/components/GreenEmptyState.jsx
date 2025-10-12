import React from 'react';

const GreenEmptyState = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <img src="/empty-state.svg" alt="No data" className="h-32 w-32 mb-4" onError={e => { e.target.onerror = null; e.target.src = '/placeholder.svg'; }} />
    <p className="text-lg text-text mb-2">{message || 'No items found.'}</p>
    <button className="px-6 py-2 bg-primary text-white rounded-lg shadow-elevation-1 hover:bg-primary-dark">Go Home</button>
  </div>
);

export default GreenEmptyState;
