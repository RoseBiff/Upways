import os

# inputs
IMAGES_PATH = os.path.join("data", "item")
ITEM_PROTO_PATH = os.path.join("data", "item_proto.txt")
ITEM_NAMES_PATH = os.path.join("data", "locale", "{lang}", "item_names.txt")
ITEM_LIST_PATH = os.path.join("data", "item_list.txt")
INGAME_EQUIPMENT_VNUMS_PATH = os.path.join("data", "ingame_equipment_vnums.txt")
REFINE_PROTO_PATH = os.path.join("data", "refine_proto.sql")

# outputs
EQUIPMENT_REFINES_PATH = os.path.join("public", "data", "equipment_refines.json")
OUTPUT_IMAGE_PATH = os.path.join("public", "data", "item")
OUTPUT_ITEM_NAMES_PATH = os.path.join(
    "public", "data", "locale", "{lang}", "item_names.json"
)
OUTPUT_REFINE_PROTO_PATH = os.path.join("public", "data", "refine_proto.json")
