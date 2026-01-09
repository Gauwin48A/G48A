// src/components/ui/card-title.jsx
import React from "react";

import { useTranslation } from 'react-i18next';

const CardTitle = ({ children }) => {
  const { t } = useTranslation();
  return <h2 className="text-xl font-semibold text-gray-900">{children}</h2>;
};

export default CardTitle;
