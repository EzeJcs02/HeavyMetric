import { AlertCircle, TrendingDown, AlertTriangle, Info, Zap, PackageOpen, Wrench, ShieldAlert } from 'lucide-react';

/**
 * SilentBadge - A subtle, non-intrusive badge to indicate AI findings.
 * 
 * @param {string} type - 'risk', 'warning', 'info', 'critical', 'optimization', 'anomaly'
 * @param {string} message - A short message or reason for the badge
 * @param {boolean} iconOnly - If true, only shows the icon and hides the text, using text as tooltip
 */
export function SilentBadge({ type = 'info', message, iconOnly = false }) {
  const styles = {
    risk: {
      container: 'bg-red-50 text-red-700 border border-red-200/50',
      icon: <ShieldAlert className="w-4 h-4 text-red-600" />,
    },
    warning: {
      container: 'bg-amber-50 text-amber-700 border border-amber-200/50',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    },
    critical: {
      container: 'bg-rose-50 text-rose-700 border border-rose-200/50 animate-pulse',
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    },
    info: {
      container: 'bg-blue-50 text-blue-700 border border-blue-200/50',
      icon: <Info className="w-4 h-4 text-blue-600" />,
    },
    optimization: {
      container: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
      icon: <Zap className="w-4 h-4 text-emerald-600" />,
    },
    anomaly: {
      container: 'bg-purple-50 text-purple-700 border border-purple-200/50',
      icon: <TrendingDown className="w-4 h-4 text-purple-600" />,
    },
    stock: {
      container: 'bg-indigo-50 text-indigo-700 border border-indigo-200/50',
      icon: <PackageOpen className="w-4 h-4 text-indigo-600" />,
    },
    maintenance: {
      container: 'bg-orange-50 text-orange-700 border border-orange-200/50',
      icon: <Wrench className="w-4 h-4 text-orange-600" />,
    }
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm cursor-help transition-all duration-300 hover:shadow-md ${currentStyle.container}`}
      title={message} // Native tooltip for simplicity
    >
      {currentStyle.icon}
      {!iconOnly && <span>{message}</span>}
    </div>
  );
}
