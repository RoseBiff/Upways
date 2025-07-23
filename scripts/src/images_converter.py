import os
from src.open_files import ImagePaths
from PIL import Image

from src.paths import IMAGES_PATH, OUTPUT_IMAGE_PATH


def convert_images_to_png(item_vnums: set[int]):
    image_paths = ImagePaths().data

    os.makedirs(OUTPUT_IMAGE_PATH, exist_ok=True)
    count = 0

    for vnum in item_vnums:
        image_filename = image_paths.get(vnum, None)

        if image_filename is None:
            image_filename = f"{vnum}.tga"
            print(
                f"Image for vnum {vnum} not found in paths, using default {image_filename}."
            )

        input_path = os.path.join(IMAGES_PATH, image_filename)

        if not os.path.exists(input_path):
            print(f"Image file {input_path} does not exist.")
            continue

        output_filename = f"{vnum}.png"
        output_path = os.path.join(OUTPUT_IMAGE_PATH, output_filename)

        if os.path.exists(output_path):
            continue

        tga_image = Image.open(input_path)
        tga_image.save(output_path, "PNG")
        count += 1

    print(f"{count} item images converted and saved to {OUTPUT_IMAGE_PATH}")
