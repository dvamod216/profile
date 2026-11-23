/* Cấu hình link cần up — ví dụ điền vào đây rồi reload trang:
   - profile.avatarUrl : link ảnh avatar  → "https://.../avatar.jpg" hoặc "./assets/avatar.jpg"
   - tracks[i].coverUrl: link ảnh bìa    → "https://.../cover.jpg"
   - tracks[i].audioUrl: link FILE NHẠC  → "https://.../bai-hat.mp3" (.mp3/.ogg/.wav/stream), KHÔNG phải link trang Spotify
   - tracks[i].spotifyUrl (tuỳ chọn): link web Spotify nếu muốn giữ riêng, không dùng cho nút phát.
   Thêm bài: copy khối trong tracks[], đổi id/title/artist/genre/coverUrl/audioUrl. */
window.DVA_MEDIA_CONFIG = {
  profile: {
    avatarUrl: "https://i.postimg.cc/MKpswP8L/IMG-6961.jpg"
  },
  tracks: [
    {
      id: "track-1",
      title: "Miền Cát Trắng",
      artist: "Chế",
      genre: "Ballad / Acoustic",
      coverUrl: "https://i.postimg.cc/MKpswP8L/IMG-6961.jpg",
      audioUrl: "https://www.image2url.com/r2/default/audio/1795154928388-61fd1b8e-1e56-4f86-94e1-1dd9443e759f.mp3"
    }
    /* Ví dụ bài thứ 2:
    ,{
      id: "track-2",
      title: "Tên bài khác",
      artist: "Nghệ sĩ",
      genre: "Chill",
      coverUrl: "https://.../cover-2.jpg",
      audioUrl: "https://.../bai-2.mp3"
    } */
  ]
};
