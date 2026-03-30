// card-description.jsx
import React from "react";

import { useTranslation } from 'react-i18next';

const CardDescription = ({ children, className = "" }) => {
  const { t } = useTranslation();
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
};

export default CardDescription;
