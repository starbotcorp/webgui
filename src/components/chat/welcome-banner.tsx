'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-auto max-w-2xl mb-6 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Welcome to Starbot!</h2>
          <p className="text-slate-700">
            To get started, could you tell me:
          </p>
          <ul className="mt-4 space-y-2 text-slate-700">
            <li className="flex items-start gap-2">
              <span className="font-medium text-slate-900">1.</span>
              <span>What should I call you?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium text-slate-900">2.</span>
              <span>Is there anything specific you'd like help with right now?</span>
            </li>
          </ul>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="shrink-0 text-slate-500 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
