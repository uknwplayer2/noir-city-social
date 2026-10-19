import { readFile } from "node:fs/promises";

const files = Object.fromEntries(await Promise.all([
  ["gradle", "android/app/build.gradle"],
  ["game", "src/components/patio/Game.tsx"],
  ["homeScreen", "src/components/patio/HomeScreen.tsx"],
  ["team", "src/components/patio/TeamWindow.tsx"],
  ["splashActivity", "android/app/src/main/java/com/patio/game/SplashActivity.java"],
  ["launchTheme", "android/app/src/main/res/values/styles.xml"],
  ["manifest", "android/app/src/main/AndroidManifest.xml"],
  ["panels", "src/components/patio/Panels.tsx"],
  ["catalog", "src/game/catalog.ts"],
  ["audio", "src/game/audio.ts"],
  ["roomView", "src/components/patio/RoomView.tsx"],
  ["phone", "src/components/patio/PhoneModal.tsx"],
  ["photoSaver", "src/game/photoSaver.ts"],
  ["admin", "src/components/patio/AdminConsole.tsx"],
  ["adminAlert", "src/components/patio/AdminAlertWindow.tsx"],
  ["nativeSaver", "android/app/src/main/java/com/patio/game/plugins/PhotoSaverPlugin.java"],
  ["types", "src/game/types.ts"],
  ["logic", "src/game/logic.ts"],
  ["store", "src/game/store.ts"],
  ["buildScript", "scripts/build-android.mjs"],
  ["iso", "src/game/iso.ts"],
  ["workflow", ".github/workflows/android-debug-apk.yml"],
].map(async ([key, path]) => [key, await readFile(path, "utf8")])));

