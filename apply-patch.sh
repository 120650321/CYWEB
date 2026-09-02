#!/bin/bash
# ============================================================
# 驰耀科技 - 文件上传修复补丁 (Ubuntu/Linux)
# 
# 用法：
#   chmod +x apply-patch.sh
#   ./apply-patch.sh              # 仅应用补丁
#   ./apply-patch.sh --build      # 应用补丁并重新构建
#   ./apply-patch.sh --dry-run    # 预览变更，不实际修改
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo "  驰耀科技 - 文件上传修复补丁"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# 检查 Python3 (兼容 python3 / python 命令)
PYTHON=""
if command -v python3 &>/dev/null; then
    PYTHON="python3"
elif command -v python &>/dev/null; then
    PYTHON="python"
else
    echo "[ERR] 未找到 Python，请先安装：sudo apt install python3"
    exit 1
fi

# 执行补丁
$PYTHON "$SCRIPT_DIR/apply-patch.py" "$@"

EXIT_CODE=$?
echo ""
echo "============================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "  补丁应用完成！"
else
    echo "  补丁应用失败，请检查上述错误。"
fi
echo "============================================"

exit $EXIT_CODE