from PIL import Image
import os

# Path to the source PNG logo
SRC_PATH = os.path.join('build', 'appicon.png')
# Path to the output ICO file
OUT_PATH = os.path.join('build', 'windows', 'icon.ico')

# Standard Windows icon sizes
SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

def main():
    if not os.path.exists(SRC_PATH):
        print(f"Source image not found: {SRC_PATH}")
        return
    img = Image.open(SRC_PATH).convert('RGBA')
    # Save as multi-size ICO
    img.save(OUT_PATH, format='ICO', sizes=SIZES)
    print(f"Icon generated: {OUT_PATH}")

if __name__ == '__main__':
    main()
