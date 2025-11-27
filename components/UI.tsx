import React, { InputHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  className, 
  type = 'button', // Default to button to prevent form submission
  ...props 
}) => {
  const baseStyles = "rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const variants = {
    primary: "bg-primary text-white hover:bg-slate-800 shadow-md hover:shadow-lg",
    secondary: "bg-accent text-white hover:bg-orange-600 shadow-md",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border-2 border-primary text-primary hover:bg-slate-50"
  };

  return (
    <button 
      type={type}
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ children, title, className }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {title && (
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = "bg-slate-100 text-slate-800" }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {children}
    </span>
);