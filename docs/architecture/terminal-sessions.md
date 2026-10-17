# 终端为主的会话

会话页保留原来的聊天界面、Markdown 和工具卡片；“实时终端”页显示真实的
Claude Code / Codex 交互终端。网页、Android WebView 和电脑端共享同一个终端实例。
已由终端托管的会话在聊天页同步记录，并提供“接入原终端继续”入口，
不会通过聊天输入框再启动 SDK 进程。未由终端托管的会话保留原来的聊天操作。
聊天任务执行期间也禁止启动同一会话的第二个终端进程。

- 先创建稳定的应用会话 ID，再打开终端；多个设备打开同一会话时共享输出和输入。
- 命令行页启动独立的普通 Shell，不自动恢复当前智能体会话。
- 浏览器断开后后台终端继续运行；重连会补发缓存输出。
- 断线和手动断开保留当前设备的终端画面；收到重连后的首段非空输出时，
  再清理旧画面并显示回放，避免网络中断造成空白或回放叠加。
- 共享终端状态栏区分连接中、已连接和已断开；连接状态表示设备连接，
  不表示智能体任务的运行或完成状态。本机接入命令支持复制。
- 隐藏的终端面板不发送零尺寸布局产生的 resize，避免切换标签影响其他设备。
- Linux 上智能体运行于 `tmux -L cloudcli`，由独立的
  `cloudcli-terminals.service` 托管。重启 `cloudcli.service` 只会断开客户端。
- 终端页的“本机终端接入”显示准确的 `tmux attach-session` 命令。
  本机使用这个命令即可共享原进程；不要再运行 `codex resume` 或 `claude --resume`。
- “断开”只断开当前设备；“重启”结束并重新启动该会话的终端，会影响所有连接设备。
- 程序主动退出、整机重启或终端服务停止后，运行中的任务不会继续；会话记录仍由 CLI 保存。

## 启动

本机已安装 tmux。用户服务配置为 `config/cloudcli-terminals.service`，
tmux 配置为 `config/terminal-tmux.conf`。在其他机器部署时需调整服务中的绝对路径。
该服务须先于持久终端的首次连接启动，避免 tmux 被网页服务的进程组托管。

```sh
systemctl --user enable --now cloudcli-terminals.service
systemctl --user restart cloudcli.service
```

## 会话标识

终端使用项目路径、供应商和稳定应用会话 ID 的哈希作为 tmux 名称。
新 Claude 会话使用 `--session-id` 关联应用 ID；新 Codex 会话通过本机
CLI 的 `CODEX_INTERNAL_ORIGINATOR_OVERRIDE` 把应用 ID 记录到 transcript
的 `session_meta.payload.originator`，索引器据此关联原生 ID，避免重复侧栏条目。
Codex 升级时需验证这项元数据契约。

已经在其他独立终端里启动的智能体不能自动迁入 tmux；需先正常退出，
再从会话页恢复。之后各设备都接入这里的共享终端。

## 验证

回归测试覆盖多设备输出和输入、断开后重连、供应商隔离、应用与原生会话映射、
前端创建失败，以及真实 tmux 客户端退出后终端进程保持不变。
