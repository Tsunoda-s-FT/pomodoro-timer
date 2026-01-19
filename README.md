# Pomodoro Timer

[![CI](https://github.com/Tsunoda-s-FT/pomodoro-timer/actions/workflows/ci.yml/badge.svg)](https://github.com/Tsunoda-s-FT/pomodoro-timer/actions/workflows/ci.yml)

モダンなポモドーロタイマーアプリケーション。CLI、Web UI、デーモンモードをサポートし、複数のクライアント間でリアルタイム同期が可能です。

## 特徴

- **マルチプラットフォーム対応**: CLI、Web UI、デーモンモードで動作
- **リアルタイム同期**: Server-Sent Events (SSE) による複数クライアント間の状態同期
- **PWA対応**: オフラインでも動作するプログレッシブWebアプリ
- **システム通知**: macOS通知とブラウザ通知に対応
- **サウンド通知**: セッション完了時のサウンド再生
- **統計・ログ機能**: JSON Lines形式の構造化ログとセッション統計
- **カスタマイズ可能**: 作業時間、休憩時間、セッション数を自由に設定
- **プログラムモード**: 作業/休憩の並びを自由に組み替え可能

## アーキテクチャ

詳細: `docs/architecture.md`

```
┌─────────────────────────────────────────────────────────────┐
│                      Pomodoro Timer                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   CLI       │   │    Web UI   │   │  AI Agent   │       │
│  │ (packages/  │   │ (packages/  │   │  (client)   │       │
│  │    cli)     │   │    web)     │   │             │       │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│         │                 │                 │               │
│         └──────────────┬──┴──────────────┬──┘               │
│                        ▼                 ▼                  │
│                 ┌─────────────────────────────┐             │
│                 │        @pomodoro/api        │             │
│                 │     (HTTP + SSE Server)     │             │
│                 └──────────────┬──────────────┘             │
│                                ▼                            │
│                 ┌─────────────────────────────┐             │
│                 │      @pomodoro/service      │             │
│                 │  (scheduler + persistence)  │             │
│                 └──────────────┬──────────────┘             │
│                                ▼                            │
│                 ┌─────────────────────────────┐             │
│                 │        @pomodoro/core       │             │
│                 │     (pure state machine)    │             │
│                 └──────────────┬──────────────┘             │
│                                ▼                            │
│                 ┌─────────────────────────────┐             │
│                 │          ~/.pomodoro/       │             │
│                 │   state.json / logs / pid   │             │
│                 └─────────────────────────────┘             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ドキュメント

- `docs/README.md`: ドキュメント一覧
- `docs/modes.md`: 通常/プログラムモードの仕様
- `docs/usage-cli.md`: CLIの使い方
- `docs/usage-web.md`: Web UIの使い方
- `docs/api.md`: HTTP/SSE API
- `docs/settings.md`: 設定と保存場所
- `docs/development.md`: 開発手順

## インストール

### 必要要件

- Node.js 20.0.0 以上
- npm 9.0.0 以上

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/Tsunoda-s-FT/pomodoro-timer.git
cd pomodoro-timer

# 依存関係をインストール
npm install

# 全パッケージをビルド
npm run build
```

## クイックスタート

### 1. CLIで使う（デーモン経由）

```bash
# デーモンを起動
npm run pomodoro -- daemon start

# タイマーを開始
npm run pomodoro -- start --task "コーディング"

# 状態を確認
npm run pomodoro -- status
```

### 2. Web UIで使う（ローカルモード）

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:5173 を開く
```

### 3. デーモン + Web UI（リアルタイム同期）

```bash
# ターミナル1: デーモンを起動
npm run pomodoro -- daemon start

# ターミナル2: Web UIを起動
npm run dev

# ブラウザで http://localhost:5173/?daemon=http://localhost:3000 を開く
# CLIからの操作がブラウザにリアルタイム反映される
```

## ライセンス

MIT
