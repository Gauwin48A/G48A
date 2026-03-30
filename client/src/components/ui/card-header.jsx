// src/components/ui/card-header.jsx
import React from "react";
import { cn } from "@/lib/utils"; // Or just remove `cn` if not using classnames util

import { useTranslation } from 'react-i18next';

const CardHeader = ({ children, className }) => {
  const { t } = useTranslation();
  return (
    <div className={`border-b px-6 py-4 ${className ?? ''}`}>
      {children}
    </div>
  );
};

export default CardHeader;
