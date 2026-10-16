# CloudCLI Android

Android 8.0+ 的本地安装测试版，使用 Android 系统 WebView 连接已有 CloudCLI 服务。Claude/Codex 和项目文件仍在服务器运行。首次启动填写手机可访问的完整网址，例如 `https://example.com/cloudcli/`，然后使用现有网页账号登录。`localhost` 指手机本身；访问本机服务器时使用电脑的局域网地址或既有远程访问地址。

首版包括服务器地址保存、网页登录状态保存、刷新、系统返回、附件文件选择、键盘窗口缩放和外部链接交给浏览器。支持 HTTP 局域网服务以及 HTTPS，不跳过证书校验。未接入原生推送、麦克风授权和离线执行。它不是商店发布版，尚未连接实体手机验收。

实现依据：[Android WebView 文档](https://developer.android.com/develop/ui/views/layout/webapps/webview)、[WebChromeClient 文件选择接口](https://developer.android.com/reference/android/webkit/WebChromeClient)、[APK 签名工具](https://developer.android.com/tools/apksigner)。

## 构建

需要 JDK 17+、Python 3、Android SDK Platform 34 和 Build Tools 34.0.0。无第三方应用依赖。

```bash
export JAVA_HOME=/path/to/jdk
export ANDROID_SDK_ROOT=/path/to/Android/Sdk
./android/build-debug.sh
```

输出 `release/android/cloudcli-debug.apk`，使用 `android/build/debug.keystore` 本地调试签名。保留这个密钥才能覆盖更新已有安装；`android/build` 和 `release` 均不提交版本库。可通过 `AAPT`、`ANDROID_BUILD_TOOLS`、`ANDROID_JAR` 和 `D8_JAR` 指定工具位置。旧 D8 配合较新 JDK 时可能崩溃，本机使用 Google Maven 的 R8/D8 8.7.18。

## 手机验收

1. 安装 APK，输入完整服务地址，确认登录、切换项目和流式聊天。
2. 弹出/收起键盘，切换横竖屏，确认输入区、抽屉和滚动位置。
3. 选择图片或文件作为附件，取消选择器后再次选择。
4. 测试系统返回、刷新、断网恢复，以及外部链接跳转。

网页布局回归覆盖 320×640、390×844 和 844×390，截图在 `release/mobile`。浏览器验证使用隔离的模拟 API；没有向实际项目发送聊天消息或创建会话。键盘视口事件另有自动化回归测试，实体手机键盘行为仍需按上述步骤验证。
