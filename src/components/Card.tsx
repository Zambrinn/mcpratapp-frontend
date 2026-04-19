import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
  const bgColor = {
    error: 'bg-red-50 border-red-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  const textColor = {
    error: 'text-red-800',
    success: 'text-green-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  };

  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${bgColor[type]}`}>
      <div className="flex justify-between items-start">
        <p className={`${textColor[type]} text-sm font-medium`}>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
