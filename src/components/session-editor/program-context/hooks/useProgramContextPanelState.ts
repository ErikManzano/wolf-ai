import { useCallback, useEffect, useState } from 'react';
import {
  PROGRAM_CONTEXT_PANEL_STORAGE_KEY,
  PROGRAM_CONTEXT_TAB_STORAGE_KEY,
  type ProgramContextTabId,
} from '../constants';

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return fallback;
}

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
  const [contextOpen, setContextOpen] = useState(() => readBool(PROGRAM_CONTEXT_PANEL_STORAGE_KEY, true));
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgramContextTabId>(() => readTab(PROGRAM_CONTEXT_TAB_STORAGE_KEY));

  useEffect(() => {
    try {
      localStorage.setItem(PROGRAM_CONTEXT_PANEL_STORAGE_KEY, contextOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [contextOpen]);

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
