import React from 'react';

const TransactionStepper = ({ steps = [], currentStep = 0, className = '' }) => {
  if (!Array.isArray(steps) || steps.length === 0) return null;

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 ${className}`}>
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          const markerClass = isDone
            ? 'bg-emerald-500 text-white border-emerald-500'
            : isActive
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600';
          const titleClass = isActive
            ? 'text-blue-700 dark:text-blue-300'
            : isDone
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-slate-700 dark:text-slate-300';

          return (
            <li key={step.key || step.label || index} className="flex items-start gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${markerClass}`}>
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${titleClass}`}>{step.label || `Step ${index + 1}`}</p>
                {step.hint ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{step.hint}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default TransactionStepper;
