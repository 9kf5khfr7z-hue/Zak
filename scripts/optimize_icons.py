from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/tawseel-multi/assets/images')
files = [
    'icon.png',
    'splash-icon.png',
    'favicon.png',
    'android-icon-foreground.png',
    'android-icon-monochrome.png',
    'android-icon-background.png',
]

for name in files:
    path = root / name
    with Image.open(path) as image:
        image = image.convert('RGBA')
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        image.save(path, format='PNG', optimize=True, compress_level=9)
        print(f'{name}: {path.stat().st_size} bytes')
