# Next.js + TypeScript + Tailwind CSS

このプロジェクトは、Next.js（App Router）、TypeScript、Tailwind CSSを使用したモダンなWebアプリケーションです。

## 技術スタック

- **Next.js 14** - React フレームワーク（App Router使用）
- **TypeScript** - 型安全なJavaScript
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク

## セットアップ

1. 依存関係をインストール：
```bash
npm install
```

2. 開発サーバーを起動：
```bash
npm run dev
```

3. ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーを起動
- `npm run build` - プロダクションビルドを作成
- `npm run start` - プロダクションサーバーを起動
- `npm run lint` - ESLintでコードをチェック

## プロジェクト構造

```
├── app/
│   ├── globals.css      # グローバルスタイル（Tailwind CSS）
│   ├── layout.tsx       # ルートレイアウト
│   └── page.tsx         # ホームページ
├── package.json         # 依存関係とスクリプト
├── tsconfig.json        # TypeScript設定
├── tailwind.config.js   # Tailwind CSS設定
├── postcss.config.js    # PostCSS設定
├── next.config.js       # Next.js設定
└── .eslintrc.json       # ESLint設定
```
