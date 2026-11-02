# 来源、用途与许可

## 本单原创三维、纸纹和合成音乐

`book-world.glb`、`guide.glb`、对应 `.blend`、纸张/织物纹理、参数化建模源码，
均在本单独占写面原创制作，没有导入参考游戏的网格、角色、贴图、Logo、地图或音频。
本单制作的内容交用户用于本项目及后续修改、复用；不附加第三方游戏素材许可。
没有宣称模型能加载就达到了参考游戏的完整制作规格。

`gentle-pentatonic.wav` 是本单创作的慢速五声音阶片段；
`soft-discovery.wav`、`paper-turn.wav` 是本单确定性数学合成的提示与纸张动作音。
它们不是自然环境录音，不是 TTS 念拟声词，也不是 ACE-Step 输出。
可复现源为 `private-source-not-published

## 设计图的模型来源

- 输出：`private-source-not-published
- 本地模型：`AbstractFramework/flux.2-klein-4b-8bit`。
- 上游：`black-forest-labs/FLUX.2-klein-4B`。
- 本机模型卡声明 Apache-2.0；本地模型卡与许可证副本存 `private-source-not-published
- 完整版本、随机种子、提示词、执行状态和时间见同名 `.receipt.json`。
- 模型权重许可与生成物的权利问题不是同一件事；这里记录上游声明，不冒充法律保证。

## 中文旁白

- 模型：`mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16`；
  上游：`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`。
- 本机模型卡声明 Apache-2.0，模型卡存 `private-source-not-published
- 使用预置 `Serena` 音色，不克隆真人；台词是本单原创。
- 每条 WAV 附 `.wav.receipt.json`；`audio/cues.json` 包含原文、触发建议、时长与检查结果。
- 文件非静音、无削波、浏览器可解码；欢迎句实际播放器结束、停止归零已查。
  **当前执行成员与观察者均没有实际听感验收，不能据此保证发音、停顿、语气或最终混音。**

## 仅研究使用的官方参照

- All Possible Futures / The Plucky Squire 官方页面：
  `https://allpossiblefutures.com/games/the-plucky-squire`
- ustwo games / Alba 官方页面：
  `https://www.albawildlife.com/`

官方截图只保存到本次指定 `context/art/` 研究目录，不打进游戏资产。
提取书本空间、清晰轮廓、温暖自然与低威胁氛围等设计原则，不复制受保护角色。
版权归各原权利人；未取得或暗示取得游戏素材再分发授权。

## 验收查看器

`private-source-not-published 是从已安装本地包只读复制的 Three.js 0.186.1 必要文件，
仅用于独立美术验收。MIT 许可证保留在该目录的 `LICENSE`。
主程序使用自己固定的 Three.js 版本；本成员不替换主程序依赖或共享配置。
没有安装新模型、下载大型权重或占用他人的 GPU 任务。

## 2026-11-02 数学课程扩展

- `app/math-course/assets/math-worlds.glb`：本轮依据原创概念图使用Blender制作的光学工作室与天空观测台；
  对应源在 `private-source-not-published
- `app/math-course/assets/*.jpg`：本轮通过用户已授权的公司图像通路、`gpt-image-2`生成的四主题概念图裁片；
  提示词在 `private-source-not-published
- 小学、初中、高中JSON中的例题与问题为本轮原创教学材料，参考官方课程范围；
  没有导入发现的CC BY-NC第三方题库、私有课程、学习存档或公开研究截图。
- `explain.wav`、`reflect.wav`复用同一r20本地配音源；演示片使用原创合成配乐与本地通用提示音，
  明确后期配音，非儿童实测、非现场录麦，听感仍未完成验收。
- 依赖仍使用已安装Three.js 0.170.0及既有许可证，不更改公共工具或模型账号。
