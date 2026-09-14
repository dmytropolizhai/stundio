package com.dmytropolizhai.stundio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(ImageSharePlugin.class);
        registerPlugin(StundioWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
