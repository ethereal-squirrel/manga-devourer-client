import { useEffect } from 'react';

import { useImportQueueStore } from '../store/importQueue';

export function ImportQueueProcessor() {
  const { currentFiles, processing, processQueue } = useImportQueueStore();

  useEffect(() => {
    if (!processing && currentFiles.length > 0) {
      processQueue();
    }
  }, [currentFiles, processing]);

  return null;
}