const checks = [
  ["Android package version is 1.48 / code 51", /versionCode\s+51/.test(files.gradle) && /versionName\s+"1\.48"/.test(files.gradle) && files.game.includes("v1.48") && files.homeScreen.includes("v1.48")],
  ["native splash has no title bar, creates its view before hiding system bars, fades UKNWLAB in 1.5 seconds, fills a 3-second progress bar, then opens the game", files.manifest.includes('android:name=".SplashActivity"') && files.manifest.includes('android:name="android.intent.action.MAIN"') && files.splashActivity.includes("requestWindowFeature(Window.FEATURE_NO_TITLE)") && files.splashActivity.indexOf("requestWindowFeature(Window.FEATURE_NO_TITLE)") < files.splashActivity.indexOf("setContentView(splash)") && files.launchTheme.includes('<item name="windowActionBar">false</item>') && files.launchTheme.includes('<item name="windowNoTitle">true</item>') && files.splashActivity.includes("SPLASH_DURATION_MS = 3_000L") && files.splashActivity.includes("TITLE_FADE_MS = 1_500L") && files.splashActivity.includes("progressAnimator.setDuration(SPLASH_DURATION_MS)") && files.splashActivity.includes("R.drawable.uknwlab_splash") && files.splashActivity.includes("R.raw.noir_startup_8bit") && files.splashActivity.includes("WindowCompat.getInsetsController") && files.splashActivity.includes("UKNWLAB") && files.splashActivity.includes("APRESENTA") && files.splashActivity.indexOf("setContentView(splash)") < files.splashActivity.indexOf("enterImmersiveMode()") && !files.splashActivity.includes("window.getInsetsController()") && files.launchTheme.includes("windowSplashScreenBackground")],
  ["login starts with an empty username, returns to home after local login, and logs out to login", files.homeScreen.includes('authenticated && name !== "Visita" ? name : ""') && files.homeScreen.includes("onLogin(safeName, rememberDevice)") && files.homeScreen.includes('authenticated ? null : "login"') && files.homeScreen.includes("onLogout()") && files.game.includes("authenticate(name, remember)") && files.game.includes("logout()")],
  ["remembered local sessions persist while app launch returns to home", files.types.includes("SAVE_VERSION = 5") && /\[1,\s*2,\s*3,\s*4,\s*SAVE_VERSION\]/.test(files.logic) && files.logic.includes("rememberDevice: raw.rememberDevice === true || legacyProfile") && files.store.includes("authenticated: s.rememberDevice && s.authenticated") && files.store.includes("entered: false") && files.game.includes("useGame.persist.rehydrate()")],
  ["admin catalog stays separate and role gated", files.game.includes('toggle("adminShop")') && files.panels.includes('which === "adminShop"') && files.store.includes('s.role !== "admin"')],
  ["admin console command remains available", /message\.toLowerCase\(\) === ":console"/.test(files.game) && files.admin.includes("Console Godmode")],
  ["camera shows a live room preview and saves captures to the device photo gallery", files.roomView.includes('toDataURL("image/png")') && files.roomView.includes("canvas.captureStream(12)") && files.phone.includes("autoPlay muted playsInline") && files.phone.includes("onPreviewStream") && files.photoSaver.includes('registerPlugin<PhotoSaverPlugin>("PhotoSaver")') && files.nativeSaver.includes("MediaStore.Images.Media.RELATIVE_PATH")],
  ["camera fills its preview and supports touch panning of the room view", files.phone.includes("object-cover") && files.phone.includes("beginPreviewDrag") && files.phone.includes("movePreviewDrag") && files.phone.includes("onPan(dx, dy)") && files.game.includes("onPan={panRoom}") && files.roomView.includes("pan: (x, y)")],
  ["radio is reduced to one third and successful purchases use the 8-bit coin sound in the shared store", files.catalog.includes('id: "radio"') && files.catalog.includes("spriteScale: 0.293") && files.audio.includes('kind === "coin" ? "square"') && files.audio.includes("frequency.setValueAtTime(988") && files.panels.includes('blip(ok ? "coin" : "no")')],
  ["camera offers a fresh capture after a successful save", files.phone.includes("photoSaved") && files.phone.includes("Nova foto / reiniciar câmera") && files.phone.includes("function resetCamera()")],
  ["snake food is a pixel crown, swipe controls replace direction buttons, and every two points award two coins", files.phone.includes("function CrownFood()") && files.phone.includes('shapeRendering="crispEdges"') && files.phone.includes("cell === food && <CrownFood />") && files.phone.includes("onTouchStart") && files.phone.includes("onTouchEnd") && !files.phone.includes("function Arrow(") && files.phone.includes("Math.floor(score / 2) * 2") && files.phone.includes("awardMiniGameCoins(2)") && files.store.includes("awardMiniGameCoins")],
  ["community publishing stays unavailable", files.phone.includes("Publicar na comunidade · em breve")],
  ["furniture picking prefers the highest touched vertical intersection and uses draw depth as a tie-breaker", files.iso.includes("function columnHitHeight(") && files.iso.includes("let best: { uid: string; hitHeight: number; depth: number } | null = null") && files.iso.includes("hitHeight > best.hitHeight") && files.iso.includes("hitHeight === best.hitHeight && depth > best.depth")],
  ["home has a team directory with role-gated members, avatar previews, and persistent internal email in the phone inbox", files.homeScreen.includes("Equipe") && files.homeScreen.includes("teamMembers") && files.team.includes("LookThumb") && files.team.includes("Administrador") && files.team.includes("onSendMail") && files.types.includes("internalMail: InternalMail[]") && files.logic.includes("raw.internalMail") && files.store.includes("sendInternalMail") && files.store.includes("markInternalMailRead") && files.store.includes("internalMail: s.internalMail") && files.phone.includes("savedMail.filter") && files.phone.includes("Caixa de entrada")],
  ["phone email inbox uses stable Zustand snapshots", files.phone.includes("const savedMail = useGame((state) => state.internalMail)") && files.phone.includes("useMemo(() => savedMail.filter") && !files.phone.includes("useGame((state) => state.internalMail.filter")],
  ["pinch zoom follows its touch point, zoom controls stay anchored to the avatar, and the avatar can be centered", files.roomView.includes("function zoomAt") && files.roomView.includes("center);") && files.roomView.includes("MAX_USER_SCALE = 3.2") && files.roomView.includes("function avatarScreenPoint()") && files.roomView.includes("function centerAvatar()") && files.roomView.includes("aria-label=\"Centralizar avatar\"") && files.game.includes("beginPanelDrag") && files.game.includes("movePanelDrag")],
  ["admin alerts use a draggable and resizable window instead of chat bubbles", files.admin.includes("onSendAlert(alert.trim())") && files.game.includes("<AdminAlertWindow") && files.adminAlert.includes("cursor-move") && files.adminAlert.includes("resize overflow-auto") && !files.admin.includes('sayAs("Alerta da Administração"')],
  ["Android build reuses the restored local toolchain, cleans stale packaging state, and preserves a versioned APK artifact", files.buildScript.includes("android-toolchain") && files.buildScript.includes("gradle-8.14.3/bin/gradle") && files.buildScript.includes('["clean", "assembleDebug"]') && files.buildScript.includes("NOIR-${versionName}.apk") && files.buildScript.includes("createHash(\"sha256\")")],
  ["GitHub Actions restores the continuity key only outside pull requests and Gradle uses it for debug APKs", files.workflow.includes("github.event_name != 'pull_request'") && files.workflow.includes("secrets.NOIR_KEYSTORE_BASE64") && files.workflow.includes("NOIR_KEYSTORE_PATH=$RUNNER_TEMP/noir-continuity.keystore") && files.workflow.includes("secrets.NOIR_KEYSTORE_PASSWORD") && files.workflow.includes("secrets.NOIR_KEY_ALIAS") && files.workflow.includes("secrets.NOIR_KEY_PASSWORD") && files.gradle.includes('System.getenv("NOIR_KEYSTORE_PATH")') && files.gradle.includes("signingConfigs.continuity")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? "OK" : "FALHOU"} · ${name}`);
if (failed.length) process.exitCode = 1;
