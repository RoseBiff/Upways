import os
import pandas as pd

ITEM_PROTO_PATH = os.path.join("data", "item_proto.txt")
ITEM_NAMES_PATH = os.path.join("data", "locale", "{lang}", "item_names.txt")
ITEM_LIST_PATH = os.path.join("data", "item_list.txt")


LANGS_DATA = {
    "de": {"encoding": "ISO-8859-1"},
    "en": {"encoding": "ISO-8859-1"},
    "fr": {"encoding": "Windows-1252"},
    "ro": {"encoding": "ISO-8859-16"},
    "tr": {"encoding": "Windows-1254"},
}


class ItemProto:
    VNUM = "Vnum"
    REFINE_SET = "RefineSet"
    SEP = "\t"

    def __init__(self):
        self.data = self._read_file()
        self.equipment_vnums = self._get_equipment_vnums()

    def _read_file(self):
        data = pd.read_csv(
            ITEM_PROTO_PATH,
            encoding_errors="ignore",
            sep=self.SEP,
            usecols=[self.VNUM, self.REFINE_SET],
        )

        return data

    def _get_equipment_vnums(self):
        return (
            self.data.loc[self.data[self.REFINE_SET] > 0, self.VNUM]
            .astype(int)
            .tolist()
        )


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

    def __init__(self, vnums: list[int]):
        self.data = self._read_csv()
        self._filter_data(vnums)
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

    def _filter_data(self, vnums: list[int]):
        self.data = self.data.loc[self.data.index.isin(vnums)]

    def _convert_data(self):
        self.data = self.data.str.extract(r"([^/]+\.tga)$").squeeze()
