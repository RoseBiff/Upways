#!/usr/bin/env python3
"""Monte (ou remet d'aplomb) le serveur Discord d'Upways.

    python scripts/discord/setup_server.py --dry-run   # montre ce qui serait fait, ne touche à rien
    python scripts/discord/setup_server.py             # applique

Aucune dépendance (Python 3.9+). Le script est relançable : il retrouve ce qu'il a déjà
créé grâce à state.json (identifiants Discord, rien de secret) et ne modifie que ce qui
diffère de la configuration ci-dessous. Il ne supprime jamais rien.

Le token du bot est lu dans discordbot.txt à la racine du dépôt (ignoré par Git et par
.assetsignore). Le bot doit être invité sur le serveur avec le droit Administrateur.

Pour changer la structure ou les textes : modifier la section CONFIGURATION puis relancer.
"""
import argparse
import base64
import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
TOKEN_FILE = ROOT / "discordbot.txt"
STATE_FILE = HERE / "state.json"
ICON_FILE = HERE / "server-icon.png"
API = "https://discord.com/api/v10"
SITE = "https://metin2upways.com"

# Permissions Discord (bits)
ADD_REACTIONS = 1 << 6
ADMINISTRATOR = 1 << 3
VIEW_CHANNEL = 1 << 10
SEND_MESSAGES = 1 << 11
MENTION_EVERYONE = 1 << 17
CREATE_PUBLIC_THREADS = 1 << 35
CREATE_PRIVATE_THREADS = 1 << 36
READ_ONLY_DENY = SEND_MESSAGES | CREATE_PUBLIC_THREADS | CREATE_PRIVATE_THREADS

FORUM_REQUIRE_TAG = 1 << 4
THREAD_PINNED = 1 << 1

# ─────────────────────────────── CONFIGURATION ───────────────────────────────

COLOR_PRIMARY = 0x6366F1    # --primary du site
COLOR_GOLD = 0xF59E0B       # --secondary du site

SERVER_DESCRIPTION = "Upways, l'optimiseur d'amélioration Metin2 · Metin2 upgrade optimizer"
SET_BOT_AVATAR = True       # donne au bot la même image que le serveur

ROLES = [
    {"key": "admin", "name": "Admin", "color": COLOR_GOLD, "hoist": True,
     "permissions": ADMINISTRATOR, "give_to_owner": True},
    {"key": "contributor", "name": "Contributeur · Contributor", "color": 0x818CF8, "hoist": True,
     "permissions": 0},
]

# « aliases » = anciens noms à reprendre (les salons créés par défaut par Discord sont
# renommés au lieu d'être supprimés).
STRUCTURE = [
    {"key": "cat_info", "name": "📢 Info", "channels": [
        {"key": "welcome", "name": "bienvenue-welcome", "kind": "text", "read_only": True,
         "topic": "Présentation et règles · About and rules"},
        {"key": "news", "name": "annonces-news", "kind": "news", "read_only": True,
         "topic": f"Mises à jour d'Upways · Upways updates · {SITE}"},
    ]},
    {"key": "cat_upways", "name": "🛠️ Upways", "channels": [
        {"key": "feedback", "name": "suggestions-bugs", "kind": "forum",
         "topic": (
             "🇫🇷 Un post = une idée, un bug ou une donnée fausse. Choisis un tag, indique l'objet, "
             "le niveau (+X) et la langue du site. Une capture d'écran aide beaucoup.\n\n"
             "🇬🇧 One post = one idea, bug or wrong data. Pick a tag, name the item, the level (+X) "
             "and the site language. A screenshot helps a lot."),
         "reaction": "👍",
         "tags": [
             {"name": "Idée · Idea", "emoji": "💡"},
             {"name": "Bug", "emoji": "🐛"},
             {"name": "Données · Data", "emoji": "📊"},
             {"name": "Question", "emoji": "❓"},
             {"name": "En cours · WIP", "emoji": "🚧", "moderated": True},
             {"name": "Fait · Done", "emoji": "✅", "moderated": True},
             {"name": "Info", "emoji": "📌", "moderated": True},
         ]},
    ]},
    {"key": "cat_community", "name": "💬 Communauté · Community",
     "aliases": ["Salons textuels", "Text Channels"], "channels": [
        {"key": "general_fr", "name": "général-fr", "kind": "text", "aliases": ["général", "general"],
         "topic": "Discussion en français"},
        {"key": "general_en", "name": "general-en", "kind": "text", "topic": "English chat"},
        {"key": "voice", "name": "Vocal · Voice", "kind": "voice", "aliases": ["Général", "General"]},
    ]},
    {"key": "cat_staff", "name": "🔒 Staff", "private": True,
     "aliases": ["Salons vocaux", "Voice Channels"], "channels": [
        {"key": "staff", "name": "staff", "kind": "text",
         "topic": "Salon privé de l'équipe + notifications de Discord"},
    ]},
]

