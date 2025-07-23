import re
import json

from src.paths import (
    REFINE_PROTO_PATH,
    OUTPUT_REFINE_PROTO_PATH,
)


COLUMNS = [
    "RefineSet",
    "MaterialVnum1",
    "MaterialCount1",
    "MaterialVnum2",
    "MaterialCount2",
    "MaterialVnum3",
    "MaterialCount3",
    "MaterialVnum4",
    "MaterialCount4",
    "Cost",
    "Prob",
]


def format_materials(entry):
    materials = []

    for i in range(1, 5):
        vnum = entry[f"MaterialVnum{i}"]
        count = entry[f"MaterialCount{i}"]
        if vnum is not None and vnum != 0 and count is not None and count != 0:
            materials.append({"Vnum": int(vnum), "Count": int(count)})
        del entry[f"MaterialVnum{i}"]
        del entry[f"MaterialCount{i}"]

    entry["Materials"] = materials


def convert_refine_proto_to_json():
    with open(REFINE_PROTO_PATH, "r", encoding="utf-8") as file:
        content = file.read()

    # Trouver toutes les lignes contenant des VALUES
    insert_pattern = re.compile(
        r"INSERT INTO `refine_proto`.*?VALUES\s*\((.*?)\);", re.IGNORECASE | re.DOTALL
    )

    entries = {}
    for match in insert_pattern.finditer(content):
        values_raw = match.group(1)
        values = [
            (
                None
                if v.strip().upper() == "NULL"
                else float(v.strip()) if "." in v else int(v.strip())
            )
            for v in values_raw.split(",")
        ]
        entry = dict(zip(COLUMNS, values))
        format_materials(entry)

        entries[entry["RefineSet"]] = entry

    with open(OUTPUT_REFINE_PROTO_PATH, "w", encoding="utf-8") as outfile:
        json.dump(entries, outfile, indent=2, ensure_ascii=False)

    print(f"Refine data saved to {OUTPUT_REFINE_PROTO_PATH} ({len(entries)} entries)")

    # Collect unique MaterialVnum values
    material_vnums = set()
    for entry in entries.values():
        for material in entry["Materials"]:
            material_vnums.add(material["Vnum"])

    print(f"Unique material vnums collected: {len(material_vnums)}")

    return list(material_vnums)
