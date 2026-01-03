"""Resize and convert test images to 512x512 PNG (center crop)."""
from PIL import Image
import os

TEST_IMAGES_DIR = "test_images"
TARGET_SIZE = 512

def resize_and_crop(image_path, output_path, size=TARGET_SIZE):
    """Resize image to square by center cropping."""
    img = Image.open(image_path)

    # Convert RGBA to RGB if needed
    if img.mode == 'RGBA':
        img = img.convert('RGB')

    # Get current dimensions
    width, height = img.size

    # Calculate crop box for center crop to square
    if width > height:
        # Landscape - crop width
        left = (width - height) // 2
        top = 0
        right = left + height
        bottom = height
    else:
        # Portrait - crop height
        left = 0
        top = (height - width) // 2
        right = width
        bottom = top + width

    # Crop to square
    img = img.crop((left, top, right, bottom))

    # Resize to target size
    img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Save as PNG
    img.save(output_path, 'PNG')
    print(f"Processed: {output_path} ({size}x{size})")

if __name__ == "__main__":
    # Process all images in test_images directory
    for i in range(1, 4):
        # Try different extensions
        for ext in ['.png', '.jpeg', '.jpg']:
            input_path = os.path.join(TEST_IMAGES_DIR, f"test_image_{i}{ext}")
            if os.path.exists(input_path):
                output_path = os.path.join(TEST_IMAGES_DIR, f"test_image_{i}.png")
                resize_and_crop(input_path, output_path)

                # Remove old file if it's not already PNG
                if ext != '.png' and input_path != output_path:
                    os.remove(input_path)
                    print(f"Removed: {input_path}")
                break

    print("\nAll test images processed!")