# Dans les textes, {#clé} devient une mention du salon correspondant.
WELCOME_FR = f"""**Upways** calcule la stratégie la moins chère pour améliorer tes objets sur Metin2, avec le nombre de tentatives à prévoir.
🔗 {SITE}

**Où aller**
{{#news}} : les mises à jour du site
{{#feedback}} : une idée, un bug ou une donnée fausse (taux, matériaux, nom d'objet)
{{#general_fr}} : pour discuter

**Règles**
1. Reste correct : ni insultes ni harcèlement.
2. Pas de pub, pas de spam.
3. Pas de vente contre de l'argent réel (comptes, yang, objets).
4. Pas de triche : ni hacks ni bots de jeu.
5. Français dans les salons FR, anglais dans les salons EN."""

WELCOME_EN = f"""**Upways** works out the cheapest strategy to upgrade your Metin2 items, and how many attempts to expect.
🔗 {SITE}

**Where to go**
{{#news}}: site updates
{{#feedback}}: an idea, a bug or wrong data (rates, materials, item name)
{{#general_en}}: to chat

**Rules**
1. Be decent: no insults, no harassment.
2. No ads, no spam.
3. No real-money trading (accounts, yang, items).
4. No cheating: no hacks, no game bots.
5. French in the FR channels, English in the EN channels."""

GUIDE_FR = """**Avant de poster**, cherche si le sujet existe déjà : un 👍 dessus vaut mieux qu'un doublon.

**Bug ou donnée fausse** : indique
• l'objet et le niveau concernés (ex. +7 → +9)
• ce que le site affiche et ce que tu attendais
• la langue du site, et si tu es sur mobile ou sur PC
• une capture d'écran si possible

**Idée** : décris ce que tu essaies de faire, pas seulement la solution.

Les tags 🚧 En cours et ✅ Fait sont posés par l'équipe pour le suivi."""

GUIDE_EN = """**Before posting**, check whether the topic already exists: a 👍 on it beats a duplicate.

**Bug or wrong data**: tell us
• the item and the level involved (e.g. +7 → +9)
• what the site shows and what you expected
• the site language, and whether you are on mobile or PC
• a screenshot if you can

**Idea**: describe what you are trying to do, not only the solution.

The 🚧 WIP and ✅ Done tags are set by the team to track progress."""

# « once » : posté une seule fois, jamais retouché ensuite (libre à toi de le modifier ou de le supprimer).
MESSAGES = {
    "welcome": [{"embeds": [
        {"title": "🇫🇷 Bienvenue sur le Discord d'Upways", "description": WELCOME_FR, "color": COLOR_PRIMARY},
        {"title": "🇬🇧 Welcome to the Upways Discord", "description": WELCOME_EN, "color": COLOR_PRIMARY},
    ]}],
    "news": [{"once": True, "embeds": [
        {"title": "🎉 Le Discord d'Upways est ouvert",
         "description": "Les mises à jour du site seront annoncées ici.\nUne idée, un bug, une donnée fausse ? Poste dans {#feedback}.",
         "color": COLOR_GOLD},
        {"title": "🎉 The Upways Discord is open",
         "description": "Site updates will be announced here.\nAn idea, a bug, wrong data? Post in {#feedback}.",
         "color": COLOR_GOLD},
    ]}],
    "general_fr": [{"once": True, "content":
        "👋 Bienvenue ! Dis-nous sur quel serveur tu joues et ce que tu essaies de monter en ce moment."}],
    "general_en": [{"once": True, "content":
        "👋 Welcome! Tell us which server you play on and what you are upgrading right now."}],
}

