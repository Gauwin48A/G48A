// src/components/ui/card-header.jsx
import React from "react";

const CardHeader = ({ children, className }) => {
  return (
    <div className={`border-b px-6 py-4 ${className ?? ''}`}>
      {children}
    </div>
  );
};

export default CardHeader;
