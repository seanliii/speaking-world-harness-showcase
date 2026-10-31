这是干净的HTTP静态站目录，可放在任意子路径（路径末尾保留/）。不需要后端或密钥。
所有./路径保持同源。js/、media/、带哈希的CSS/JSON可长期缓存；index.html建议no-cache。
.glb.gz是无损压缩文件，浏览器解压；请按静态gzip文件提供，不额外声明Content-Encoding:gzip。旧浏览器回退到.glb。
音频只按用户操作加载。file://请使用单文件离线入口，不是这个ESM目录。
不含学习者存档、成人QA原话或旧r19原文件。课程未制作状态保留。