FORUM_GUIDE = {
    "forum": "feedback", "tag": "Info",
    "name": "📌 Comment poster · How to post",
    "embeds": [
        {"title": "🇫🇷 Comment poster", "description": GUIDE_FR, "color": COLOR_PRIMARY},
        {"title": "🇬🇧 How to post", "description": GUIDE_EN, "color": COLOR_PRIMARY},
    ],
}

# ──────────────────────────────── MÉCANIQUE ────────────────────────────────

DRY = False
_dry_n = 0
TOKEN = ""
CHANGES = 0
TYPE = {"category": 4, "text": 0, "news": 5, "voice": 2, "forum": 15}
GROUP = {"category": {4}, "text": {0, 5}, "news": {0, 5}, "voice": {2}, "forum": {15}}


class ApiError(Exception):
    def __init__(self, method, path, code, body):
        super().__init__(f"{method} {path} → HTTP {code} : {body[:400]}")
        self.code = code


def log(sign, text):
    print(f"  {sign} {text}", flush=True)


def changed(text):
    global CHANGES
    CHANGES += 1
    log("~" if not DRY else "→", text)


def api(method, path, body=None):
    """Appel à l'API Discord. En --dry-run, tout ce qui n'est pas une lecture est simulé."""
    global _dry_n
    write = method != "GET"
    if DRY and write:
        _dry_n += 1
        fake = dict(body) if isinstance(body, dict) else {}
        fake.setdefault("id", f"dry-{_dry_n}")
        return fake
    data = None
    if write:
        data = json.dumps(body if body is not None else {}).encode("utf-8")
    for _ in range(6):
        req = urllib.request.Request(API + path, data=data, method=method, headers={
            "Authorization": "Bot " + TOKEN,
            "Content-Type": "application/json",
            "User-Agent": f"DiscordBot ({SITE}, 1.0)",
        })
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                raw = resp.read()
            if write:
                time.sleep(0.3)
            return json.loads(raw) if raw else None
        except urllib.error.HTTPError as err:
            raw = err.read().decode("utf-8", "replace")
            if err.code == 429:
                try:
                    wait = float(json.loads(raw).get("retry_after", 2))
                except ValueError:
                    wait = 2.0
                if wait > 30:
                    raise ApiError(method, path, 429,
                                   f"Discord demande d'attendre {wait:.0f} s (limite de renommage d'un salon). "
                                   "Relance le script plus tard.") from None
                time.sleep(wait + 0.3)
                continue
            raise ApiError(method, path, err.code, raw) from None
    raise ApiError(method, path, 429, "trop de tentatives")


def is_real(snowflake):
    return bool(snowflake) and not str(snowflake).startswith("dry-")


def data_uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def fill(text, channel_ids):
    for key, cid in channel_ids.items():
        text = text.replace("{#" + key + "}", f"<#{cid}>")
    return text


def render(spec, channel_ids):
    out = {"content": fill(spec.get("content", ""), channel_ids)}
    out["embeds"] = [{"title": e["title"], "description": fill(e["description"], channel_ids),
                      "color": e["color"]} for e in spec.get("embeds", [])]
    return out


def same_message(existing, wanted):
    if (existing.get("content") or "") != wanted["content"]:
        return False
    got = [(e.get("title"), e.get("description"), e.get("color")) for e in existing.get("embeds", [])]
    return got == [(e["title"], e["description"], e["color"]) for e in wanted["embeds"]]


def norm_overwrites(items):
    return sorted((str(o["id"]), int(o["type"]), int(o["allow"]), int(o["deny"])) for o in items)


# ── étapes ──

