import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Loader2, Lock, SearchX } from 'lucide-react';

export const PageLoadingState = ({
  title = 'Loading...',
  description = 'Please wait while we load this page.',
  className = '',
  marker = 'loading'
}) => (
  <Card className={className} data-ux-state={marker}>
    <CardContent className="py-10 text-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
      <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </CardContent>
  </Card>
);

export const PageErrorState = ({
  title = 'Something went wrong',
  description = 'Please try again.',
  onRetry,
  retryLabel = 'Retry',
  secondaryAction,
  className = '',
  marker = 'error'
}) => (
  <Card className={className} data-ux-state={marker}>
    <CardContent className="py-10 text-center">
      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
      <p className="font-semibold text-red-800 dark:text-red-300">{title}</p>
      <p className="text-sm text-red-700 dark:text-red-400 mt-1 mb-5">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button data-ux-action="state_retry" onClick={onRetry} className="bg-red-600 hover:bg-red-700 text-white">
            {retryLabel}
          </Button>
        )}
        {secondaryAction}
      </div>
    </CardContent>
  </Card>
);

export const PageEmptyState = ({
  title = 'Nothing here yet',
  description = 'Try a different action.',
  icon: Icon = SearchX,
  action,
  className = '',
  marker = 'empty'
}) => (
  <Card className={className} data-ux-state={marker}>
    <CardContent className="py-10 text-center">
      <Icon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">{description}</p>
      {action}
    </CardContent>
  </Card>
);

export const PageAuthGateState = ({
  title = 'Login required',
  description = 'Please log in to continue.',
  primaryAction,
  secondaryAction,
  className = '',
  marker = 'auth-gate'
}) => (
  <Card className={className} data-ux-state={marker}>
    <CardContent className="py-10 text-center">
      <Lock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
      <p className="font-semibold text-gray-800 dark:text-gray-100">{title}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {primaryAction}
        {secondaryAction}
      </div>
    </CardContent>
  </Card>
);

