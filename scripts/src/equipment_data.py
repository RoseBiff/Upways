import json

from src.open_files import ItemProto
from src.open_files import get_equipment_vnums
from src.paths import EQUIPMENT_REFINES_PATH


def convert_equipment_data():
    visited_vnums = set()
    equipment_data = {}

    data = ItemProto().data
    name_col = ItemProto.NAME
    refine_set_col = ItemProto.REFINE_SET
    refined_vnum_col = ItemProto.REFINED_VNUM

    equipment_vnums = get_equipment_vnums()

    for vnum in equipment_vnums:
        if vnum in visited_vnums:
            continue

        current_vnum = vnum
        refine_sets = []
        equipment_data[vnum] = refine_sets
        current_upgrade = 0

        while True:
            visited_vnums.add(current_vnum)

            refine_set = data.at[current_vnum, refine_set_col]
            refined_vnum = data.at[current_vnum, refined_vnum_col]

            if refined_vnum == 0 or refine_set == 0:
                break

            try:
                proto_upgrade = int(data.at[current_vnum, name_col].split("+")[1])
            except (IndexError, ValueError):
                print(f"Invalid format for equipment {current_vnum}.")
                break

            if proto_upgrade != current_upgrade:
                visited_vnums.remove(current_vnum)
                refine_sets.pop()
                break

            refine_sets.append(int(refine_set))
            current_vnum = refined_vnum

            current_upgrade += 1

        if len(refine_sets) < 8:
            print(f"Equipment {vnum} has less than 8 refines.")

    with open(EQUIPMENT_REFINES_PATH, "w", encoding="utf-8") as outfile:
        json.dump(equipment_data, outfile, indent=2, ensure_ascii=False)

    print(
        f"Equipment refine chains saved to {EQUIPMENT_REFINES_PATH} ({len(equipment_data)} entries)"
    )

    return equipment_vnums