def pick_guild(state, forced):
    guilds = api("GET", "/users/@me/guilds")
    wanted = forced or state.get("guild_id")
    if wanted:
        if not any(g["id"] == wanted for g in guilds):
            sys.exit(f"Le bot n'est pas sur le serveur {wanted}.")
        return wanted
    if len(guilds) != 1:
        names = ", ".join(f"{g['name']} ({g['id']})" for g in guilds) or "aucun"
        sys.exit(f"Le bot est sur {len(guilds)} serveurs ({names}) : précise lequel avec --guild ID.")
    return guilds[0]["id"]


def setup_settings(guild, state):
    print("Réglages du serveur")
    patch = {}
    if guild["verification_level"] < 1:
        patch["verification_level"] = 1           # e-mail vérifié pour écrire
    if guild["explicit_content_filter"] != 2:
        patch["explicit_content_filter"] = 2      # analyse des médias de tous les membres
    if guild["default_message_notifications"] != 1:
        patch["default_message_notifications"] = 1  # notifications : mentions seulement
    if ICON_FILE.exists():
        digest = hashlib.sha256(ICON_FILE.read_bytes()).hexdigest()
        if state.get("icon_sha256") != digest or not guild.get("icon"):
            patch["icon"] = data_uri(ICON_FILE)
            state["icon_sha256"] = digest
    if patch:
        api("PATCH", f"/guilds/{guild['id']}", patch)
        changed("réglages : " + ", ".join(patch))
    else:
        log("✓", "déjà en place")


def setup_roles(guild, state):
    print("Rôles")
    gid = guild["id"]
    existing = api("GET", f"/guilds/{gid}/roles")
    by_id = {r["id"]: r for r in existing}
    ids = state.setdefault("roles", {})

    everyone = by_id[gid]
    perms = int(everyone["permissions"])
    if perms & MENTION_EVERYONE:
        api("PATCH", f"/guilds/{gid}/roles/{gid}", {"permissions": str(perms & ~MENTION_EVERYONE)})
        changed("@everyone ne peut plus mentionner @everyone / @here")

    for spec in ROLES:
        role = by_id.get(ids.get(spec["key"])) or next((r for r in existing if r["name"] == spec["name"]), None)
        want = {"name": spec["name"], "color": spec["color"], "hoist": spec["hoist"],
                "permissions": str(spec["permissions"])}
        if role is None:
            role = api("POST", f"/guilds/{gid}/roles", want)
            changed(f"rôle créé : {spec['name']}")
        else:
            diff = {k: v for k, v in want.items() if str(role.get(k)) != str(v)}
            if diff:
                api("PATCH", f"/guilds/{gid}/roles/{role['id']}", diff)
                changed(f"rôle mis à jour : {spec['name']} ({', '.join(diff)})")
            else:
                log("✓", spec["name"])
        ids[spec["key"]] = role["id"]

        if spec.get("give_to_owner"):
            owner = api("GET", f"/guilds/{gid}/members/{guild['owner_id']}")
            if role["id"] not in owner["roles"]:
                api("PUT", f"/guilds/{gid}/members/{guild['owner_id']}/roles/{role['id']}")
                changed(f"rôle {spec['name']} donné au propriétaire du serveur")
    return ids


def wanted_overwrites(spec, gid, role_ids):
    if spec.get("private"):
        return [{"id": gid, "type": 0, "allow": "0", "deny": str(VIEW_CHANNEL)},
                {"id": role_ids["admin"], "type": 0, "allow": str(VIEW_CHANNEL), "deny": "0"}]
    if spec.get("read_only"):
        return [{"id": gid, "type": 0, "allow": str(ADD_REACTIONS), "deny": str(READ_ONLY_DENY)}]
    return None   # pas de règle imposée : on laisse les permissions telles qu'elles sont


