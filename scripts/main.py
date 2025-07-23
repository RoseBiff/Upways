import os

from src.refine_proto_converter import convert_refine_proto_to_json
from src.equipment_data import convert_equipment_data
from src.localized_items_converter import convert_localized_items_to_json
from src.images_converter import convert_images_to_png
from src.data_verification import data_verification


UP_ITEM_VNUMS = [
    25040,  # Blessing Scroll
    39007,  # Blacksmith Manual
    39022,  # Dragon God Scroll
    39014,  # War Scroll
    25041,  # Magic Stone
]

if __name__ == "__main__":
    os.makedirs(os.path.join("public", "data"), exist_ok=True)

    equipment_vnums = convert_equipment_data()
    material_vnums = convert_refine_proto_to_json()

    item_vnums = set(equipment_vnums + material_vnums + UP_ITEM_VNUMS)

    convert_images_to_png(item_vnums)
    convert_localized_items_to_json(item_vnums)

    data_verification()
