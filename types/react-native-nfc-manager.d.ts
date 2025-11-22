declare module 'react-native-nfc-manager' {
  export interface NfcTech {
    Ndef: string;
    NfcA: string;
    NfcB: string;
    NfcF: string;
    NfcV: string;
    IsoDep: string;
    Mifare: string;
  }

  export interface NdefRecord {
    tnf: number;
    type: number[];
    id: number[];
    payload: number[];
  }

  export interface NdefMessage {
    ndefMessage: NdefRecord[];
  }

  export interface Tag {
    id: number[];
    techTypes: string[];
  }

  export interface NfcManager {
    start(): Promise<void>;
    stop(): Promise<void>;
    isSupported(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    goToNfcSetting(): Promise<void>;
    getLaunchTagEvent(): Promise<Tag | null>;
    setEventListener(event: string, listener: (tag: Tag) => void): void;
    requestTechnology(tech: string): Promise<void>;
    cancelTechnologyRequest(): Promise<void>;
    getTag(): Promise<Tag>;
    getNdefMessage(): Promise<NdefMessage>;
    writeNdefMessage(bytes: number[]): Promise<void>;
    connect(): Promise<void>;
    close(): Promise<void>;
    unregisterTagEvent(): void;
  }

  const NfcManager: NfcManager;
  const NfcTech: NfcTech;

  export default NfcManager;
  export { NfcTech };
}

