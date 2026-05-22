import React from 'react';
import { Lightbulb, ChevronRight, X } from 'lucide-react';

/**
 * AISuggestionBox - A contextual suggestion box for AI-driven actions
 * 
 * @param {string} title - The title of the suggestion
 * @param {string} description - Detailed reason
 * @param {string} actionText - Text for the primary action button
 * @param {function} onAction - Callback when action is clicked
 * @param {function} onDismiss - Callback to hide the suggestion
 */
export function AISuggestionBox({ title, description, actionText, onAction, onDismiss }) {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white p-4 shadow-sm transition-all duration-300 hover:shadow-md mt-4 mb-4">
      <div className="absolute top-0 right-0 p-2">
        <button 
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 bg-indigo-100 p-2 rounded-lg">
          <Lightbulb className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            IA Silenciosa: {title}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {description}
          </p>
          {actionText && (
            <div className="mt-3">
              <button
                onClick={onAction}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {actionText}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-100 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
    </div>
  );
}
