package com.patio.game.plugins;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "PhotoSaver")
public class PhotoSaverPlugin extends Plugin {
    @PluginMethod
    public void savePng(PluginCall call) {
        String base64 = call.getString("base64");
        String filename = call.getString("filename");
        if (base64 == null || filename == null || !filename.matches("[A-Za-z0-9._-]+\\.png")) {
            call.reject("Dados da captura inválidos.");
            return;
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64, Base64.DEFAULT);
        } catch (IllegalArgumentException error) {
            call.reject("A captura não contém uma imagem PNG válida.", error);
            return;
        }

        try {
            Uri uri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Noir City");
                uri = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IllegalStateException("Não foi possível criar o arquivo da foto.");
                try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
                    if (output == null) throw new IllegalStateException("Não foi possível abrir o arquivo da foto.");
                    output.write(bytes);
                }
            } else {
                File pictures = getContext().getExternalFilesDir(Environment.DIRECTORY_PICTURES);
                if (pictures == null) throw new IllegalStateException("Armazenamento de fotos indisponível.");
                File directory = new File(pictures, "Noir City");
                if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Não foi possível criar a pasta de fotos.");
                File file = new File(directory, filename);
                try (FileOutputStream output = new FileOutputStream(file)) { output.write(bytes); }
                uri = Uri.fromFile(file);
            }
            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Falha ao salvar a captura no aparelho.", error);
        }
    }
}
