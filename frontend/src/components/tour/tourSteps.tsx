import React from 'react';

export interface TourStep {
  selector: string;
  content: React.ReactNode | string;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  navigate?: string;
  action?: (node: Element) => void;
  stepInteraction?: boolean;
}

export const tourSteps: Record<'onboarding' | 'dashboard' | 'buckets', TourStep[]> = {
  onboarding: [
    {
      selector: '[data-tour="welcome"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Welcome to Expendi! 🎉</h3>
          <p>Let&apos;s take a quick tour to get you started with managing your budget effectively.</p>
        </div>
      ),
      position: 'center',
    },
    {
      selector: '[data-tour="wallet-connect"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p>First, connect your wallet to access all the features. Click here to get started.</p>
        </div>
      ),
      position: 'bottom',
    },
    {
      selector: '[data-tour="dashboard-overview"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Your Dashboard</h3>
          <p>This is your main dashboard where you can see your budget overview, recent transactions, and quick actions.</p>
        </div>
      ),
      position: 'bottom',
    },
    {
      selector: '[data-tour="create-account"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Create Budget Account</h3>
          <p>Create your first budget account to start organizing your finances into different categories.</p>
        </div>
      ),
      position: 'left',
    },
    {
      selector: '[data-tour="navigation"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Navigation Menu</h3>
          <p>Use this sidebar to navigate between different sections of your budget management app.</p>
        </div>
      ),
      position: 'right',
    }
  ],

  dashboard: [
    {
      selector: '[data-tour="balance-overview"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Balance Overview</h3>
          <p>Here you can see your total balance and allocated funds across all your budget accounts.</p>
        </div>
      ),
      position: 'bottom',
    },
    {
      selector: '[data-tour="quick-actions"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <p>Use these buttons for common actions like creating new buckets or making quick transactions.</p>
        </div>
      ),
      position: 'top',
    },
    {
      selector: '[data-tour="recent-transactions"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
          <p>View your most recent spending activities and transaction history here.</p>
        </div>
      ),
      position: 'top',
    },
    {
      selector: '[data-tour="spending-chart"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Spending Analytics</h3>
          <p>Visual charts help you understand your spending patterns and budget utilization.</p>
        </div>
      ),
      position: 'left',
    }
  ],

  buckets: [
    {
      selector: '[data-tour="buckets-grid"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Budget Buckets</h3>
          <p>These are your budget buckets - each represents a different spending category or goal.</p>
        </div>
      ),
      position: 'top',
    },
    {
      selector: '[data-tour="create-bucket"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Create New Bucket</h3>
          <p>Click here to create a new budget bucket for different spending categories like groceries, entertainment, or savings goals.</p>
        </div>
      ),
      position: 'bottom',
    },
    {
      selector: '[data-tour="fund-bucket"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Fund Your Buckets</h3>
          <p>Add money to your buckets to allocate your budget across different spending categories.</p>
        </div>
      ),
      position: 'left',
    },
    {
      selector: '[data-tour="spend-from-bucket"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Spend from Buckets</h3>
          <p>When you make purchases, you can spend directly from specific buckets to track your category-wise spending.</p>
        </div>
      ),
      position: 'left',
    },
    {
      selector: '[data-tour="bucket-analytics"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Bucket Analytics</h3>
          <p>Monitor how much you&apos;ve spent from each bucket and track your progress toward your budget goals.</p>
        </div>
      ),
      position: 'top',
    }
  ]
};

// Helper function to check if a tour step element exists on the page
export const isStepElementVisible = (selector: string): boolean => {
  if (typeof window === 'undefined') return false;
  const element = document.querySelector(selector);
  return !!element;
};

// Helper function to wait for an element to appear
export const waitForElement = (selector: string, timeout = 5000): Promise<Element> => {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};