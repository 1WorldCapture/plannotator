declare const chrome: {
  runtime: {
    sendNativeMessage(hostName: string, message: unknown, callback: (response?: unknown) => void): void;
    lastError?: { message?: string };
  };
  tabs: {
    query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: Array<{ url?: string; title?: string }>) => void): void;
  };
};
