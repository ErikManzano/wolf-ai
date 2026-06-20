import { useCallback, useMemo, useState } from 'react';
import type { PraxiogramListItem, PraxiogramRecord } from '../../models/praxiogram';
import {
  createPraxiogramRecord,
  deletePraxiogramRecord,
  duplicatePraxiogramRecord,
  getPraxiogramRecord,
  listPraxiogramItems,
  loadPraxiogramRecords,
  updatePraxiogramRecord,
} from '../../services/praxiogram/praxiogramRegistry';

export function usePraxiogramRegistry() {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  const items = useMemo(() => {
    void version;
    return listPraxiogramItems();
  }, [version]);

  const getRecord = useCallback(
    (id: string) => {
      void version;
      return getPraxiogramRecord(id);
    },
    [version],
  );

  const create = useCallback(
    (input: Parameters<typeof createPraxiogramRecord>[0]) => {
      const created = createPraxiogramRecord(input);
      refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    (id: string, patch: Parameters<typeof updatePraxiogramRecord>[1]) => {
      const updated = updatePraxiogramRecord(id, patch);
      refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      const ok = deletePraxiogramRecord(id);
      refresh();
      return ok;
    },
    [refresh],
  );

  const duplicate = useCallback(
    (id: string) => {
      const copy = duplicatePraxiogramRecord(id);
      refresh();
      return copy;
    },
    [refresh],
  );

  const allRecords = useMemo(() => {
    void version;
    return loadPraxiogramRecords();
  }, [version]);

  return {
    items,
    allRecords,
    getRecord,
    create,
    update,
    remove,
    duplicate,
    refresh,
  };
}

export type { PraxiogramListItem, PraxiogramRecord };
