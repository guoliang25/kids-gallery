# 🎨 小朋友画画展示站 (Kids Gallery)

一个纯静态的瀑布流画廊站点，展示 Yoga 哥哥和 Siyu 妹妹的画画作品。

**在线访问**: [guoliang25.github.io/kids-gallery](https://guoliang25.github.io/kids-gallery/)

## 如何添加新作品

1. 把照片放入对应目录：
   - Yoga 的画：`images/artworks/yoga/`
   - Siyu 的画：`images/artworks/siyu/`
2. 编辑 `data/artworks.json`，在对应的数组中添加一条记录：
   ```json
   {
     "file": "2026-04-flower.jpg",
     "title": "春天的花",
     "date": "2026-04",
     "description": "水彩画"
   }
   ```
3. 提交并推送：
   ```bash
   git add .
   git commit -m "添加新作品"
   git push
   ```
4. GitHub Pages 会自动更新。

## 本地预览

```bash
cd ~/kids-gallery
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 功能特性

- 🧑‍🎨 双 Tab 切换：Yoga 哥哥 / Siyu 妹妹
- 📱 响应式瀑布流布局（桌面 3 列 / 平板 2 列 / 手机 1 列）
- 🔍 灯箱大图预览，支持左右切换和 ESC 关闭
- ⚡ 图片懒加载
- 📋 JSON 配置管理，维护简单
- 🚀 纯静态，push 即部署
