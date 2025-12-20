import React from 'react';
import { AlertCircle, WifiOff, ServerCrash, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './ErrorState.css';

const ErrorState = ({
    type = 'generic',
    message,
    onRetry,
    showHome = true
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const errorConfigs = {
        network: {
            icon: WifiOff,
            title: t('error.network_title', 'Connection Lost'),
            description: t('error.network_desc', 'Please check your internet connection and try again.'),
            color: '#f59e0b'
        },
        server: {
            icon: ServerCrash,
            title: t('error.server_title', 'Server Error'),
            description: t('error.server_desc', 'Something went wrong on our end. We\'re working on it!'),
            color: '#ef4444'
        },
        notFound: {
            icon: AlertCircle,
            title: t('error.notfound_title', 'Not Found'),
            description: t('error.notfound_desc', 'The item you\'re looking for doesn\'t exist or was removed.'),
            color: '#6b7280'
        },
        generic: {
            icon: AlertCircle,
            title: t('error.generic_title', 'Oops!'),
            description: message || t('error.generic_desc', 'Something went wrong. Please try again.'),
            color: '#8b5cf6'
        },
        empty: {
            icon: AlertCircle,
            title: t('error.empty_title', 'No Results'),
            description: t('error.empty_desc', 'No items found matching your criteria.'),
            color: '#10b981'
        }
    };

    const config = errorConfigs[type] || errorConfigs.generic;
    const IconComponent = config.icon;

    return (
        <div className="error-state">
            <div className="error-icon-wrapper" style={{ backgroundColor: `${config.color}15` }}>
                <IconComponent size={48} color={config.color} />
            </div>
            <h2 className="error-title">{config.title}</h2>
            <p className="error-description">{config.description}</p>

            <div className="error-actions">
                {onRetry && (
                    <button className="error-btn error-btn-primary" onClick={onRetry}>
                        <RefreshCw size={18} />
                        {t('error.retry', 'Try Again')}
                    </button>
                )}
                {showHome && (
                    <button className="error-btn error-btn-secondary" onClick={() => navigate('/')}>
                        <Home size={18} />
                        {t('error.home', 'Go Home')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorState;
