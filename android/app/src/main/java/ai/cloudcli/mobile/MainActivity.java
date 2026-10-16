package ai.cloudcli.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.*;
import android.widget.*;

/** Mobile client for a user-selected CloudCLI server; agent processes stay on that server. */
public final class MainActivity extends Activity {
    private static final int FILE_PICKER = 41;
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
        LinearLayout toolbar = new LinearLayout(this);
        Button settings = new Button(this);
        settings.setText("服务器");
        settings.setOnClickListener(v -> showSetup());
        Button reload = new Button(this);
        reload.setText("刷新");
        reload.setOnClickListener(v -> web.reload());
        toolbar.addView(settings);
        toolbar.addView(reload);
        root.addView(toolbar);
        setup = new LinearLayout(this);
        setup.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        setup.setPadding(pad, pad, pad, pad);
        TextView title = new TextView(this);
        title.setText("连接 CloudCLI\n填写手机能够访问的完整网址，可包含路径。电脑上的 CloudCLI 服务需要保持运行。");
        title.setTextSize(18);
        setup.addView(title);
        address = new EditText(this);
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setSingleLine(true);
        address.setHint("https://你的服务器/cloudcli/");
        setup.addView(address);
        Button connect = new Button(this);
        connect.setText("连接");
        connect.setOnClickListener(v -> connect());
        setup.addView(connect);
        root.addView(setup);
        web = new WebView(this);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        WebSettings config = web.getSettings();
        config.setJavaScriptEnabled(true);
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
            if (savedState == null || web.restoreState(savedState) == null) web.loadUrl(serverUrl);
        }
    }

    private static int port(Uri uri) {
        return uri.getPort() != -1 ? uri.getPort() : ("https".equals(uri.getScheme()) ? 443 : 80);
    }
    private static boolean sameOrigin(Uri a, Uri b) {
        return a.getScheme() != null && a.getScheme().equals(b.getScheme())
            && a.getHost() != null && a.getHost().equalsIgnoreCase(b.getHost()) && port(a) == port(b);
    }
    private void showSetup() {
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
        if (request == FILE_PICKER && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            files = null;
        }
    }
    @Override public void onBackPressed() {
        if (setup.getVisibility() == View.VISIBLE && !serverUrl.isEmpty()) {
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
