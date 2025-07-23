import os
import re
import json

INPUT_SQL_PATH = os.path.join("data", "refine_proto.sql")
OUTPUT_JSON_PATH = os.path.join("public", "data", "refine_proto.json")

ITEM_PROTO_PATH = os.path.join("data", "item_proto.txt")

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


def convert_refine_proto_to_json():
    with open(INPUT_SQL_PATH, "r", encoding="utf-8") as file:
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
        entries[entry["RefineSet"]] = entry

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as outfile:
        json.dump(entries, outfile, indent=2, ensure_ascii=False)

    print(f"Refine data saved to {OUTPUT_JSON_PATH} ({len(entries)} entries)")

    # Collect unique MaterialVnum values
    material_vnums = set()
    for entry in entries.values():
        for i in range(1, 5):
            vnum = int(entry[f"MaterialVnum{i}"])
            if vnum is not None and vnum != 0:
                material_vnums.add(vnum)

    print(f"Unique material vnums collected: {len(material_vnums)}")

    return list(material_vnums)
