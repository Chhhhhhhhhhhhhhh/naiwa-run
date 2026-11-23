"""生成「奶娃快跑」离线中文神经语音（输出到 assets/voice/*.mp3）。

用法：
  python tools/generate_voices.py
  python tools/generate_voices.py --voice zh-CN-YunxiaNeural
"""
import argparse
import asyncio
import os
from pathlib import Path

import edge_tts

DEFAULT_VOICE = "zh-CN-XiaoyiNeural"

# (文件名, 台词文本, 语速, 音高)
LINES = [
    ("start", "奶娃快跑，冲鸭！", "+12%", "+4Hz"),
    ("dash", "闪身步！", "+25%", "+6Hz"),
    ("jump", "中国人能飞！", "+22%", "+8Hz"),
    ("slide", "奶蛋出击！", "+22%", "+5Hz"),
    ("shield", "相信光！", "+10%", "+6Hz"),
    ("sprint", "奥利给！", "+15%", "+6Hz"),
    ("magnet", "磁吸奶瓶，吸！", "+12%", "+5Hz"),
    ("coins666", "六六六！", "+15%", "+8Hz"),
    ("chaser", "豆包老师来了！", "+18%", "+6Hz"),
    ("eh", "饿——", "-18%", "-2Hz"),
    ("record", "遥遥领先！", "+8%", "+6Hz"),
    ("ach_normal", "达成成就，有点东西！", "+14%", "+6Hz"),
    ("ach_rare", "哇塞，太秀了吧！", "+12%", "+8Hz"),
    ("ach_secret", "哈哈哈，这都能触发！", "+10%", "+6Hz"),
]


async def generate_all(voice: str, out_dir: Path, only_missing: bool = False) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or None
    for name, text, rate, pitch in LINES:
        target = out_dir / f"{name}.mp3"
        if only_missing and target.exists() and target.stat().st_size > 1024:
            continue
        kwargs = {"voice": voice, "rate": rate, "pitch": pitch}
        if proxy:
            kwargs["proxy"] = proxy
        communicate = edge_tts.Communicate(text, **kwargs)
        await communicate.save(str(target))
        size_kb = target.stat().st_size / 1024
        print(f"generated {target.name:14s}  {size_kb:5.1f} KB  ({text})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate offline Chinese neural voice clips.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"Edge TTS voice name (default: {DEFAULT_VOICE})")
    parser.add_argument("--only-missing", action="store_true", help="Only generate missing MP3 files")
    args = parser.parse_args()
    out_dir = Path(__file__).resolve().parent.parent / "assets" / "voice"
    asyncio.run(generate_all(args.voice, out_dir, only_missing=args.only_missing))


if __name__ == "__main__":
    main()
