package com.patio.game;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.patio.game.plugins.PhotoSaverPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhotoSaverPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
