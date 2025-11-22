import { Platform } from 'react-native';

// Conditional import for react-native-nfc-manager (native module)
let NfcManager: any = null;
let NfcTech: any = null;

try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
} catch (error) {
  console.warn('⚠️ react-native-nfc-manager not available (may require native build):', error);
}

// Conditional import for react-native-hce (native module)
let HCESession: any = null;
let NFCTagType4: any = null;
let NFCTagType4NDEFContentType: any = null;

try {
  const hceModule = require('react-native-hce');
  HCESession = hceModule.HCESession;
  NFCTagType4 = hceModule.NFCTagType4;
  NFCTagType4NDEFContentType = hceModule.NFCTagType4NDEFContentType;
} catch (error) {
  console.warn('⚠️ react-native-hce not available (may require native build):', error);
}

// Re-export for convenience
export type HCESession = typeof HCESession;

/**
 * Initialize NFC support
 */
export const initNFC = async (): Promise<boolean> => {
  // Early return if module not available
  if (!NfcManager) {
    console.warn('⚠️ NFC Manager not available - requires native build');
    return false;
  }

  // Check if methods exist
  if (!NfcManager.isSupported || typeof NfcManager.isSupported !== 'function') {
    console.warn('⚠️ NFC Manager isSupported method not available - requires native build');
    return false;
  }

  if (!NfcManager.start || typeof NfcManager.start !== 'function') {
    console.warn('⚠️ NFC Manager start method not available - requires native build');
    return false;
  }

  try {
    const isSupported = await NfcManager.isSupported();
    
    if (isSupported) {
      await NfcManager.start();
      console.log('✅ NFC initialized successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ NFC initialization failed:', error);
    // Don't throw - just return false to allow app to continue
    return false;
  }
};

/**
 * Initialize HCE support
 */
export const initHCE = async (): Promise<any | null> => {
  try {
    if (!HCESession) {
      console.warn('⚠️ HCE module not available - requires native build');
      return null;
    }
    
    if (Platform.OS === 'android') {
      const hceSession = await HCESession.getInstance();
      console.log('✅ HCE initialized successfully');
      return hceSession;
    }
    console.log('❌ HCE not supported on this platform');
    return null;
  } catch (error) {
    console.error('❌ HCE initialization failed:', error);
    return null;
  }
};

/**
 * Interface for address data structure
 */
export interface AddressData {
  address: string;
  desiredToken?: string;
  desiredTokenAddress?: string;
  timestamp: number;
}

/**
 * Handle Receive (Share String via HCE)
 */
export const handleReceive = async (
  session: any | null,
  dataToShare: string,
  onDataShared: () => void,
  onError: (error: string) => void
): Promise<void> => {
  if (!session) {
    onError('HCE session not available');
    return;
  }

  if (!NFCTagType4 || !NFCTagType4NDEFContentType) {
    onError('HCE module not available - requires native build');
    return;
  }

  if (!dataToShare || dataToShare.trim() === '') {
    onError('No data to share');
    return;
  }

  try {
    // Create NFC Type 4 tag with the data
    const tag = new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: dataToShare,
      writable: false,
    });

    // Set the tag as the application for the HCE session
    session.setApplication(tag);

    // Enable HCE emulation
    await session.setEnabled(true);
    console.log('✅ HCE receive mode enabled');

    // Set up event listener for when the tag is read
    const removeListener = session.on(HCESession.Events.HCE_STATE_READ, () => {
      console.log('📳 DATA SHARED SUCCESSFULLY!');
      onDataShared();
      removeListener();
    });
  } catch (error) {
    console.error('❌ Error starting receive mode:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Stop HCE operation
 */
export const stopHceOperation = async (session: any | null): Promise<void> => {
  try {
    if (session) {
      await session.setEnabled(false);
      console.log('✅ HCE operation stopped');
    }
  } catch (error) {
    console.error('❌ Error stopping HCE:', error);
  }
};

/**
 * Interface for parsed data
 */
export interface ParsedData {
  data: string;
  address?: string;
  desiredToken?: string;
  desiredTokenAddress?: string;
  timestamp?: number;
}

/**
 * Handle Pay (Read String via NFC)
 */
export const handlePay = async (
  onDataReceived: (data: string, parsedData?: ParsedData) => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    if (!NfcManager || !NfcTech || typeof NfcManager.requestTechnology !== 'function') {
      onError('NFC Manager not available - requires native build');
      return;
    }

    // Request NFC technology
    await NfcManager.requestTechnology(NfcTech.Ndef);
    console.log('✅ NFC technology requested');

    // Read the tag
    const tag = await NfcManager.getTag();
    console.log('✅ NFC tag detected:', tag);

    // Get NDEF message
    const ndef = await NfcManager.getNdefMessage();
    console.log('✅ NDEF message retrieved:', ndef);

    if (ndef && ndef.ndefMessage && Array.isArray(ndef.ndefMessage)) {
      const records = ndef.ndefMessage;
      let receivedData = '';
      let parsedData: ParsedData | undefined;

      // Process NDEF records
      for (const record of records) {
        // TNF_WELL_KNOWN = 1, 'T' for text (ASCII 84 = 0x54)
        if (record.tnf === 1 && record.type[0] === 84) {
          const textDecoder = new TextDecoder();
          const payload = new Uint8Array(record.payload);
          const text = textDecoder.decode(payload.slice(3)); // Skip language code

          try {
            // Try to parse as JSON first (structured data)
            const jsonData = JSON.parse(text.trim()) as AddressData;
            
            if (jsonData.address && jsonData.address.startsWith('0x')) {
              receivedData = jsonData.address;
              parsedData = {
                data: jsonData.address,
                address: jsonData.address,
                desiredToken: jsonData.desiredToken,
                desiredTokenAddress: jsonData.desiredTokenAddress,
                timestamp: jsonData.timestamp,
              };
              console.log('📝 Structured data found:', parsedData);
              break;
            }
          } catch (e) {
            // Fallback to plain text
            const plainText = text.trim();
            if (plainText) {
              receivedData = plainText;
              parsedData = {
                data: plainText,
              };
              console.log('📝 Plain text data found:', receivedData);
              break;
            }
          }
        }
      }

      // Clean up NFC
      if (NfcManager && typeof NfcManager.cancelTechnologyRequest === 'function') {
        await NfcManager.cancelTechnologyRequest();
      }

      if (receivedData) {
        onDataReceived(receivedData, parsedData);
      } else {
        throw new Error('No valid data found in NFC tag');
      }
    } else {
      throw new Error('Invalid NDEF message format');
    }
  } catch (error) {
    console.error('❌ Error reading NFC for payment:', error);
    if (NfcManager && typeof NfcManager.cancelTechnologyRequest === 'function') {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
};

/**
 * Stop NFC reading
 */
export const stopNfcReading = async (): Promise<void> => {
  try {
    if (!NfcManager || typeof NfcManager.cancelTechnologyRequest !== 'function') {
      console.warn('⚠️ NFC Manager not available');
      return;
    }
    await NfcManager.cancelTechnologyRequest();
    console.log('✅ NFC reading stopped');
  } catch (error) {
    console.error('❌ Error stopping NFC reading:', error);
  }
};

