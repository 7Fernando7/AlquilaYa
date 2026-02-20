/**
 * Form error alert component
 */

interface FormErrorProps {
  message: string | null;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
      <p className="font-medium">Error</p>
      <p className="text-sm">{message}</p>
    </div>
  );
}
