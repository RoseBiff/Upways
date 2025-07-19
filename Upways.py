import os
import json
import tkinter as tk
from tkinter import ttk
import numpy as np
import customtkinter
from customtkinter import (
    CTkFont, CTkLabel, CTkOptionMenu, CTkButton, CTkFrame
)
from itertools import product

# dark mode and theme
customtkinter.set_appearance_mode("dark")
customtkinter.set_default_color_theme("green")

def ressource_path(image_name):
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "img", image_name)

class ToolTip:
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tooltip = None
        self.widget.bind("<Enter>", self.show_tooltip)
        self.widget.bind("<Leave>", self.hide_tooltip)
    def show_tooltip(self, _=None):
        x, y, _, _ = self.widget.bbox("insert")
        x += self.widget.winfo_rootx() + 20
        y += self.widget.winfo_rooty() + 20
        self.tooltip = tk.Toplevel(self.widget, bg='#373737')
        self.tooltip.wm_overrideredirect(True)
        self.tooltip.wm_geometry(f"+{x}+{y}")
        frame = tk.Frame(self.tooltip, bg='#373737')
        frame.pack(padx=1, pady=1)
        CTkLabel(frame, text=self.text, font=CTkFont(12),
                 fg_color='#1d1e1e', bg_color='#1d1e1e',
                 corner_radius=10).pack()
    def hide_tooltip(self, _=None):
        if self.tooltip:
            self.tooltip.destroy()
            self.tooltip = None

FALLBACK_PRECISION = 100_000

class Item:
    def __init__(self, values, no_downgrade_flags):
        self.values = values
        self.no_downgrade = no_downgrade_flags
        self.matrix = self._build_matrix()
        self.waypoint, self.sum_waypoint = self._compute()
    def _build_matrix(self):
        n = len(self.values)
        P = np.zeros((n+1, n+1))
        for i, rate in enumerate(self.values):
            p = rate / 100.0
            P[i, i+1] = p
            fail = 1 - p
            if i == 0 or self.no_downgrade[i]:
                P[i, i] += fail
            else:
                P[i, i-1] = fail
        P[n, n] = 1.0
        return P
    def _compute(self):
        Q = self.matrix[:-1, :-1]
        I = np.eye(Q.shape[0])
        try:
            N = np.linalg.inv(I - Q)
        except np.linalg.LinAlgError:
            N = I.copy()
            for k in range(1, FALLBACK_PRECISION+1):
                N += np.linalg.matrix_power(Q, k)
        wp = list(np.round(N[0], 2))
        return wp, float(np.sum(N[0]))

class CostInputPopup(tk.Toplevel):
    def __init__(self, parent, upgradeurs, materiaux):
        super().__init__(parent)
        self.title("Définir les coûts unitaires")
        self.grab_set()
        self.couts_upgradeurs = {}
        self.couts_materiaux = {}
        tk.Label(self, text="Coûts des objets d'amélioration :", font=("Arial",12,"bold"))\
          .grid(row=0, column=0, sticky='w')
        for i, up in enumerate(upgradeurs):
            tk.Label(self, text=up).grid(row=i+1, column=0, sticky='w')
            e = tk.Entry(self); e.grid(row=i+1, column=1); e.insert(0,"0")
            self.couts_upgradeurs[up] = e
        row0 = len(upgradeurs)+2
        tk.Label(self, text="Coûts des matériaux :", font=("Arial",12,"bold"))\
          .grid(row=row0, column=0, sticky='w')
        for j, mat in enumerate(materiaux):
            tk.Label(self, text=mat).grid(row=row0+j+1, column=0, sticky='w')
            e = tk.Entry(self); e.grid(row=row0+j+1, column=1); e.insert(0,"0")
            self.couts_materiaux[mat] = e
        tk.Button(self, text="Valider", command=self.on_validate)\
          .grid(row=row0+len(materiaux)+1, column=0, columnspan=2)
        self.result = None
    def on_validate(self):
        self.result = (
            {k: float(e.get() or 0) for k,e in self.couts_upgradeurs.items()},
            {k: float(e.get() or 0) for k,e in self.couts_materiaux.items()}
        )
        self.destroy()

