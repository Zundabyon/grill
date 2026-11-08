#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22以上をインストールしてから、もう一度開いてください。"
  read -r "?Enterキーで閉じます。"
  exit 1
fi
echo "Grillを起動します。このターミナルを開いている間、練習できます。"
echo "終了するときは Control + C を押してください。"
node scripts/serve.mjs --open
if [[ $? -ne 0 ]]; then
  echo "起動できませんでした。すでに起動している場合は http://127.0.0.1:5173 を開いてください。"
  read -r "?Enterキーで閉じます。"
fi
