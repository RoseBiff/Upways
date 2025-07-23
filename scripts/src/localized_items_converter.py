import os
import json

from src.open_files import GameNames
from src.paths import OUTPUT_ITEM_NAMES_PATH


def convert_localized_items_to_json(
    item_vnums: set[int],
):
    item_names = GameNames().data
    filtered = item_names.loc[item_names.index.intersection(item_vnums)]

    for lang, col in filtered.items():
        output_path = OUTPUT_ITEM_NAMES_PATH.format(lang=lang)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        entries = col.to_dict()

        with open(output_path, "w", encoding="utf-8") as outfile:
            json.dump(entries, outfile, indent=2, ensure_ascii=False)

        print(
            f"Localized item names for '{lang}' saved to {output_path} ({len(entries)} entries)"
        )
