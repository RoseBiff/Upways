import pandas as pd

from src.paths import (
    ITEM_PROTO_PATH,
    ITEM_LIST_PATH,
    INGAME_EQUIPMENT_VNUMS_PATH,
    ITEM_NAMES_PATH,
)


LANGS_DATA = {
    "de": {"encoding": "ISO-8859-1"},
    "en": {"encoding": "ISO-8859-1"},
    "fr": {"encoding": "Windows-1252"},
    "ro": {"encoding": "ISO-8859-16"},
    "tr": {"encoding": "Windows-1254"},
}


class ItemProto:
    VNUM = "Vnum"
    REFINED_VNUM = "RefinedVnum"
    REFINE_SET = "RefineSet"
    SEP = "\t"

    def __init__(self):
        self.data = self._read_file()

    def _read_file(self):
        data = pd.read_csv(
            ITEM_PROTO_PATH,
            encoding_errors="ignore",
            sep=self.SEP,
            usecols=[self.VNUM, self.REFINED_VNUM, self.REFINE_SET],
        )

        data = data[data[self.VNUM].str.isdigit()]
        data[self.VNUM] = data[self.VNUM].astype(int)
        data = data.set_index(self.VNUM)

        return data


class GameNames:
    VNUM = "vnum"
    SEPARATOR = "\t"

    def __init__(self):
        self.data = self._get_data(ITEM_NAMES_PATH)

    def _read_csv(self, path: str, lang: str, encoding: str):
        names = pd.read_csv(
            filepath_or_buffer=path.format(lang=lang),
            index_col=0,
            usecols=[0, 1],
            names=[self.VNUM, lang],
            encoding=encoding,
            sep=self.SEPARATOR,
            skiprows=1,
        )

        return names[lang]

    def _get_data(self, path: str):
        return pd.concat(
            (
                self._read_csv(path, lang, data["encoding"])
                for lang, data in LANGS_DATA.items()
            ),
            axis=1,
        )


class ImagePaths:
    VNUM = "Vnum"
    PATH = "Path"

    def __init__(self):
        self.data = self._read_csv()
        self._convert_data()

    def _read_csv(self):
        data = pd.read_csv(
            ITEM_LIST_PATH,
            sep="\t",
            usecols=[0, 2],
            names=[self.VNUM, self.PATH],
            index_col=0,
        )

        return data[self.PATH]

    def _convert_data(self):
        self.data: pd.Series = self.data.str.extract(r"([^/]+\.tga)$").squeeze()


def get_equipment_vnums():
    with open(INGAME_EQUIPMENT_VNUMS_PATH, "r") as file:
        vnums = [int(line.strip()) for line in file if line.strip().isdigit()]

    return vnums
