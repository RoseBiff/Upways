import os
import json
import re
from src.open_files import GameNames


OUTPUT_JSON_PATH = os.path.join("public", "data", "locale", "{lang}", "item_names.json")


def convert_localized_items_to_json(
    equipment_vnums: list[int], up_item_vnums: list[int]
):
    item_names = GameNames().data

    filtered = item_names.loc[
        item_names.index.intersection(equipment_vnums + up_item_vnums)
    ]

    for col in filtered.columns:
        filtered[col] = filtered[col].map(lambda x: re.sub(r"\s?\+\d+$", "", x))

    for lang, col in filtered.items():
        output_path = OUTPUT_JSON_PATH.format(lang=lang)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as outfile:
            json.dump(col.to_dict(), outfile, indent=2, ensure_ascii=False)

        print(f"Localized item names for '{lang}' saved to {output_path}")
