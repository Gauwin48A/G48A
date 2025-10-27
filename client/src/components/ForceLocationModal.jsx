import React from "react";
import './ForceLocationModal.css';

export default function ForceLocationModal({ loading, error, retry }) {
  return (
    <div className="force-location-modal-overlay fade-in">
      <div className="force-location-modal">
        <h2>Location Access Required</h2>
        <p>
          This app requires your location to continue. Please enable location permission.
        </p>
        {error && <div className="error">{error}</div>}
        <button className="retry-btn" onClick={retry} disabled={loading}>
          {loading ? <span className="spinner" /> : "Enable Location"}
        </button>
      </div>
    </div>
  );
}
