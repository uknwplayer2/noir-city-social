import { Capacitor, registerPlugin } from "@capacitor/core";

type PhotoSaverPlugin = {
  savePng(options: { base64: string; filename: string }): Promise<{ uri: string }>;
};

const PhotoSaver = registerPlugin<PhotoSaverPlugin>("PhotoSaver");

export async function saveGamePhoto(dataUrl: string, filename: string): Promise<string> {
  if (!Capacitor.isNativePlatform()) return "download";
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const result = await PhotoSaver.savePng({ base64, filename });
  return result.uri;
}
