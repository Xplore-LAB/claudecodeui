package ai.cloudcli.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognizerIntent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.content.res.Configuration;
import android.view.Gravity;
import java.util.ArrayList;
import org.json.JSONObject;
import android.text.InputType;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.*;
import android.widget.*;

/** Mobile client for a user-selected CloudCLI server; agent processes stay on that server. */
public final class MainActivity extends Activity {
    private static final int FILE_PICKER = 41;
    private static final int SPEECH_INPUT = 42;
    private String speechRequestId;
    private String speechPageUrl;
    private TextView connectionLabel;
    private boolean dark;
    private WebView web;
    private LinearLayout root;
    private LinearLayout setup;
    private EditText address;
    private String serverUrl;
    private ValueCallback<Uri[]> files;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        setContentView(root);
        dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int surface = Color.parseColor(dark ? "#15191F" : "#F7F9FC");
        int foreground = Color.parseColor(dark ? "#EFF4FC" : "#172033");
        int muted = Color.parseColor(dark ? "#9BAAC0" : "#718096");
        root.setBackgroundColor(surface);
        getWindow().setStatusBarColor(surface);
        getWindow().setNavigationBarColor(surface);
        getWindow().getDecorView().setSystemUiVisibility(dark ? 0 : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(16), 0, dp(8), 0);
        TextView mark = new TextView(this);
        mark.setText("C");
        mark.setTextSize(20);
        mark.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        mark.setGravity(Gravity.CENTER);
        mark.setTextColor(Color.WHITE);
        mark.setBackground(rounded(Color.rgb(66, 110, 245), 12));
        toolbar.addView(mark, new LinearLayout.LayoutParams(dp(34), dp(34)));
        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.setPadding(dp(10), 0, 0, 0);
        TextView name = new TextView(this);
        name.setText("CloudCLI");
        name.setTextSize(16);
        name.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        name.setTextColor(foreground);
        brand.addView(name);
        connectionLabel = new TextView(this);
        connectionLabel.setTextSize(11);
        connectionLabel.setTextColor(muted);
        connectionLabel.setSingleLine(true);
        brand.addView(connectionLabel);
        toolbar.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        TextView menu = new TextView(this);
        menu.setText("⋯");
        menu.setTextSize(28);
        menu.setTextColor(foreground);
        menu.setGravity(Gravity.CENTER);
        menu.setContentDescription("更多选项");
        menu.setOnClickListener(v -> {
            PopupMenu popup = new PopupMenu(this, menu);
            popup.getMenu().add("切换服务器").setOnMenuItemClickListener(item -> { showSetup(); return true; });
            popup.getMenu().add("刷新页面").setOnMenuItemClickListener(item -> { web.reload(); return true; });
            popup.show();
        });
        toolbar.addView(menu, new LinearLayout.LayoutParams(dp(48), dp(48)));
        root.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(58)));
        setup = new LinearLayout(this);
        setup.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        setup.setPadding(pad, pad, pad, pad);
        setup.setBackground(rounded(dark ? Color.rgb(30, 36, 46) : Color.WHITE, 24));
        TextView title = new TextView(this);
        title.setText("随时开启工作\n连接你的 CloudCLI 工作空间，在手机上延续对话。");
        title.setTextSize(22);
        title.setTextColor(foreground);
        title.setLineSpacing(dp(8), 1);
        setup.addView(title);
        address = new EditText(this);
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setSingleLine(true);
        address.setHint("https://你的服务器/cloudcli/");
        address.setTextColor(foreground);
        address.setHintTextColor(muted);
        address.setTextSize(15);
        address.setPadding(dp(12), dp(18), dp(12), dp(18));
        setup.addView(address);
        Button connect = new Button(this);
        connect.setText("连接工作空间  →");
        connect.setTextColor(Color.WHITE);
        connect.setTextSize(16);
        connect.setAllCaps(false);
        connect.setBackground(rounded(Color.rgb(66, 110, 245), 14));
        connect.setMinHeight(dp(50));
        connect.setOnClickListener(v -> connect());
        setup.addView(connect);
        LinearLayout.LayoutParams setupLayout = new LinearLayout.LayoutParams(-1, -2);
        setupLayout.setMargins(dp(20), dp(32), dp(20), dp(20));
        root.addView(setup, setupLayout);
        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        WebSettings config = web.getSettings();
        config.setJavaScriptEnabled(true);
        config.setUserAgentString(config.getUserAgentString() + " CloudCLIAndroid/0.2");
        config.setDomStorageEnabled(true);
        config.setAllowFileAccess(false);
        config.setAllowContentAccess(true);
        config.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        config.setSupportZoom(true);
        config.setBuiltInZoomControls(true);
        config.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (sameOrigin(Uri.parse(serverUrl), uri)) return false;
                // External sites use the browser, retaining the server's authenticated WebView.
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException e) { toast("没有可打开链接的浏览器"); }
                }
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) toast("连接失败，请检查服务器地址和手机网络，可点击刷新重试");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsPrompt(WebView view, String url, String message, String value, JsPromptResult result) {
                if (!"cloudcli:dictate".equals(message)) return super.onJsPrompt(view, url, message, value, result);
                // Only the selected server in the current page can open system dictation.
                if (url == null || serverUrl == null || view.getUrl() == null
                        || !sameOrigin(Uri.parse(serverUrl), Uri.parse(url))
                        || !sameOrigin(Uri.parse(view.getUrl()), Uri.parse(url)) || speechRequestId != null) {
                    result.confirm("unavailable");
                    return true;
                }
                try {
                    JSONObject request = new JSONObject(value);
                    String id = request.getString("id");
                    String language = request.optString("language", "zh-CN");
                    if (id.length() > 100 || !language.matches("[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*")) {
                        result.confirm("unavailable");
                        return true;
                    }
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                    intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                    intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "说出你的想法，识别后可编辑再发送");
                    speechRequestId = id;
                    speechPageUrl = view.getUrl();
                    startActivityForResult(intent, SPEECH_INPUT);
                    result.confirm("started");
                } catch (Exception error) {
                    speechRequestId = null;
                    speechPageUrl = null;
                    result.confirm("unavailable");
                }
                return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (files != null) files.onReceiveValue(null);
                files = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_PICKER);
                } catch (ActivityNotFoundException e) {
                    files.onReceiveValue(null);
                    files = null;
                    toast("没有可用的文件选择器");
                }
                return true;
            }
        });
        serverUrl = getPreferences(MODE_PRIVATE).getString("serverUrl", "");
        address.setText(serverUrl);
        if (serverUrl.isEmpty()) showSetup();
        else {
            setup.setVisibility(View.GONE);
            connectionLabel.setText(Uri.parse(serverUrl).getHost());
            if (savedState == null || web.restoreState(savedState) == null) web.loadUrl(serverUrl);
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable background = new GradientDrawable();
        background.setColor(color);
        background.setCornerRadius(dp(radius));
        return background;
    }
    private static int port(Uri uri) {
        return uri.getPort() != -1 ? uri.getPort() : ("https".equals(uri.getScheme()) ? 443 : 80);
    }
    private static boolean sameOrigin(Uri a, Uri b) {
        return a.getScheme() != null && a.getScheme().equals(b.getScheme())
            && a.getHost() != null && a.getHost().equalsIgnoreCase(b.getHost()) && port(a) == port(b);
    }
    private void showSetup() {
        connectionLabel.setText("连接你的工作空间");
        setup.setVisibility(View.VISIBLE);
        web.setVisibility(View.GONE);
    }
    private void connect() {
        String candidate = address.getText().toString().trim();
        Uri uri = Uri.parse(candidate);
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))
                || uri.getHost() == null || uri.getUserInfo() != null) {
            address.setError("请输入完整的 http:// 或 https:// 地址");
            return;
        }
        openServer(candidate);
    }
    private void openServer(String url) {
        boolean changed = !url.equals(serverUrl);
        serverUrl = url;
        connectionLabel.setText(Uri.parse(url).getHost());
        getPreferences(MODE_PRIVATE).edit().putString("serverUrl", url).apply();
        ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(address.getWindowToken(), 0);
        setup.setVisibility(View.GONE);
        web.setVisibility(View.VISIBLE);
        if (changed) web.clearHistory();
        web.loadUrl(url);
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == SPEECH_INPUT && speechRequestId != null) {
            String id = speechRequestId;
            String page = speechPageUrl;
            speechRequestId = null;
            speechPageUrl = null;
            if (page != null && page.equals(web.getUrl()) && sameOrigin(Uri.parse(serverUrl), Uri.parse(page))) {
                ArrayList<String> words = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                String text = result == RESULT_OK && words != null && !words.isEmpty() ? words.get(0) : "";
                // JSONObject quoting keeps dictated text out of executable JavaScript.
                web.evaluateJavascript("window.dispatchEvent(new CustomEvent('cloudcli:dictation',{detail:{id:"
                    + JSONObject.quote(id) + ",text:" + JSONObject.quote(text) + "}}))", null);
            }
            return;
        }
        if (request == FILE_PICKER && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            files = null;
        }
    }
    @Override public void onBackPressed() {
        if (setup.getVisibility() == View.VISIBLE && !serverUrl.isEmpty()) {
            connectionLabel.setText(Uri.parse(serverUrl).getHost());
            setup.setVisibility(View.GONE);
            web.setVisibility(View.VISIBLE);
        } else if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        super.onSaveInstanceState(state);
    }
    @Override protected void onDestroy() {
        if (files != null) files.onReceiveValue(null);
        web.destroy();
        super.onDestroy();
    }
}
