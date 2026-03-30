// src/components/ui/card-content.jsx
import React from "react";

import { useTranslation } from 'react-i18next';

const CardContent = ({ children, className = "" }) => {
  const { t } = useTranslation();
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
};

export default CardContent;
export { CardContent };
