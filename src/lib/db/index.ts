import { openStore, type StudioRepository } from "@/lib/db/repository";
import { seedIfEmpty } from "@/lib/seed/examples";

const globalStore = globalThis as unknown as { __cozyStore?: Promise<StudioRepository> };

export function getStore(): Promise<StudioRepository> {
  if (!globalStore.__cozyStore) {
    globalStore.__cozyStore = (async () => {
      const store = openStore();
      await store.migrate();
      await store.ensureRoster();
      await seedIfEmpty(store);
      return store;
    })();
  }
  return globalStore.__cozyStore;
}

export type { StudioRepository };