def merged_tags(spec, current):
    """Tags voulus (en gardant l'identifiant des existants) + tags ajoutés à la main, conservés."""
    by_name = {t["name"]: t for t in current}
    out = []
    for tag in spec["tags"]:
        item = {"name": tag["name"], "emoji_name": tag.get("emoji"), "emoji_id": None,
                "moderated": bool(tag.get("moderated"))}
        if by_name.get(tag["name"], {}).get("id"):
            item["id"] = by_name[tag["name"]]["id"]
        out.append(item)
    wanted_names = {t["name"] for t in spec["tags"]}
    for tag in current:
        if tag["name"] not in wanted_names and tag.get("id"):
            out.append({"id": tag["id"], "name": tag["name"], "emoji_name": tag.get("emoji_name"),
                        "emoji_id": tag.get("emoji_id"), "moderated": tag.get("moderated", False)})
    return out


def tag_signature(tags):
    return [(t["name"], t.get("emoji_name"), bool(t.get("moderated"))) for t in tags]


def ensure_channel(spec, kind, parent_id, position, ctx):
    gid, existing, claimed, ids = ctx["gid"], ctx["channels"], ctx["claimed"], ctx["ids"]
    group = GROUP[kind]
    pool = [c for c in existing if c["type"] in group and c["id"] not in claimed]

    found = next((c for c in existing if c["id"] == ids.get(spec["key"]) and c["id"] not in claimed), None)
    for name in [spec["name"]] + spec.get("aliases", []):
        if found:
            break
        found = next((c for c in pool if c["name"] == name), None)

    want_type = TYPE[kind]
    if kind == "news" and not ctx["community"]:
        want_type = 0     # un salon d'annonces exige le mode Communauté : converti plus tard
    overwrites = wanted_overwrites(spec, gid, ctx["role_ids"])

    if found is None:
        body = {"name": spec["name"], "type": want_type, "position": position}
        if parent_id:
            body["parent_id"] = parent_id
        if spec.get("topic"):
            body["topic"] = spec["topic"]
        if overwrites is not None:
            body["permission_overwrites"] = overwrites
        if kind == "forum":
            body["available_tags"] = merged_tags(spec, [])
        found = api("POST", f"/guilds/{gid}/channels", body)
        found.setdefault("type", want_type)
        changed(f"créé : {spec['name']}")
        created = True
    else:
        created = False

    diff = {}
    if found.get("name") != spec["name"]:
        diff["name"] = spec["name"]
    if kind != "category" and (found.get("parent_id") or None) != (parent_id or None):
        diff["parent_id"] = parent_id
    if kind in ("text", "news", "forum") and (found.get("topic") or "") != spec.get("topic", ""):
        diff["topic"] = spec.get("topic", "")
    if overwrites is not None and \
            norm_overwrites(found.get("permission_overwrites", [])) != norm_overwrites(overwrites):
        diff["permission_overwrites"] = overwrites
    if kind == "news" and ctx["community"] and found.get("type") == 0:
        diff["type"] = 5
    if kind == "forum":
        tags = merged_tags(spec, found.get("available_tags", []))
        if tag_signature(found.get("available_tags", [])) != tag_signature(tags):
            diff["available_tags"] = tags
        if not int(found.get("flags", 0)) & FORUM_REQUIRE_TAG:
            diff["flags"] = int(found.get("flags", 0)) | FORUM_REQUIRE_TAG
        if (found.get("default_reaction_emoji") or {}).get("emoji_name") != spec.get("reaction"):
            diff["default_reaction_emoji"] = {"emoji_name": spec.get("reaction"), "emoji_id": None}
        if found.get("default_forum_layout") != 1:
            diff["default_forum_layout"] = 1      # vue liste
        if found.get("default_sort_order") != 0:
            diff["default_sort_order"] = 0        # activité récente d'abord

    if diff:
        old_name = found.get("name")
        updated = api("PATCH", f"/channels/{found['id']}", diff)
        if not DRY:
            found.update(updated)
        if not created:
            label = spec["name"] if old_name == spec["name"] else f"{old_name} → {spec['name']}"
            changed(f"mis à jour : {label} ({', '.join(diff)})")
    elif not created:
        log("✓", spec["name"])

    claimed.add(found["id"])
    ids[spec["key"]] = found["id"]
    ctx["live"][spec["key"]] = found
    return found


