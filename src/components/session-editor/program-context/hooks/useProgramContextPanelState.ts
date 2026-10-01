import { useCallback, useEffect, useState } from 'react';
import {
  PROGRAM_CONTEXT_TAB_STORAGE_KEY,
  type ProgramContextTabId,
} from '../constants';

function readTab(key: string): ProgramContextTabId {
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'exercise') return 'day';
    if (
      raw === 'athlete' ||
      raw === 'week' ||
      raw === 'day' ||
      raw === 'history' ||
      raw === 'instances'
    ) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'week';
}

export function useProgramContextPanelState() {
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgramContextTabId>(() => readTab(PROGRAM_CONTEXT_TAB_STORAGE_KEY));

  useEffect(() => {
    try {
      localStorage.setItem(PROGRAM_CONTEXT_TAB_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  const toggleContext = useCallback(() => setContextOpen((v) => !v), []);

  return {
    contextOpen,
    toggleContext,
    mobileContextOpen,
    setMobileContextOpen,
    activeTab,
    setActiveTab,
  };
}
