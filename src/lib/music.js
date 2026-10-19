import { h } from './utils.js';
import { loadYouTubeApi, parseYouTube } from './youtube.js';

/**
 * Nhạc nền + nút bật/tắt nổi góc phải. url là file mp3/m4a hoặc link YouTube.
 * play() phải gọi trong sự kiện bấm của người dùng.
 */
export function createMusic(url) {
  const btn = h('button', { class: 'music-btn', type: 'button', 'aria-label': 'Bật/tắt nhạc', hidden: true }, '♪');
  document.body.append(btn);
  const setOn = (on) => btn.classList.toggle('is-on', on);

  const yt = parseYouTube(url);
  const player = yt ? youtubePlayer(yt, setOn) : audioPlayer(url, setOn);
  btn.addEventListener('click', () => player.toggle());

  let suspended = false;
  return {
    play() {
      if (!url) return;
      btn.hidden = false;
      player.play();
    },
    pause: () => player.pause(),
    // Video phát có tiếng → suspend() tạm dừng nhạc nền; resume() chỉ phát lại nếu trước đó đang phát.
    // Nên gọi resume() trong sự kiện chạm/bấm để iPhone cho phép phát.
    suspend() {
      if (!player.isOn()) return;
      suspended = true;
      player.pause();
    },
    resume() {
      if (!suspended) return;
      suspended = false;
      player.play();
    },
  };
}

function audioPlayer(url, setOn) {
  const audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  if (url) audio.src = url;
  audio.addEventListener('play', () => setOn(true));
  audio.addEventListener('pause', () => setOn(false));
  const play = () => audio.play().catch(() => {});
  return {
    play,
    pause: () => audio.pause(),
    toggle: () => (audio.paused ? play() : audio.pause()),
    isOn: () => !audio.paused,
  };
}

// Trình phát YouTube ẩn (không dùng display:none vì một số trình duyệt sẽ không phát).
function youtubePlayer({ id, start }, setOn) {
  const host = h('div', {
    'aria-hidden': 'true',
    style: { position: 'fixed', left: '0', bottom: '0', width: '200px', height: '200px', opacity: '0', pointerEvents: 'none', zIndex: '-1' },
  });
  const mount = h('div');
  host.append(mount);
  document.body.append(host);

  let player = null, ready = false, want = false;

  // Sự kiện onStateChange của YouTube không phải lúc nào cũng tới → tự đọc trạng thái mỗi giây
  // để cập nhật nút ♪ và phát lại từ đầu khi hết bài.
  const watch = (YT) => setInterval(() => {
    if (!ready) return;
    const s = player.getPlayerState();
    setOn(s === YT.PlayerState.PLAYING);
    if (s === YT.PlayerState.ENDED && want) {
      player.seekTo(start, true);
      player.playVideo();
    }
  }, 1000);

  loadYouTubeApi().then((YT) => {
    player = new YT.Player(mount, {
      width: 200,
      height: 200,
      videoId: id,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, start, rel: 0 },
      events: {
        onReady: () => {
          ready = true;
          watch(YT);
          if (want) play();
        },
        onError: (e) => console.warn('YouTube không phát được video này (mã lỗi', e.data, ')'),
      },
    });
  });

  function play() {
    want = true;
    setOn(true);
    if (ready) {
      player.unMute();
      player.setVolume(80);
      player.playVideo();
    }
  }
  function pause() {
    want = false;
    setOn(false);
    if (ready) player.pauseVideo();
  }
  return { play, pause, toggle: () => (want ? pause() : play()), isOn: () => want };
}
