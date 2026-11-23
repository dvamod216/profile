# DVA SYSTEMS — Unified Web v2

## Cách gắn link Avatar, Ảnh bài nhạc và Link nhạc
Mở file `js/mediaConfig.js` và điền link vào các trường tương ứng:
- `profile.avatarUrl`: link ảnh avatar hồ sơ (hỗ trợ URL ảnh hoặc file cục bộ như `./assets/avatar.jpg`).
- `tracks[i].coverUrl`: link ảnh bìa từng bài nhạc.
- `tracks[i].audioUrl`: link file nhạc thật (`.mp3`, `.ogg`, `.wav` hoặc stream URL).

## Chạy thử trên máy hoặc Linux VPS
```bash
python3 -m http.server 8080
```
