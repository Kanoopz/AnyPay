const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withHCE(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application) {
      manifest.application = [{}];
    }

    const application = manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    // Check if CardService already exists
    const hasCardService = application.service.some(
      (service) => service.$?.['android:name'] === 'com.reactnativehce.services.CardService'
    );

    if (!hasCardService) {
      // Add the HCE CardService
      application.service.push({
        $: {
          'android:name': 'com.reactnativehce.services.CardService',
          'android:exported': 'true',
          'android:enabled': 'false',
          'android:permission': 'android.permission.BIND_NFC_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.nfc.cardemulation.action.HOST_APDU_SERVICE',
                },
              },
            ],
            category: [
              {
                $: {
                  'android:name': 'android.intent.category.DEFAULT',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.nfc.cardemulation.host_apdu_service',
              'android:resource': '@xml/aid_list',
            },
          },
        ],
      });
    }

    return config;
  });
};

