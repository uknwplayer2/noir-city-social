import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all([
  ["gradle", "android/app/build.gradle"],
  ["game", "src/components/patio/Game.tsx"],
  ["homeScreen", "src/components/patio/HomeScreen.tsx"],
  ["splashActivity", "android/app/src/main/java/com/patio/game/SplashActivity.java"],
  ["launchTheme", "android/app/src/main/res/values/styles.xml"],
  ["manifest", "android/app/src/main/AndroidManifest.xml"],
  ["panels", "src/components/patio/Panels.tsx"],
  ["roomView", "src/components/patio/RoomView.tsx"],
  ["phone", "src/components/patio/PhoneModal.tsx"],
  ["photoSaver", "src/game/photoSaver.ts"],
  ["admin", "src/components/patio/AdminConsole.tsx"],
  ["nativeSaver", "android/app/src/main/java/com/patio/game/plugins/PhotoSaverPlugin.java"],
  ["types", "src/game/types.ts"],
  ["logic", "src/game/logic.ts"],
  ["store", "src/game/store.ts"],
  ["buildScript", "scripts/build-android.mjs"],
].map(async ([key, path]) => [key, await readFile(path, "utf8")])));

const checks = [
  ["Android package version is 1.43 / code 45", /versionCode\s+45/.test(files.gradle) && /versionName\s+"1\.43"/.test(files.gradle) && files.game.includes("v1.43") && files.homeScreen.includes("v1.43")],
  ["native splash has no title bar, creates its view before hiding system bars, fades UKNWLAB in 1.5 seconds, fills a 3-second progress bar, then opens the game", files.manifest.includes('android:name=".SplashActivity"') && files.manifest.includes('android:name="android.intent.action.MAIN"') && files.splashActivity.includes("requestWindowFeature(Window.FEATURE_NO_TITLE)") && files.splashActivity.indexOf("requestWindowFeature(Window.FEATURE_NO_TITLE)") < files.splashActivity.indexOf("setContentView(splash)") && files.launchTheme.includes('<item name="windowActionBar">false</item>') && files.launchTheme.includes('<item name="windowNoTitle">true</item>') && files.splashActivity.includes("SPLASH_DURATION_MS = 3_000L") && files.splashActivity.includes("TITLE_FADE_MS = 1_500L") && files.splashActivity.includes("progressAnimator.setDuration(SPLASH_DURATION_MS)") && files.splashActivity.includes("R.drawable.uknwlab_splash") && files.splashActivity.includes("R.raw.noir_startup_8bit") && files.splashActivity.includes("WindowCompat.getInsetsController") && files.splashActivity.includes("UKNWLAB") && files.splashActivity.includes("APRESENTA") && files.splashActivity.indexOf("setContentView(splash)") < files.splashActivity.indexOf("enterImmersiveMode()") && !files.splashActivity.includes("window.getInsetsController()") && files.launchTheme.includes("windowSplashScreenBackground")],
  ["startup keeps the old login flow without pretending online authentication exists", files.homeScreen.includes('useState<HomePanel>("login")') && files.homeScreen.includes("onEnter(safeName)") && files.homeScreen.includes("setPassword(\"\")") && files.homeScreen.includes("a senha não é enviada nem validada")],
  ["previous saves v1 and v2 remain migratable", files.types.includes("SAVE_VERSION = 3") && /\[1,\s*2,\s*SAVE_VERSION\]/.test(files.logic)],
  ["admin catalog stays separate and role gated", files.game.includes('toggle("adminShop")') && files.panels.includes('which === "adminShop"') && files.store.includes('s.role !== "admin"')],
  ["admin console command remains available", /message\.toLowerCase\(\) === ":console"/.test(files.game) && files.admin.includes("Console Godmode")],
  ["camera capture saves to the device photo gallery", files.roomView.includes('toDataURL("image/png")') && files.photoSaver.includes('registerPlugin<PhotoSaverPlugin>("PhotoSaver")') && files.nativeSaver.includes("MediaStore.Images.Media.RELATIVE_PATH")],
  ["community publishing stays unavailable", files.phone.includes("Publicar na comunidade · em breve")],
  ["pinch zoom follows its touch point, zoom controls stay anchored to the avatar, and the lower panel remains draggable", files.roomView.includes("function zoomAt") && files.roomView.includes("center);") && files.roomView.includes("function avatarScreenPoint()") && files.roomView.includes("zoomAt(factor, avatarScreenPoint())") && files.roomView.includes("zoomAt(by, avatarScreenPoint())") && files.game.includes("beginPanelDrag") && files.game.includes("movePanelDrag")],
  ["Android build reuses the restored local toolchain, cleans stale packaging state, and preserves a versioned APK artifact", files.buildScript.includes("android-toolchain") && files.buildScript.includes("gradle-8.14.3/bin/gradle") && files.buildScript.includes('["clean", "assembleDebug"]') && files.buildScript.includes("NOIR-${versionName}.apk") && files.buildScript.includes("createHash(\"sha256\")")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "OK" : "FALHOU"} · ${name}`);
if (failed.length) process.exitCode = 1;
