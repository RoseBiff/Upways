import os
import json
from src.open_files import ImagePaths
from PIL import Image

IMAGES_PATH = os.path.join("data", "item")
OUTPUT_IMAGE_PATH = os.path.join("public", "data", "item")
OUTPUT_ITEM_ICONS_PATH = os.path.join("public", "data", "item_icons.json")


def convert_images_to_png(equipment_vnums: list[int]):
    image_paths = ImagePaths().data
    vnum_to_image = {}

    os.makedirs(OUTPUT_IMAGE_PATH, exist_ok=True)
    count = 0

    for vnum in equipment_vnums:
        image_filename = image_paths.get(vnum, None)

        if image_filename is None:
            image_filename = f"{vnum}.tga"
            print(
                f"Image for vnum {vnum} not found in paths, using default {image_filename}."
            )

        vnum_to_image[vnum] = image_filename

        input_path = os.path.join(IMAGES_PATH, image_filename)

        if not os.path.exists(input_path):
            print(f"Image file {input_path} does not exist.")
            continue

        output_filename = os.path.splitext(image_filename)[0] + ".png"
        output_path = os.path.join(OUTPUT_IMAGE_PATH, output_filename)

        vnum_to_image[vnum] = output_filename

        if os.path.exists(output_path):
            continue

        tga_image = Image.open(input_path)
        tga_image.save(output_path, "PNG")
        count += 1

    # Sauvegarde du dictionnaire en JSON
    with open(OUTPUT_ITEM_ICONS_PATH, "w", encoding="utf-8") as outfile:
        json.dump(vnum_to_image, outfile, indent=2, ensure_ascii=False)

    print(f"{count} item images converted and saved to {OUTPUT_IMAGE_PATH}")
    print(
        f"Vnum to image mappings saved to {OUTPUT_ITEM_ICONS_PATH} ({len(vnum_to_image)} entries)"
    )
