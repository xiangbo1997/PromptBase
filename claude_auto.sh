#!/bin/bash

# 1. 核心环境变量：只给路径，不加载 UI 配置
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export HOME="/Users/shamoyulvren"

# 2. 这里的 claude 建议使用你发现有效的 -p 参数（即 print 模式，专门用于自动化）
# 如果你的版本不支持 -p，就换回之前那个 echo 管道
echo "------------------------------------------" >> ~/Desktop/claude_daily.log
echo "执行时间: $(date)" >> ~/Desktop/claude_daily.log

# 尝试使用 -p 参数，这是 Claude Code 官方推荐的自动化执行方式
/opt/homebrew/bin/claude -p "请回复'收到'并确认计费状态" >> ~/Desktop/claude_daily.log 2>&1

# 如果 -p 报错，就改回下面这行：
# echo "请回复'收到'并确认计费状态" | /opt/homebrew/bin/claude >> ~/Desktop/claude_daily.log 2>&1


