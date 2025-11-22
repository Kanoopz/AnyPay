const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withHCEResources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidProjectPath = path.join(projectRoot, 'android');
      
      // Only proceed if android directory exists (for prebuild/EAS build)
      if (!fs.existsSync(androidProjectPath)) {
        console.log('⚠️ Android directory not found, skipping HCE resources (will be created during prebuild)');
        return config;
      }

      const resPath = path.join(
        androidProjectPath,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );

      // Create xml directory if it doesn't exist
      if (!fs.existsSync(resPath)) {
        fs.mkdirSync(resPath, { recursive: true });
      }

      const aidListPath = path.join(resPath, 'aid_list.xml');
      const aidListContent = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
                   android:description="@string/app_name"
                   android:requireDeviceUnlock="false">
    <aid-group android:category="other"
               android:description="@string/app_name">
        <aid-filter android:name="D2760000850101" />
    </aid-group>
</host-apdu-service>`;

      // Write aid_list.xml
      fs.writeFileSync(aidListPath, aidListContent, 'utf8');
      console.log('✅ Created aid_list.xml for HCE service');

      return config;
    },
  ]);
};

