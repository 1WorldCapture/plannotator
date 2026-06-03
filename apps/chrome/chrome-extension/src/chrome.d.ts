declare const chrome: {
  runtime: {
    getURL(path: string): string;
    sendNativeMessage(hostName: string, message: unknown, callback: (response?: unknown) => void): void;
    sendMessage(message: unknown, callback?: (response?: unknown) => void): void;
    connectNative(hostName: string): {
      postMessage(message: unknown): void;
      disconnect(): void;
      onMessage: {
        addListener(callback: (message: unknown) => void): void;
      };
      onDisconnect: {
        addListener(callback: () => void): void;
      };
    };
    onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void,
        ) => boolean | void,
      ): void;
    };
    lastError?: { message?: string };
  };
  offscreen?: {
    createDocument(options: {
      url: string;
      reasons: Array<"CLIPBOARD">;
      justification: string;
    }): Promise<void>;
    hasDocument?(): Promise<boolean>;
  };
  tabs: {
    query(
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Array<{ id?: number; url?: string; title?: string; windowId?: number; index?: number }>) => void,
    ): void;
    create(
      createProperties: { url: string; active?: boolean; windowId?: number; index?: number },
      callback?: (tab?: { id?: number }) => void,
    ): void;
  };
};