def setup_channels(guild, state, role_ids):
    print("Catégories et salons")
    gid = guild["id"]
    ctx = {"gid": gid, "channels": api("GET", f"/guilds/{gid}/channels"), "claimed": set(),
           "ids": state.setdefault("channels", {}), "role_ids": role_ids,
           "community": "COMMUNITY" in guild["features"], "live": {}}
    order = []
    for ci, cat in enumerate(STRUCTURE):
        category = ensure_channel(cat, "category", None, ci, ctx)
        order.append((category, ci, None))
        for chi, ch in enumerate(cat["channels"]):
            spec = dict(ch, private=cat.get("private", False))
            channel = ensure_channel(spec, ch["kind"], category["id"], chi, ctx)
            order.append((channel, chi, category["id"]))

    moves = [{"id": c["id"], "position": pos} for c, pos, _ in order if is_real(c["id"])]
    if any(c.get("position") != pos for c, pos, _ in order if is_real(c["id"])) and moves:
        api("PATCH", f"/guilds/{gid}/channels", moves)
        changed("ordre des salons")
    return ctx


def setup_community(guild, state, ctx):
    print("Mode Communauté")
    gid, ids = guild["id"], ctx["ids"]
    if "COMMUNITY" not in guild["features"]:
        mutable = {"COMMUNITY", "DISCOVERABLE", "INVITES_DISABLED", "RAID_ALERTS_DISABLED"}
        features = sorted((set(guild["features"]) & mutable) | {"COMMUNITY"})
        try:
            api("PATCH", f"/guilds/{gid}", {
                "features": features, "verification_level": max(1, guild["verification_level"]),
                "explicit_content_filter": 2,
                "rules_channel_id": ids["welcome"], "public_updates_channel_id": ids["staff"]})
            changed("mode Communauté activé (règles : bienvenue-welcome, notifications : staff)")
            ctx["community"] = True
        except ApiError as err:
            log("!", f"activation impossible par le bot : {err}")
            log("!", "À faire à la main : Paramètres du serveur → Activer la communauté, puis relancer.")
            return
    else:
        log("✓", "déjà activé")
        ctx["community"] = True

    news = ctx["live"].get("news")
    if news and news.get("type") == 0:
        api("PATCH", f"/channels/{news['id']}", {"type": 5})
        changed("annonces-news converti en salon d'annonces")
    if (guild.get("description") or "") != SERVER_DESCRIPTION:
        api("PATCH", f"/guilds/{gid}", {"description": SERVER_DESCRIPTION})
        changed("description du serveur")


def setup_messages(state, ctx):
    print("Messages")
    ids = ctx["ids"]
    store = state.setdefault("messages", {})
    for key, specs in MESSAGES.items():
        cid = ids[key]
        known = store.setdefault(key, [])
        for i, spec in enumerate(specs):
            wanted = render(spec, ids)
            mid = known[i] if i < len(known) else None
            if mid and spec.get("once"):
                log("✓", f"{key} #{i + 1} (posté une fois, laissé tel quel)")
                continue
            current = None
            if mid:
                try:
                    current = api("GET", f"/channels/{cid}/messages/{mid}")
                except ApiError as err:
                    if err.code != 404:
                        raise
            if current is None:
                msg = api("POST", f"/channels/{cid}/messages", wanted)
                changed(f"{key} #{i + 1} posté")
                if i < len(known):
                    known[i] = msg["id"]
                else:
                    known.append(msg["id"])
            elif not same_message(current, wanted):
                api("PATCH", f"/channels/{cid}/messages/{mid}", wanted)
                changed(f"{key} #{i + 1} mis à jour")
            else:
                log("✓", f"{key} #{i + 1}")


