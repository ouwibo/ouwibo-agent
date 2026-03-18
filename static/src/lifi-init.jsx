import React from 'react';
import { createRoot } from 'react-dom/client';
import { LiFiWidget } from '@lifi/widget';

const widgetConfig = {
  theme: {
    container: {
      border: '1px solid rgb(234, 234, 234)',
      borderRadius: '16px',
    },
  },
};

export const renderLiFiWidget = (containerId) => {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id ${containerId} not found`);
    return;
  }
  const root = createRoot(container);
  root.render(
    React.createElement(LiFiWidget, {
      integrator: "Ouwibo Agent",
      config: widgetConfig
    })
  );
};
