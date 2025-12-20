import React from "react";
import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-8 transition-colors duration-300">
      <h1 className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">{t('error')}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">{t('page_not_found') || "The page you're looking for doesn't exist."}</p>
      <Link to="/">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">{t('home')}</Button>
      </Link>
    </div>
  );
};

export default NotFound;
