# 活着下班（Survive the Shift）

一款以职场压力为题材的网页版割草游戏。玩家需要在不断涌来的通知、需求、会议和 KPI 中保持心态、清空待办，并在 18:00 成功冲进电梯。

## 文档导航

- [产品需求文档](prd.md)
- [技术框架](docs/technical/README.md)
- [技术架构](docs/technical/architecture.md)
- [开发约定](docs/technical/development.md)
- [游戏框架](docs/game-design/README.md)
- [核心循环](docs/game-design/core-loop.md)
- [系统设计](docs/game-design/systems.md)
- [数值与难度](docs/game-design/balance.md)

## 本地运行

```bash
npm install
npm run dev
```

## 常用命令

```bash
npm run dev
npm run build
npm run typecheck
npm run test
```

当前代码使用程序生成的调试图形，仅用于验证玩法框架，不代表最终美术。

## 当前可玩机制

- 三档难度与当前 3 分钟快速局
- 鼠标瞄准、主动攻击、武器切换和战场奖励三选一
- 独立定时掉落、渐隐闪烁的血包
- 三级武器、固定三件奖励和最短掉落间隔
- 满怒动态提示、拍桌冲击波和短暂清屏
- `Esc` 与右上角按钮均可暂停，暂停层支持点击继续
- 战斗HUD和暂停菜单均可退出当前局并返回主菜单
- 键盘连击、咖啡泼洒、文件粉碎机
- 红点通知、紧急需求、Excel 和 Boss
- 心态、待办、怒气拍桌子、滑椅冲刺
- 茶水间风险收益区域
- 18:00 电梯撤离、胜负结算和重新开始
