import React from "react";
import { useTranslation } from "react-i18next";
import './ForceLocationModal.css';

export default function ForceLocationModal({ loading, error, retry }) {
  const { t } = useTranslation();
  
  return (
    <div className="force-location-modal-overlay fade-in">
      <div className="force-location-modal">
        <h2>{t('location_required')}</h2>
        <p>
          {t('grant_permission')}
        </p>
        {error && <div className="error">{error}</div>}
        <button className="retry-btn" onClick={retry} disabled={loading}>
          {loading ? <span className="spinner" /> : t('allow_location')}
        </button>
      </div>
    </div>
  );
}
