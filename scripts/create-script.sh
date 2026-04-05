#!/bin/bash
# Tampermonkeyスクリプト新規作成スキャフォールド
# 使い方: pnpm new <script-name>
set -euo pipefail

SCRIPT_NAME="${1:-}"

if [ -z "$SCRIPT_NAME" ]; then
  echo "使い方: pnpm new <script-name>"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="packages/$SCRIPT_NAME"
FULL_SCRIPT_DIR="$ROOT_DIR/$SCRIPT_DIR"
TEMPLATE_DIR="$ROOT_DIR/templates/script"

if [ -d "$FULL_SCRIPT_DIR" ]; then
  echo "エラー: $SCRIPT_DIR はすでに存在します"
  exit 1
fi

# ディレクトリ作成
mkdir -p "$FULL_SCRIPT_DIR/src" "$FULL_SCRIPT_DIR/tests" "$FULL_SCRIPT_DIR/dist"

# テンプレートからファイルを生成（{{SCRIPT_NAME}} を置換）
while IFS= read -r -d '' tmpl; do
  relative="${tmpl#$TEMPLATE_DIR/}"
  target="$FULL_SCRIPT_DIR/${relative%.tmpl}"
  mkdir -p "$(dirname "$target")"
  sed "s/{{SCRIPT_NAME}}/$SCRIPT_NAME/g" "$tmpl" > "$target"
done < <(find "$TEMPLATE_DIR" -name "*.tmpl" -print0)

# dist をgitにトラッキングさせるための .gitkeep
touch "$FULL_SCRIPT_DIR/dist/.gitkeep"

echo "✓ $SCRIPT_DIR を作成しました"
echo ""
echo "次のステップ:"
echo "  1. $SCRIPT_DIR/vite.config.ts で match URLを設定する"
echo "  2. $SCRIPT_DIR/src/main.ts にロジックを実装する"
echo "  3. pnpm dev --filter @scripts/$SCRIPT_NAME で開発サーバーを起動する"
