/**
 * Elegant Button component with modern styling
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl focus:ring-primary-500 hover:scale-[1.02]',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 border border-gray-200',
    tertiary: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-400',
    danger: 'bg-gradient-to-r from-danger-500 to-danger-600 text-white hover:from-danger-600 hover:to-danger-700 shadow-lg hover:shadow-xl focus:ring-danger-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-2',
    md: 'px-6 py-2.5 text-base gap-2',
    lg: 'px-8 py-3.5 text-lg gap-3',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className} inline-flex items-center justify-center`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Cargando...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
