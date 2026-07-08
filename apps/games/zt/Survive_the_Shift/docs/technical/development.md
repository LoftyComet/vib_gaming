# 开发约定

## 环境

- Node.js 24
- npm 11
- 现代桌面浏览器

## 启动

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run typecheck
npm run test
npm run build
```

## 代码约定

- 开启 TypeScript 严格模式。
- 场景只编排流程，不长期容纳所有玩法规则。
- 内容数值放在 `config/`，不要散落魔法数字。
- 实体类只处理自身状态和最小行为。
- UI 不直接修改战斗实体。
- 资源键统一使用小写短横线。
- 新系统需要在对应游戏设计文档中说明规则。

## 资源约定

```text
public/assets/
├── characters/
├── enemies/
├── weapons/
├── environments/
├── ui/
├── audio/
└── fonts/
```

- 源文件和导出文件分开管理。
- 文件名使用英文小写短横线。
- 不提交真实公司标识或未经授权的品牌素材。
- 当前调试纹理由代码生成，正式资产接入后删除。

## 分支与提交建议

- `feat/`：新玩法或内容
- `fix/`：问题修复
- `balance/`：纯数值调整
- `art/`：美术与资源接入
- `docs/`：文档调整

提交信息写清玩家可感知的变化，避免只写“update”。
