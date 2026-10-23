/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ConvoraProvider, useConvora } from './context/ConvoraContext';
import { AuthScreens } from './features/auth/AuthScreens';
import { AppShell } from './components/layout/AppShell';
import { UnifiedInboxView } from './features/inbox/UnifiedInboxView';
import { DashboardView } from './features/dashboard/DashboardView';
import {
  AIAssistantView,
  AISettingsView,
} from './features/ai/AIAssistantAndSettingsView';
import {
  OrdersView,
  ProductsView,
} from './features/catalog/ProductsAndOrdersView';
import {
  CustomersView,
  LeadsView,
} from './features/crm/CustomersAndLeadsView';
import {
  AnalyticsView,
  AutomationsView,
  ChannelsView,
  SettingsView,
} from './features/operations/ChannelsAutomationsAnalyticsSettings';

function ConvoraRouter() {
  const { route } = useConvora();

  if (
    route === '/login' ||
    route === '/signup' ||
    route === '/forgot-password' ||
    route === '/verify-email'
  ) {
    return <AuthScreens />;
  }

  return (
    <AppShell>
      {route === '/app/inbox' && <UnifiedInboxView />}
      {route === '/app/dashboard' && <DashboardView />}
      {route === '/app/ai-assistant' && <AIAssistantView />}
      {route === '/app/ai-settings' && <AISettingsView />}
      {route === '/app/products' && <ProductsView />}
      {route === '/app/orders' && <OrdersView />}
      {route === '/app/customers' && <CustomersView />}
      {route === '/app/leads' && <LeadsView />}
      {route === '/app/automations' && <AutomationsView />}
      {route === '/app/channels' && <ChannelsView />}
      {route === '/app/analytics' && <AnalyticsView />}
      {route === '/app/settings' && <SettingsView />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ConvoraProvider>
      <ConvoraRouter />
    </ConvoraProvider>
  );
}
