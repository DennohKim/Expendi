// Console warning filters for development
// This suppresses known React 19 compatibility warnings from third-party libraries like Privy

let isFilterActive = false;
let originalError: typeof console.error;
let originalWarn: typeof console.warn;

export function setupConsoleFilters() {
  if (typeof window === 'undefined' || isFilterActive) return;
  
  // Only apply in development mode
  if (process.env.NODE_ENV !== 'development') return;

  originalError = console.error;
  originalWarn = console.warn;

  // Known warning patterns to suppress (specifically for Privy React 19 compatibility)
  const suppressPatterns = [
    /React does not recognize the `hideAnimations` prop on a DOM element/,
    /React does not recognize the `centered` prop on a DOM element/,
    /Received `true` for a non-boolean attribute `centered`/,
    /Received `true` for a non-boolean attribute `hideAnimations`/,
    /Warning: React does not recognize the `hideAnimations` prop/,
    /Warning: React does not recognize the `centered` prop/,
    // Add more specific Privy patterns as needed
  ];

  console.error = (...args: unknown[]) => {
    const message = args.join(' ');
    
    // Check if this is a Privy-related React 19 warning we want to suppress
    const isPrivyWarning = suppressPatterns.some(pattern => pattern.test(message));
    const isFromPrivy = message.includes('@privy-io') || 
                       message.includes('privy-provider') ||
                       message.includes('styled-components') && message.includes('button');
    
    if (!(isPrivyWarning && isFromPrivy)) {
      originalError.apply(console, args);
    } else {
      // Optionally log a simplified message for debugging
      // console.log('Suppressed Privy React 19 compatibility warning');
    }
  };

  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');
    
    // Check if this is a Privy-related React 19 warning we want to suppress
    const isPrivyWarning = suppressPatterns.some(pattern => pattern.test(message));
    const isFromPrivy = message.includes('@privy-io') || 
                       message.includes('privy-provider');
    
    if (!(isPrivyWarning && isFromPrivy)) {
      originalWarn.apply(console, args);
    }
  };

  isFilterActive = true;
  console.log('Console filters activated for Privy React 19 compatibility warnings');
}

export function restoreConsole() {
  // This would restore original console methods if needed
  // Implementation depends on requirements
}