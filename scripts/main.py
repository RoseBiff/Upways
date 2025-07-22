import os

from src.refine_proto_converter import convert_refine_proto_to_json
from src.equipment_data import convert_equipment_data
from src.localized_items_converter import convert_localized_items_to_json
from src.images_converter import convert_images_to_png

if __name__ == "__main__":
    os.makedirs(os.path.join("public", "data"), exist_ok=True)

    equipment_data = convert_equipment_data()
    equipment_vnums = list(equipment_data.keys())

    convert_images_to_png(equipment_vnums)
    convert_refine_proto_to_json()
    convert_localized_items_to_json(equipment_vnums)