class App:
    def __init__(self, master):
        self.master = master
        self.master.title("Upways")
        self.master.geometry('1800x1050')
        self.master.resizable(False, False)
        self.master.configure(bg='#1d1e1e')
        for i in range(9):
            self.master.grid_columnconfigure(i, weight=1)
        self.load_data()
        self.setup_vars()
        self.setup_widgets()
        self.couts_upgradeurs = {}
        self.couts_materiaux = {}

    def load_data(self):
        path = os.path.join(os.path.dirname(__file__), 'data.json')
        with open(path, encoding='utf-8') as f:
            self.data = json.load(f)

    def setup_vars(self):
        self.combo_var = tk.StringVar(master=self.master)
        self.label_vars = [tk.StringVar(master=self.master) for _ in range(9)]
        self.dropdown_values = [
            "Parchemin de bénédiction","Manuel de Forgeron",
            "Parchemin du Dieu Dragon","Parchemin de Guerre",
            "Pierre magique"  # "Pierre rituelle" retiré
        ]
        self.dropdown_vars = [
            tk.StringVar(master=self.master, value="Parchemin de bénédiction")
            for _ in range(9)
        ]
        img_dir = os.path.join(os.path.dirname(__file__), 'img')
        files = os.listdir(img_dir)
        self.base_images = {
            "Parchemin de bénédiction": "Parchemin_de_bénédiction",
            "Pierre magique": "Pierre_magique",
            "Manuel de Forgeron": "Manuel_de_Forgeron",
            "Parchemin du Dieu Dragon": "Parchemin_du_Dieu_Dragon",
            "Parchemin de Guerre": "Parchemin_de_Guerre"
        }
        # upgrade icons
        self.images = {}
        for key in self.dropdown_values:
            frag = self.base_images[key]
            name = next((f for f in files if frag.lower() in f.lower()), None)
            if not name:
                name = next((f for f in files if 'scroll' in f.lower() or 'stone' in f.lower()), None)
            if not name:
                raise FileNotFoundError(f"Aucune image pour '{key}'")
            self.images[key] = tk.PhotoImage(file=os.path.join(img_dir, name))
        # material icons
        self.mat_images = {}
        for item in self.data.values():
            for lvl, ld in item.items():
                if lvl == 'img_name': continue
                for mname, m in ld.get('materials',{}).items():
                    img = m.get('img_name')
                    if img and img not in self.mat_images:
                        self.mat_images[img] = tk.PhotoImage(file=ressource_path(img))

    def setup_widgets(self):
        # combobox style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TCombobox',
                        fieldbackground='#373737',
                        background='#373737',
                        foreground='#d3ff93')
        # title
        CTkLabel(self.master,
                 text='Sélectionnez un objet :',
                 font=CTkFont(30))\
            .grid(row=0, column=0, columnspan=9, pady=(20,5))
        # combobox + info
        self.list_objects = ttk.Combobox(
            self.master, textvariable=self.combo_var,
            values=sorted(self.data.keys()), width=30)
        self.list_objects.grid(row=1, column=3, columnspan=3)
        self.list_objects.bind('<KeyRelease>', self.filter_objects)
        self.list_objects.bind('<<ComboboxSelected>>', lambda e: self.update_labels())

        # detailed results frame with embedded dropdowns
        self.result_frame = CTkFrame(self.master, fg_color='#1d1e1e',
                                     width=1600, height=400)
        self.result_frame.grid(row=2, column=0, columnspan=9,
                               padx=10, pady=10, sticky='nsew')
        self.result_frame.grid_propagate(False)
        # optimal path frame
        self.optimal_frame = CTkFrame(self.master, fg_color='#1d1e1e',
                              width=1600)
        self.optimal_frame.grid(row=3, column=0, columnspan=9,
                                padx=10, pady=(0,10), sticky='nsew')
        self.optimal_frame.grid_propagate(False)
        # buttons perfectly centered
        btnf = CTkFrame(self.master, fg_color='#1d1e1e')
        btnf.grid(row=4, column=0, columnspan=9, pady=20, sticky='ew')
        btn_center = CTkFrame(btnf, fg_color='#1d1e1e')
        btn_center.pack(anchor='center')
        CTkButton(btn_center, text="Veuillez définir les prix (M)", command=self.ask_costs_popup).pack(side='left', padx=16)
        CTkButton(btn_center, text="Calculer l'amélioration optimal", command=self.display_optimal_path).pack(side='left', padx=16)

    def filter_objects(self, _):
        txt = self.combo_var.get().lower()
        self.list_objects['values'] = sorted(n for n in self.data if txt in n.lower())

    def _init_table_widgets(self):
        """Initialisation unique des widgets de la table principale."""
        # S'il y a déjà une table, on ne fait rien
        if hasattr(self, "table_widgets"):
            return

        self.table_widgets = []
        table_frame = tk.Frame(self.result_frame, bg='#1d1e1e')
        table_frame.pack(anchor='center', pady=(10, 0))
        self.table_frame = table_frame  # pour y accéder plus tard

        for i in range(9):
            row_widgets = {}
            # Proba
            lbl_proba = CTkLabel(table_frame, text="", font=CTkFont(20), fg_color='#373737', corner_radius=20, width=60, height=40)
            lbl_proba.grid(row=i, column=0, padx=(5,10), pady=2)
            row_widgets["proba"] = lbl_proba

            # Dropdown
            vals_dropdown = list(self.dropdown_values)
            if i>=4 and "Parchemin de Guerre" in vals_dropdown:
                vals_dropdown.remove("Parchemin de Guerre")
            dv = self.dropdown_vars[i]
            opt_menu = CTkOptionMenu(
                table_frame, variable=dv, values=vals_dropdown,
                command=self.update_labels, width=150,
                button_color='#0b3500', fg_color='#0b3500'
            )
            opt_menu.grid(row=i, column=1, padx=(0,15), pady=2)
            row_widgets["dropdown"] = opt_menu

            # Image
            lbl_img = tk.Label(table_frame, bg='#1d1e1e')
            lbl_img.grid(row=i, column=2, padx=5, pady=2)
            row_widgets["img"] = lbl_img

            # Essais
            lbl_essais = CTkLabel(table_frame, text="", font=CTkFont(20), fg_color='#373737', corner_radius=20)
            lbl_essais.grid(row=i, column=3, padx=5, pady=2)
            row_widgets["essais"] = lbl_essais

            # Matériaux (frame interne, rempli dynamiquement)
            mf = tk.Frame(table_frame, bg='#1d1e1e')
            mf.grid(row=i, column=4, padx=10, pady=2)
            row_widgets["mat_frame"] = mf
            row_widgets["mat_widgets"] = []  # sera rempli dynamiquement

            # Coût
            lbl_cost = CTkLabel(table_frame, text="", font=CTkFont(16), fg_color='#373737', text_color='#d3ff93', corner_radius=20)
            lbl_cost.grid(row=i, column=5, padx=10, pady=2)
            row_widgets["cost"] = lbl_cost

            self.table_widgets.append(row_widgets)

    def format_cost(self, value):
        value = float(value)
        if value >= 100:
            return f"{int(value//100):,}.{int(value%100):02d}w".replace(',', ' ')
        else:
            return f"{int(value)}M"

    def update_labels(self, _=None):
        name = self.combo_var.get()
        if name not in self.data:
            return
        self._init_table_widgets()
        vals, ups, flags = [], [], []
        item = self.data[name]
        costs = []
        wp = []
        for i, dv in enumerate(self.dropdown_vars):
            choice = dv.get()
            if choice in ("Parchemin de bénédiction", "Pierre magique"):
                v = item.get(str(i+1),{}).get('success_rate',0)
            elif choice == "Manuel de Forgeron":
                v = [100,100,90,80,70,60,50,30,20][i]
            elif choice == "Parchemin du Dieu Dragon":
                v = [100,75,65,55,45,40,35,25,20][i]
            elif choice == "Parchemin de Guerre":
                v = 100
            else:
                v = 0
            vals.append(v)
            ups.append(choice)
            flags.append(choice == "Pierre magique")
        itm = Item(vals, flags)
        wp = itm.waypoint
        sum_way = itm.sum_waypoint
        costs = []
        for i in range(9):
            row = self.table_widgets[i]
            row["proba"].configure(text=f"{vals[i]}")
            img_up = self.images.get(ups[i])
            if img_up:
                row["img"].configure(image=img_up)
                row["img"].image = img_up
            row["essais"].configure(text=f"x {wp[i]:.2f}")
            for w in row["mat_widgets"]:
                w.destroy()
            row["mat_widgets"].clear()
            mats = self.data[name].get(str(i+1),{}).get('materials',{})
            mat_cost = 0
            for mn,m in mats.items():
                q = m.get('qty',0)
                mi = self.mat_images.get(m.get('img_name'))
                if mi:
                    lbl = tk.Label(row["mat_frame"], image=mi, bg='#1d1e1e')
                    lbl.pack(side='left', padx=2)
                    ToolTip(lbl, f"{mn} x{q}")
                    row["mat_widgets"].append(lbl)
                lbltxt = CTkLabel(row["mat_frame"], text=f"x{q}", font=CTkFont(16), fg_color='#373737', corner_radius=20)
                lbltxt.pack(side='left', padx=2)
                row["mat_widgets"].append(lbltxt)
                mat_cost += self.couts_materiaux.get(mn,0)*q
            up_cost = self.couts_upgradeurs.get(ups[i],0)
            unit = up_cost + mat_cost
            pal_cost = unit * wp[i]
            costs.append(pal_cost)
            row["cost"].configure(text=f"Coût: {self.format_cost(pal_cost)}")
        if hasattr(self, "lbl_total_essais"):
            self.lbl_total_essais.configure(text=f"Total essais : {sum_way:.2f}")
            self.lbl_total_cost.configure(text=f"Coût total moyen : {self.format_cost(sum(costs))}")
        else:
            self.lbl_total_essais = CTkLabel(self.result_frame, text=f"Total essais : {sum_way:.2f}", font=CTkFont(22), fg_color='#1d1e1e')
            self.lbl_total_essais.pack(pady=5)
            self.lbl_total_cost = CTkLabel(self.result_frame, text=f"Coût total moyen : {self.format_cost(sum(costs))}", font=CTkFont(22), fg_color='#0b3500', text_color='#d3ff93', corner_radius=20)
            self.lbl_total_cost.pack(pady=5)

    def ask_costs_popup(self, _=None):
        name = self.combo_var.get()
        if name not in self.data: return
        ups = sorted(m for m in self.dropdown_values)
        mats = sorted({
            mn for lvl,ld in self.data[name].items()
            if lvl!='img_name'
            for mn in ld.get('materials',{})
        })
        popup = CostInputPopup(self.master, ups, mats)
        self.master.wait_window(popup)
        if popup.result:
            self.couts_upgradeurs, self.couts_materiaux = popup.result
            self.update_labels()

    def display_optimal_path(self):
        name = self.combo_var.get()
        if name not in self.data: return
        item_data = self.data[name]
        fixed = [("Parchemin de Guerre",100,False)]*4
        methods = [
            ("Parchemin de bénédiction",
             lambda lvl: item_data[str(lvl)]["success_rate"], False),
            ("Manuel de Forgeron",
             lambda lvl: [100,100,90,80,70,60,50,30,20][lvl-1], False),
            ("Parchemin du Dieu Dragon",
             lambda lvl: [100,75,65,55,45,40,35,25,20][lvl-1], False),
            ("Pierre magique",
             lambda lvl: item_data[str(lvl)]["success_rate"], True)
        ]
        best=(None,[],[],[],float('inf'))
        def mk_cost(rates,flags,costs):
            it=Item(rates,flags)
            return sum(costs[i]*it.waypoint[i] for i in range(len(rates)))
    
        for combo in product(methods,repeat=5):
            names=[n for n,_,_ in fixed]
            rates=[r for _,r,_ in fixed]
            flags=[f for *_,f in fixed]
            costs=[self.couts_upgradeurs.get(n,0) for n,_,_ in fixed]
            for lvl,(n,fn,fl) in enumerate(combo,start=5):
                names.append(n)
                p=fn(lvl); rates.append(p); flags.append(fl)
                mats=item_data[str(lvl)].get("materials",{})
                mcost=sum(self.couts_materiaux.get(mn,0)*m["qty"]
                          for mn,m in mats.items())
                costs.append(self.couts_upgradeurs.get(n,0)+mcost)
            for i in range(4):
                mats=item_data[str(i+1)].get("materials",{})
                mcost=sum(self.couts_materiaux.get(mn,0)*m["qty"]
                          for mn,m in mats.items())
                costs[i] += mcost
            c=mk_cost(rates,flags,costs)
            if c<best[4]:
                best=(names,rates,flags,costs,c)
        names,rates,flags,costs,total=best
        opt=Item(rates,flags)
        trials=opt.waypoint
    
        for w in self.optimal_frame.winfo_children():
            w.destroy()
    
        # FRAME horizontal pour les cartes du chemin optimal
        center_f = tk.Frame(self.optimal_frame, bg='#1d1e1e')
        center_f.pack(anchor='center')
    
        cost_total_opt=0
        for i,nm in enumerate(names,start=1):
            f=tk.Frame(center_f,bg='#1d1e1e', width=170, height=210)
            f.pack(side='left', padx=8, pady=8)
            f.pack_propagate(False)
            CTkLabel(f, text=f"+{i}", font=CTkFont(18),
                     fg_color='#373737', corner_radius=20).pack(pady=(5,2))
            img = self.images.get(nm)
            if img:
                tk.Label(f, image=img, bg='#1d1e1e').pack(pady=2)
            # Nom d'objet amélioré, police augmentée, largeur augmentée
            CTkLabel(f, text=nm, font=CTkFont(15),
                     fg_color='#373737', corner_radius=10, width=130, height=32).pack(pady=2)
            CTkLabel(f, text=f"Essais: {trials[i-1]:.2f}",
                     font=CTkFont(12), fg_color='#373737',
                     text_color='#d3ff93', corner_radius=10).pack(pady=2)
            pal_cost = trials[i-1]*costs[i-1]
            cost_total_opt += pal_cost
            CTkLabel(f, text=f"Coût moy: {self.format_cost(pal_cost)}",
                     font=CTkFont(12), fg_color='#373737',
                     text_color='#d3ff93', corner_radius=10).pack(pady=(2,5))
    
        # Ligne du coût total optimal, bien séparée et centrée
        cost_row = tk.Frame(self.optimal_frame, bg='#1d1e1e')
        cost_row.pack(anchor='center', pady=(8, 0))
        CTkLabel(cost_row,
                 text=f"Coût total moyen (optimal): {self.format_cost(cost_total_opt)}",
                 font=CTkFont(20), fg_color="#0b3500",
                 text_color="#d3ff93", corner_radius=20,
                 width=350, height=36
        ).pack(anchor='center', pady=(0, 8))



if __name__ == "__main__":
    root = customtkinter.CTk()
    icon_path = os.path.join(os.path.dirname(__file__), "Upways.ico")
    root.iconbitmap(default=icon_path)
    app = App(root)
    root.mainloop()

