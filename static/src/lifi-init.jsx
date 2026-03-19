import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiFiWidget } from '@lifi/widget';

export const renderLiFiWidget = (containerId, externalConfig) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id ${containerId} not found`);
    return;
  }

  // Merge external config with Ouwibo defaults
  const mergedConfig = {
    integrator: 'Ouwibo Agent',
    ...externalConfig,
    theme: {
      ...((externalConfig && externalConfig.theme) || {}),
      container: {
        border: '1px solid var(--border)',
        borderRadius: '16px',
        maxWidth: '100%',
        background: 'transparent', // Default to transparent for better UI integration
        ...((externalConfig && externalConfig.theme && externalConfig.theme.container) || {}),
      },
    },
    appearance: (externalConfig && externalConfig.appearance) || 'auto',
    variant: 'compact', // Compact variant usually blends better
  };

  const root = createRoot(container);
  root.render(
    React.createElement(LiFiWidget, {
      config: mergedConfig,
      integrator: "Ouwibo Agent"
    })
  );
};
