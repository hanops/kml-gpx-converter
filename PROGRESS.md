# 开发进度

记录项目开发过程中的重要变更和决策。

## 2026-05-31 - 设计优化、工程规范与 Vercel 部署

### 完成内容

#### 1. 前端设计优化

- **配色方案**：从通用的 Material Design 蓝色改为暖色调土黄色 (#c8601a)，更具地理/地图工具质感
- **字体升级**：Instrument Serif（标题）+ DM Sans（正文）
- **背景纹理**：添加 topographic 等高线 SVG 纹理
- **Drop Zone 重设计**：
  - 上传图标 SVG
  - 格式标签（.kml .kmz .gpx）
  - hover 和 drag-over 动画
  - 渐变背景和光晕效果
- **界面层次**：圆角系统、阴影层级、状态色块

#### 2. 工程规范完善

- **Prettier 代码格式化**
  - `.prettierrc` 配置
  - `.prettierignore` 忽略规则
  - `package.json` 包含 npm scripts 和 devDependencies
- **CI 改进**
  - `npm ci` 安装依赖
  - `npx prettier --check .` 格式检查
  - 统一命令：`npm run check` 和 `npm run lint`
- **文档更新**
  - `AGENTS.md` 更新验证命令
  - `CONTRIBUTING.md` 添加 Code Style 部分
- **CLAUDE.md 软链**：指向 AGENTS.md

### 新增文件

```
package.json       # npm 配置
.prettierrc        # Prettier 规则
.prettierignore    # 忽略规则
CLAUDE.md          # -> AGENTS.md 软链
```

### 验证

- `npm run check` ✅
- `npm run lint` ✅

#### 3. Vercel 部署配置

- **`vercel.json`**：添加部署配置
  - 空构建命令 + 当前目录输出（纯静态站）
  - 安全响应头：`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Referrer-Policy: strict-origin-when-cross-origin`
  - `vendor/` 资源缓存策略：`public, max-age=31536000, immutable`
- **Vercel Web Analytics**：在 `index.html` 中集成 Vercel 统计脚本
- **`.gitignore`**：添加 `.vercel` 忽略规则

---

## 2026-05-08 - 项目初始化

（详见 CHANGELOG.md V1.1.0 和 V1.1.1）
