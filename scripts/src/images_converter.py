import os
from src.open_files import ItemProto, ImagePaths
from PIL import Image

IMAGES_PATH = os.path.join("data", "item")
OUTPUT_PATH = os.path.join("public", "data", "item")


def convert_images_to_png(item_proto: ItemProto):
    equipment_vnums = item_proto.equipment_vnums
    image_paths = ImagePaths(equipment_vnums).data

    os.makedirs(OUTPUT_PATH, exist_ok=True)
    count = 0

    for vnum, image_filename in image_paths.items():
        input_path = os.path.join(IMAGES_PATH, image_filename)

        if not os.path.exists(input_path):
            print(f"Image file {input_path} does not exist.")
            continue

        tga_image = Image.open(input_path)

        output_path = os.path.join(OUTPUT_PATH, f"{vnum}.png")

        tga_image.save(output_path, "PNG")
        count += 1

    print(f"{count} item images saved to {OUTPUT_PATH}")
