import json

from src.paths import EQUIPMENT_REFINES_PATH, OUTPUT_REFINE_PROTO_PATH


def data_verification():
    with open(EQUIPMENT_REFINES_PATH, "r") as file:
        equipment_data: dict = json.load(file)

    with open(OUTPUT_REFINE_PROTO_PATH, "r") as file:
        refine_data: dict = json.load(file)

    know_refines = set([int(refine_set) for refine_set in refine_data.keys()])

    has_error = False

    for vnum, refines in equipment_data.items():
        for refine_set in refines:
            if refine_set not in know_refines:
                print(
                    f"Refine set {refine_set} not found in refine data for equipment {vnum}."
                )
                has_error = True
                continue

    print("=" * 40)
    if has_error:
        print("Data verification failed.")
    else:
        print("Data verification passed.")
