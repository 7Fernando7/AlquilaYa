/**
 * Elegant Input component with modern styling
 */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-white mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <div className="absolute left-4 top-3.5 text-gray-400">{icon}</div>}
        <input
          id={inputId}
          className={`
            w-full px-4 py-3 border border-white/20 rounded-xl
            text-white placeholder-gray-400 text-base
            bg-white/5 hover:bg-white/10 backdrop-blur-sm
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white/10
            transition-all duration-200
            ${icon ? 'pl-12' : ''}
            ${error ? 'border-red-500/50 focus:ring-red-500 bg-red-500/10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 14.586l-6.687-6.687a1 1 0 00-1.414 1.414l8.1 8.1a1 1 0 001.414 0l10.1-10.1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && <p className="mt-2 text-sm text-gray-400">{helperText}</p>}
    </div>
  );
}
