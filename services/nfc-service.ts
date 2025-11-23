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
  // Declare variables outside try block so they're accessible in catch
  let ndef: any = null;
  let technology = NfcTech.Ndef;
  let tag: any = null;
  
  try {
    if (!NfcManager || !NfcTech || typeof NfcManager.requestTechnology !== 'function') {
      onError('NFC Manager not available - requires native build');
      return;
    }

    // Try Ndef first, fallback to IsoDep if needed
    
    console.log('🔍 [NFC] Starting NFC read - trying Ndef technology...');
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      console.log('✅ [NFC] Ndef technology requested successfully');
      tag = await NfcManager.getTag();
      console.log('📱 [NFC] Tag detected:', JSON.stringify(tag, null, 2));
      ndef = await NfcManager.getNdefMessage();
      console.log('📨 [NFC] NDEF message received via Ndef:', JSON.stringify(ndef, null, 2));
    } catch (ndefError) {
      console.log('⚠️ [NFC] Ndef failed:', ndefError instanceof Error ? ndefError.message : String(ndefError));
      // If Ndef fails, try IsoDep (for HCE Type 4 tags)
      try {
        if (NfcManager.cancelTechnologyRequest) {
          await NfcManager.cancelTechnologyRequest();
        }
        console.log('🔍 [NFC] Trying IsoDep technology...');
        await NfcManager.requestTechnology(NfcTech.IsoDep);
        console.log('✅ [NFC] IsoDep technology requested successfully');
        tag = await NfcManager.getTag();
        console.log('📱 [NFC] Tag detected via IsoDep:', JSON.stringify(tag, null, 2));
        ndef = await NfcManager.getNdefMessage();
        technology = NfcTech.IsoDep;
        console.log('📨 [NFC] NDEF message received via IsoDep:', JSON.stringify(ndef, null, 2));
      } catch (isoDepError) {
        console.log('⚠️ [NFC] IsoDep failed:', isoDepError instanceof Error ? isoDepError.message : String(isoDepError));
        // If both fail, try NfcA
        try {
          if (NfcManager.cancelTechnologyRequest) {
            await NfcManager.cancelTechnologyRequest();
          }
          console.log('🔍 [NFC] Trying NfcA technology...');
          await NfcManager.requestTechnology(NfcTech.NfcA);
          console.log('✅ [NFC] NfcA technology requested successfully');
          tag = await NfcManager.getTag();
          console.log('📱 [NFC] Tag detected via NfcA:', JSON.stringify(tag, null, 2));
          ndef = await NfcManager.getNdefMessage();
          technology = NfcTech.NfcA;
          console.log('📨 [NFC] NDEF message received via NfcA:', JSON.stringify(ndef, null, 2));
        } catch (nfcAError) {
          console.error('❌ [NFC] All technologies failed. NfcA error:', nfcAError instanceof Error ? nfcAError.message : String(nfcAError));
          throw new Error('Failed to read NFC tag with any technology');
        }
      }
    }

    console.log(`✅ [NFC] Successfully connected using technology: ${technology}`);
    console.log('📦 [NFC] Raw NDEF object:', JSON.stringify(ndef, null, 2));
    console.log('📦 [NFC] Tag object:', JSON.stringify(tag, null, 2));
    console.log('📦 [NFC] NDEF type:', typeof ndef);
    console.log('📦 [NFC] NDEF is array?', Array.isArray(ndef));
    console.log('📦 [NFC] NDEF keys:', ndef ? Object.keys(ndef) : 'null');
    console.log('📦 [NFC] Tag keys:', tag ? Object.keys(tag) : 'null');

    // Check tag for ndefMessage first (this is where the data actually is!)
    let records: any[] = [];
    const allData: any = { tag, ndef, technology };
    
    // Priority 1: Check tag.ndefMessage (this is where the actual records are!)
    if (tag && tag.ndefMessage && Array.isArray(tag.ndefMessage) && tag.ndefMessage.length > 0) {
      records = tag.ndefMessage;
      console.log(`✅ [NFC] Found ${records.length} record(s) in tag.ndefMessage`);
    }
    
    // If no records found in tag, try NDEF object
    if (records.length === 0 && ndef) {
      // Function to recursively find all arrays in an object
      const findAllArrays = (obj: any, path = '', depth = 0, maxDepth = 5): any[] => {
        if (depth > maxDepth) return [];
        const found: any[] = [];
        
        if (Array.isArray(obj) && obj.length > 0) {
          found.push({ path, array: obj });
        }
        
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
          for (const key in obj) {
            found.push(...findAllArrays(obj[key], path ? `${path}.${key}` : key, depth + 1, maxDepth));
          }
        }
        
        return found;
      };

      // Try EVERY possible way to get records from NDEF
      const arrays = findAllArrays(ndef);
      console.log(`🔍 [NFC] Found ${arrays.length} potential array(s) in NDEF structure`);
      
      for (const { path, array } of arrays) {
        console.log(`   - ${path}: ${array.length} items`);
        if (array.length > 0) {
          // Check if array items look like records
          const firstItem = array[0];
          if (firstItem && typeof firstItem === 'object' && 
              (firstItem.tnf !== undefined || firstItem.type !== undefined || firstItem.payload !== undefined || 
               firstItem.data !== undefined || firstItem.content !== undefined)) {
            records = array;
            console.log(`✅ [NFC] Using array from ${path} as records`);
            break;
          }
        }
      }
      
      // If no records found, try direct properties
      if (records.length === 0) {
        const directPaths = [
          ndef.ndefMessage,
          ndef.records,
          ndef.message,
          ndef.data,
          ndef.content,
          ndef.payload,
        ].filter(Boolean);
        
        for (const item of directPaths) {
          if (Array.isArray(item) && item.length > 0) {
            records = item;
            console.log(`✅ [NFC] Found records in direct path`);
            break;
          } else if (item && typeof item === 'object' && (item.tnf !== undefined || item.payload !== undefined)) {
            records = [item];
            console.log(`✅ [NFC] Found single record in direct path`);
            break;
          }
        }
      }
      
      // Last resort: if ndef itself looks like a record or has data
      if (records.length === 0) {
        if (typeof ndef === 'object' && (ndef.tnf !== undefined || ndef.payload !== undefined || ndef.data !== undefined || ndef.content !== undefined)) {
          records = [ndef];
          console.log('✅ [NFC] Using NDEF object itself as single record');
        } else if (typeof ndef === 'string') {
          // If ndef is just a string, use it directly
          records = [{ payload: ndef, tnf: 1, type: [84] }];
          console.log('✅ [NFC] NDEF is a string, wrapping as record');
        }
      }
    }

    console.log(`📊 [NFC] Total records to process: ${records.length}`);
    
    let receivedData = '';
    let parsedData: ParsedData | undefined;

    // Process ALL records - try to extract data from ANY record, not just text records
    console.log('🔍 [NFC] Processing all records...');
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`\n📝 [NFC] Record ${i + 1}/${records.length}:`, JSON.stringify(record, null, 2));

      // Try to extract text from ANY payload/data/content field
      const payloadSources = [
        record.payload,
        record.data,
        record.content,
        record.text,
        record.value,
        record.message,
      ].filter(Boolean);

      for (const payload of payloadSources) {
        let text = '';
        
        try {
          if (Array.isArray(payload)) {
            // Try multiple decoding strategies
            const payloadArray = new Uint8Array(payload);
            console.log(`   Payload array length: ${payloadArray.length}`);
            console.log(`   Payload bytes: [${Array.from(payloadArray).join(', ')}]`);
            
            // Strategy 1: Standard NDEF text record format
            // Format: [langCodeLength, ...langCode, ...text]
            // First byte (bit 0-5) = language code length
            // Next N bytes = language code (usually "en" = 2 bytes)
            // Remaining bytes = actual text
            if (payloadArray.length > 0) {
              const firstByte = payloadArray[0];
              const langCodeLength = firstByte & 0x3F; // Lower 6 bits
              const textStart = 1 + langCodeLength;
              
              console.log(`   First byte: ${firstByte}, Lang code length: ${langCodeLength}, Text starts at: ${textStart}`);
              
              if (textStart < payloadArray.length) {
                const textBytes = payloadArray.slice(textStart);
                console.log(`   Text bytes: [${Array.from(textBytes).join(', ')}]`);
                try {
                  text = new TextDecoder('utf-8', { fatal: false }).decode(textBytes);
                  if (text && text.trim().length > 0) {
                    console.log(`   ✅ Decoded (NDEF standard): "${text}"`);
                  }
                } catch (e) {
                  console.log(`   ⚠️ UTF-8 decode failed, trying ASCII:`, e);
                  // Fallback to ASCII
                  text = String.fromCharCode(...Array.from(textBytes));
                  console.log(`   ✅ Decoded (ASCII fallback): "${text}"`);
                }
              } else {
                console.log(`   ⚠️ Text start (${textStart}) >= payload length (${payloadArray.length})`);
              }
            }
            
            // Strategy 2: Direct decode if first strategy failed or produced empty result
            if (!text || text.trim().length === 0) {
              try {
                text = new TextDecoder('utf-8', { fatal: false }).decode(payloadArray);
                if (text && text.trim().length > 0) {
                  console.log(`   ✅ Decoded (direct UTF-8): "${text}"`);
                }
              } catch (e) {
                console.log(`   ⚠️ Direct UTF-8 failed, trying ASCII:`, e);
                // Try as ASCII
                try {
                  text = String.fromCharCode(...Array.from(payloadArray));
                  if (text && text.trim().length > 0) {
                    console.log(`   ✅ Decoded (direct ASCII): "${text}"`);
                  }
                } catch (asciiError) {
                  console.log(`   ⚠️ ASCII decode also failed:`, asciiError);
                }
              }
            }
            
            // Strategy 3: Try from byte 1 if byte 0 is just a length indicator
            if ((!text || text.trim().length === 0) && payloadArray.length > 1) {
              try {
                const textBytes = payloadArray.slice(1);
                text = new TextDecoder('utf-8', { fatal: false }).decode(textBytes);
                if (text && text.trim().length > 0) {
                  console.log(`   ✅ Decoded (skip first byte): "${text}"`);
                }
              } catch (e) {
                console.log(`   ⚠️ Skip first byte decode failed:`, e);
              }
            }
          } else if (typeof payload === 'string') {
            text = payload;
            console.log(`   ✅ Text from string: "${text}"`);
          } else if (typeof payload === 'object' && payload !== null) {
            // Try to stringify and parse
            try {
              text = JSON.stringify(payload);
              console.log(`   ✅ Text from object stringify: "${text}"`);
            } catch (e) {
              console.log(`   ⚠️ Stringify failed:`, e);
            }
          }
        } catch (e) {
          console.log(`   ⚠️ Error extracting from payload:`, e);
        }

        if (text && text.trim()) {
          const trimmedText = text.trim();
          console.log(`   📝 Extracted text: "${trimmedText}"`);
          
          // Try JSON first
          try {
            const jsonData = JSON.parse(trimmedText) as AddressData;
            if (jsonData.address && jsonData.address.startsWith('0x')) {
              receivedData = jsonData.address;
              parsedData = {
                data: jsonData.address,
                address: jsonData.address,
                desiredToken: jsonData.desiredToken,
                desiredTokenAddress: jsonData.desiredTokenAddress,
                timestamp: jsonData.timestamp,
              };
              console.log(`   ✅ Using JSON data:`, parsedData);
              break;
            }
          } catch (e) {
            // Not JSON, use as plain text
            receivedData = trimmedText;
            parsedData = { data: receivedData };
            console.log(`   ✅ Using plain text: "${receivedData}"`);
            break;
          }
        }
      }
      
      if (receivedData) break;
    }

    // Clean up NFC
    if (NfcManager && typeof NfcManager.cancelTechnologyRequest === 'function') {
      await NfcManager.cancelTechnologyRequest();
    }

    if (!receivedData) {
      const errorMsg = `No valid data found. Records: ${records.length}, NDEF: ${JSON.stringify(ndef, null, 2)}, Tag: ${JSON.stringify(tag, null, 2)}`;
      console.error(`❌ [NFC] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✅ [NFC] Successfully received: "${receivedData}"`);
    onDataReceived(receivedData, parsedData);
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      tag: tag ? JSON.stringify(tag, null, 2) : 'null',
      ndef: ndef ? JSON.stringify(ndef, null, 2) : 'null',
      technology,
      timestamp: new Date().toISOString(),
    };
    const fullError = `NFC Error: ${errorDetails.error}\n\nTag:\n${errorDetails.tag}\n\nNDEF:\n${errorDetails.ndef}\n\nTechnology: ${errorDetails.technology}\n\nTime: ${errorDetails.timestamp}`;
    console.error('❌ [NFC] Full error details:', fullError);
    onError(fullError);
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

