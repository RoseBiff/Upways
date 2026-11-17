"""Serveur local pour tester le site : python scripts/serve.py (port 8000 par défaut).

Comme « python -m http.server », mais le navigateur ne garde aucun fichier en cache : après une
modification, un simple rechargement de la page prend toujours la dernière version de chaque
fichier JS (sinon le navigateur peut mélanger d'anciens et de nouveaux modules, et le site plante).
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent   # dossier du site


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('', port), handler) as server:
        print(f'Upways : http://localhost:{port}/  (Ctrl+C pour arrêter)')
        server.serve_forever()
