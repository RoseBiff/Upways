import os
import json

from src.open_files import ItemProto

OUTPUT_JSON_PATH = os.path.join("public", "data", "equipment_refines.json")


def convert_equipment_data():
    visited_vnums = set()
    equipment_data = {}

    data = ItemProto().data
    refine_set_col = ItemProto.REFINE_SET
    refined_vnum_col = ItemProto.REFINED_VNUM

    equipment_vnums = data.index[data[refine_set_col] > 0].tolist()

    for vnum in equipment_vnums:
        if vnum in visited_vnums:
            continue

        current_vnum = vnum
        refine_sets = []
        equipment_data[vnum] = refine_sets

        while True:
            visited_vnums.add(current_vnum)

            refine_set = data.at[current_vnum, refine_set_col]
            refined_vnum = data.at[current_vnum, refined_vnum_col]

            if refined_vnum == 0:
                break

            refine_sets.append(int(refine_set))
            current_vnum = refined_vnum

        if len(refine_sets) < 8:
            del equipment_data[vnum]

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as outfile:
        json.dump(equipment_data, outfile, indent=2, ensure_ascii=False)

    print(
        f"Equipment refine chains saved to {OUTPUT_JSON_PATH} ({len(equipment_data)} entries)"
    )

    return equipment_data
