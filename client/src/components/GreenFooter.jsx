import React from 'react';

import { useTranslation } from 'react-i18next';

const GreenFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-primary text-white py-8 mt-12" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h2 className="font-bold text-lg mb-2">GreenKart</h2>
          <p className="text-sm">{t('trusted_ecommerce')}</p>
        </div>
        <div>
          <h2 className="font-bold text-lg mb-2">{t('quick_links')}</h2>
          <ul className="space-y-2">
            <li><a href="/" className="hover:underline">{t('home')}</a></li>
            <li><a href="/categories" className="hover:underline">{t('categories')}</a></li>
            <li><a href="/deals" className="hover:underline">{t('deals')}</a></li>
            <li><a href="/profile" className="hover:underline">{t('profile')}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold text-lg mb-2">{t('follow_us')}</h2>
          <div className="flex gap-4">
            <a href="#" aria-label={t('twitter')} className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg></a>
            <a href="#" aria-label={t('facebook')} className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><rect x="4" y="4" width="16" height="16" /></svg></a>
            <a href="#" aria-label={t('instagram')} className="hover:text-secondary"><svg width="24" height="24" fill="currentColor"><ellipse cx="12" cy="12" rx="10" ry="8" /></svg></a>
          </div>
        </div>
      </div>
      <div className="text-center text-xs mt-8">{t('copyright_greenkart')}</div>
    </footer>
  );
};

export default GreenFooter;