def setup_forum_guide(state, ctx):
    print("Post épinglé du forum")
    ids = ctx["ids"]
    forum = ctx["live"][FORUM_GUIDE["forum"]]
    wanted = render(FORUM_GUIDE, ids)
    tid = state.get("forum_guide")
    current = None
    if tid:
        try:
            current = api("GET", f"/channels/{tid}/messages/{tid}")
        except ApiError as err:
            if err.code != 404:
                raise
    if current is None:
        tag = next((t.get("id") for t in forum.get("available_tags", []) if t["name"] == FORUM_GUIDE["tag"]), None)
        body = {"name": FORUM_GUIDE["name"], "auto_archive_duration": 10080, "message": wanted}
        if is_real(tag):
            body["applied_tags"] = [tag]
        thread = api("POST", f"/channels/{forum['id']}/threads", body)
        api("PATCH", f"/channels/{thread['id']}", {"flags": THREAD_PINNED})
        state["forum_guide"] = thread["id"]
        changed("post « Comment poster » créé et épinglé")
    elif not same_message(current, wanted):
        api("PATCH", f"/channels/{tid}", {"archived": False})
        api("PATCH", f"/channels/{tid}/messages/{tid}", wanted)
        changed("post « Comment poster » mis à jour")
    else:
        log("✓", "Comment poster · How to post")


def setup_invite(state, ctx):
    print("Lien d'invitation")
    code = state.get("invite")
    if code:
        try:
            api("GET", f"/invites/{code}")
            log("✓", f"https://discord.gg/{code}")
            return
        except ApiError as err:
            if err.code != 404:
                raise
    invite = api("POST", f"/channels/{ctx['ids']['welcome']}/invites", {"max_age": 0, "max_uses": 0, "unique": False})
    if not DRY:
        state["invite"] = invite["code"]
        changed(f"invitation permanente créée : https://discord.gg/{invite['code']}")
    else:
        changed("invitation permanente à créer")


def setup_bot_avatar(state):
    if not (SET_BOT_AVATAR and ICON_FILE.exists()):
        return
    print("Avatar du bot")
    digest = hashlib.sha256(ICON_FILE.read_bytes()).hexdigest()
    if state.get("bot_avatar_sha256") == digest:
        log("✓", "déjà en place")
        return
    api("PATCH", "/users/@me", {"avatar": data_uri(ICON_FILE)})
    state["bot_avatar_sha256"] = digest
    changed("avatar du bot")


def main():
    global DRY, TOKEN
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")   # console Windows
        except AttributeError:
            pass
    parser = argparse.ArgumentParser(description="Monte le serveur Discord d'Upways.")
    parser.add_argument("--dry-run", action="store_true", help="montre ce qui serait fait sans rien modifier")
    parser.add_argument("--guild", help="identifiant du serveur (si le bot est sur plusieurs serveurs)")
    args = parser.parse_args()
    DRY = args.dry_run

    if not TOKEN_FILE.exists():
        sys.exit(f"Token introuvable : {TOKEN_FILE}")
    TOKEN = TOKEN_FILE.read_text(encoding="utf-8-sig").strip()
    state = json.loads(STATE_FILE.read_text(encoding="utf-8")) if STATE_FILE.exists() else {}

    gid = pick_guild(state, args.guild)
    guild = api("GET", f"/guilds/{gid}")
    print(f"Serveur : {guild['name']} ({gid})" + ("  [essai à blanc]" if DRY else ""))
    state["guild_id"] = gid

    try:
        setup_settings(guild, state)
        role_ids = setup_roles(guild, state)
        ctx = setup_channels(guild, state, role_ids)
        setup_community(guild, state, ctx)
        setup_messages(state, ctx)
        setup_forum_guide(state, ctx)
        setup_invite(state, ctx)
        setup_bot_avatar(state)
    finally:
        if not DRY:
            STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if DRY:
        print(f"\nEssai à blanc : {CHANGES} modification(s) à faire, rien n'a été touché.")
    else:
        print(f"\nTerminé : {CHANGES} modification(s)." + (f"  Invitation : https://discord.gg/{state['invite']}" if state.get("invite") else ""))


if __name__ == "__main__":
    try:
        main()
    except ApiError as err:
        sys.exit(f"\nErreur Discord : {err}")
