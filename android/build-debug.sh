#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")" && pwd)"
sdk_dir="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Android/Sdk}}"
build_tools="${ANDROID_BUILD_TOOLS:-$sdk_dir/build-tools/34.0.0}"
android_jar="${ANDROID_JAR:-$sdk_dir/platforms/android-34/android.jar}"
jdk_bin="${JAVA_HOME:+$JAVA_HOME/bin/}"
output_dir="$project_dir/build"
aapt_bin="${AAPT:-$build_tools/aapt}"
mkdir -p "$output_dir/classes" "$output_dir/dex" "$project_dir/../release/android"
"$aapt_bin" package -f -M "$project_dir/app/src/main/AndroidManifest.xml" -S "$project_dir/app/src/main/res" -I "$android_jar" -F "$output_dir/resources.apk"
"${jdk_bin}javac" -g --release 8 -classpath "$android_jar" -d "$output_dir/classes" "$project_dir/app/src/main/java/ai/cloudcli/mobile/MainActivity.java"
mapfile -d '' class_files < <(find "$output_dir/classes" -name '*.class' -print0)
"${jdk_bin}java" -cp "${D8_JAR:-$build_tools/lib/d8.jar}" com.android.tools.r8.D8 --min-api 26 --lib "$android_jar" --output "$output_dir/dex" "${class_files[@]}"
python3 - "$output_dir" <<'PY'
from pathlib import Path
from zipfile import ZipFile
import shutil, sys
p = Path(sys.argv[1])
shutil.copyfile(p / 'resources.apk', p / 'unsigned.apk')
with ZipFile(p / 'unsigned.apk', 'a') as apk:
    apk.write(p / 'dex/classes.dex', 'classes.dex')
PY
if [[ ! -f "$output_dir/debug.keystore" ]]; then
  "${jdk_bin}keytool" -genkeypair -keystore "$output_dir/debug.keystore" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=CloudCLI Local Debug,O=CloudCLI,C=CN'
fi
# This shell has no native libraries; apksigner handles its APK alignment requirements.
"${jdk_bin}java" -jar "$build_tools/lib/apksigner.jar" sign --ks "$output_dir/debug.keystore" --ks-pass pass:android --out "$project_dir/../release/android/cloudcli-debug.apk" "$output_dir/unsigned.apk"
"${jdk_bin}java" -jar "$build_tools/lib/apksigner.jar" verify --verbose "$project_dir/../release/android/cloudcli-debug.apk"
printf 'APK: %s\n' "$project_dir/../release/android/cloudcli-debug.apk"
