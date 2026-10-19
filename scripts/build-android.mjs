import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const toolchainCandidates = [
  process.env.ANDROID_TOOLCHAIN_DIR,
  join(projectRoot, ".android-toolchain"),
  resolve(projectRoot, "..", "android-toolchain"),
].filter(Boolean);
const toolchainRoot = toolchainCandidates.find((root) => existsSync(join(root, "gradle/gradle-8.14.3/bin/gradle")));

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", rejectRun);
    child.on("exit", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${command} finalizou com código ${code ?? "desconhecido"}`)));
  });
}

try {
  await run("npm", ["run", "android:sync"], { cwd: projectRoot });
  if (!toolchainRoot) {
    await run("./gradlew", ["clean", "assembleDebug"], { cwd: join(projectRoot, "android") });
  } else {
    const sdk = join(toolchainRoot, "sdk");
    const javaHome = process.env.JAVA_HOME || "/usr/lib/jvm/java-21-openjdk-amd64";
    const env = {
      ...process.env,
      JAVA_HOME: javaHome,
      ANDROID_HOME: process.env.ANDROID_HOME || sdk,
      ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || sdk,
      GRADLE_USER_HOME: process.env.GRADLE_USER_HOME || join(toolchainRoot, "gradle-home"),
    };
    env.PATH = `${join(javaHome, "bin")}:${join(sdk, "platform-tools")}:${join(sdk, "cmdline-tools/latest/bin")}:${env.PATH || ""}`;
    await run(join(toolchainRoot, "gradle/gradle-8.14.3/bin/gradle"), ["clean", "assembleDebug"], { cwd: join(projectRoot, "android"), env });
  }
  const gradleConfig = await readFile(join(projectRoot, "android/app/build.gradle"), "utf8");
  const versionName = gradleConfig.match(/versionName\s+["']([^"']+)["']/)?.[1];
  if (!versionName) throw new Error("Não foi possível encontrar versionName em android/app/build.gradle");
  const builtApk = join(projectRoot, "android/app/build/outputs/apk/debug/app-debug.apk");
  if (!existsSync(builtApk)) throw new Error(`Gradle terminou sem gerar o APK: ${builtApk}`);
  const outputDir = join(projectRoot, "output");
  await mkdir(outputDir, { recursive: true });
  const outputApk = join(outputDir, `NOIR-${versionName}.apk`);
  await copyFile(builtApk, outputApk);
  const digest = createHash("sha256").update(await readFile(outputApk)).digest("hex");
  console.log(`APK: ${outputApk}`);
  console.log(`SHA-256: ${digest}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
