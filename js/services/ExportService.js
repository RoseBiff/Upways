/**
 * Service d'export des résultats avec options de partage - Version 3.7
 * Utilisation du logo externe
 */
export class ExportService {
    constructor(formatters, translator) {
        this.formatters = formatters;
        this.translator = translator;
    }

    /**
     * Retire le +0 d'un nom d'équipement
     */
    removeUpgradeLevel(name) {
        if (!name) return '';
        return name.replace(/\+0$/, '').trim();
    }

    /**
     * Exporte les résultats avec options (téléchargement ou partage)
     */
    async exportResults(strategy, currentItem, currentItemId, startLevel, endLevel, dataService, options = {}) {
        try {
            // Créer un conteneur temporaire pour la capture
            const captureContainer = this.createCaptureContainer();
            document.body.appendChild(captureContainer);

            // Récupérer l'image de l'objet
            const selectedImgSrc = dataService.getItemImagePath(currentItemId);
            
            // Retirer le +0 du nom de l'item pour l'affichage
            const displayItemName = this.removeUpgradeLevel(currentItem);

            // Créer le header
            const header = this.createHeader();
            captureContainer.appendChild(header);

            // Créer la section du chemin d'amélioration
            const pathSection = this.createPathSection(strategy, displayItemName, selectedImgSrc);
            captureContainer.appendChild(pathSection);

            // Attendre la création de l'affichage du chemin
            const pathDisplay = await this.createImprovedPathDisplay(strategy, currentItemId, startLevel, endLevel, dataService);
            pathSection.appendChild(pathDisplay);

            // Ajouter le tableau des prix utilisés
            const priceTable = await this.createPriceTable(strategy, currentItemId, startLevel, endLevel, dataService);
            captureContainer.appendChild(priceTable);

            // Forcer le rendu avant la capture
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capturer avec html2canvas
            const canvas = await html2canvas(captureContainer, {
                backgroundColor: '#1a1f2e',
                scale: 2,
                logging: false,
                width: 1200,
                height: captureContainer.scrollHeight + 40,
                windowWidth: 1200,
                windowHeight: captureContainer.scrollHeight + 40,
                y: 0,
                x: 0,
                scrollY: 0,
                scrollX: 0,
                allowTaint: true,
                useCORS: true
            });

            // Nettoyer
            document.body.removeChild(captureContainer);

            // Gérer selon le mode d'export
            const exportMode = options.mode || 'download';

            if (exportMode === 'download') {
                // Téléchargement direct
                const link = document.createElement('a');
                link.download = `upways-${displayItemName}-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } else if (exportMode === 'share') {
                // Afficher une modale avec l'image et les options de partage
                this.showShareModal(canvas, displayItemName);
            }

            return true;
        } catch (error) {
            console.error('Export error:', error);
            throw error;
        }
    }

    /**
     * Affiche une modale avec l'image et les options de partage
     */
    showShareModal(canvas, itemName) {
        const dataUrl = canvas.toDataURL();
        
        const modal = document.createElement('div');
        modal.className = 'share-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.translator.t('shareResultTitle')}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="image-preview">
                        <img src="${dataUrl}" alt="${this.translator.t('shareResultTitle')}" class="preview-image">
                    </div>
                    
                    <div class="share-actions">
                        <button class="btn btn-primary" id="downloadImage">
                            <span>💾</span> ${this.translator.t('downloadImage')}
                        </button>
                        
                        <button class="btn btn-secondary" id="copyImage">
                            <span>📋</span> ${this.translator.t('copyImage')}
                        </button>
                    </div>
                    <div class="share-info">
                        <p><strong>${this.translator.t('shareTip')}</strong> ${this.translator.t('shareRightClick')}</p>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Gérer les événements
        const closeModal = () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        };

        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
        modal.querySelector('.modal-close').addEventListener('click', closeModal);

        // Télécharger
        modal.querySelector('#downloadImage').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = `upways-${itemName}-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = dataUrl;
            link.click();
        });

        // Copier l'image
        modal.querySelector('#copyImage').addEventListener('click', async () => {
            try {
                // Convertir en blob pour copier l'image
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                this.showToast('success', this.translator.t('imageCopied'));
            } catch (err) {
                // Fallback si l'API Clipboard n'est pas supportée
                this.showToast('error', this.translator.t('copyError'));
            }
        });

        // Animer l'ouverture
        requestAnimationFrame(() => {
            modal.classList.add('open');
        });
    }

    /**
     * Affiche un toast (notification temporaire)
     */
    showToast(type, message) {
        // Utiliser la fonction showToast existante si disponible
        if (window.app && window.app.uiState) {
            window.app.uiState.showToast(type, message);
        } else {
            alert(message);
        }
    }

    createCaptureContainer() {
        const container = document.createElement('div');
        container.style.cssText = `
            width: 1200px;
            background: #1a1f2e;
            padding: 40px 20px;
            position: absolute;
            left: -9999px;
            top: 0;
            margin: 0;
        `;
        return container;
    }

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #0f1419;
            border-radius: 10px;
        `;

        // Créer le contenu avec le logo externe
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <img src="logo.png" alt="Upways" style="width: 50px; height: 50px; object-fit: contain;" 
                     onerror="this.src='logo.svg'; this.onerror=null;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0;">Upways</h1>
            </div>
            <div style="text-align: right;">
                <div style="color: #6B7280; font-size: 14px;">${new Date().toLocaleDateString()}</div>
                <a href="https://metin2upways.com" style="color: #6366f1; text-decoration: none; font-size: 18px; font-weight: bold;">
                    metin2upways.com
                </a>
            </div>
        `;

        return header;
    }

    // Méthode pour créer l'affichage amélioré du chemin
    async createImprovedPathDisplay(strategy, currentItemId, startLevel, endLevel, dataService) {
        const pathDisplay = document.createElement('div');
        pathDisplay.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
            padding: 20px;
            align-items: stretch;
            justify-content: flex-start;
        `;

        const itemData = await dataService.getItemById(currentItemId);
        const fullWaypoints = strategy.extendedWaypoints || strategy.markov.waypoints;

        let hasLevelsAbove9 = false;

        // Pour l'export, on affiche tous les niveaux jusqu'à 30, puis on groupe
        const individualDisplayLimit = 30;
        const maxDisplayLevel = Math.min(endLevel, 100); // Limiter l'affichage à 100 max

        // Afficher les niveaux individuels
        for (let level = 1; level <= Math.min(endLevel, individualDisplayLimit); level++) {
            const waypointValue = fullWaypoints[level - 1] || 0;
        
            if (waypointValue > 0.01) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0, yang_cost: 0 };
            
                let upgradeType;
                
                // Utiliser fullPath si disponible (stratégie optimale)
                if (strategy.fullPath && strategy.fullPath[level - 1]) {
                    upgradeType = strategy.fullPath[level - 1];
                } else if (level > startLevel && level <= endLevel) {
                    const pathIndex = level - startLevel - 1;
                    if (strategy.path[pathIndex]) {
                        upgradeType = strategy.path[pathIndex].name;
                    } else {
                        upgradeType = level <= 4 ? "Parchemin de Guerre" : 
                                     level <= 9 ? "Parchemin de bénédiction" : 
                                     "Pierre magique";
                    }
                } else {
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : 
                                 level <= 9 ? "Parchemin de bénédiction" : 
                                 "Pierre magique";
                }
            
                const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);
            
                if (level > 9) hasLevelsAbove9 = true;
            
                // Calculer correctement les coûts
                const yangCost = levelData.yang_cost || 0;
                const yangCostInMillions = yangCost / 1000000;
                const materialCost = this.calculateMaterialCost(levelData.materials || {}, dataService);
                const upgradeCost = dataService.getUpgradeCost(upgradeType);
                const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
                const avgCost = totalLevelCost * waypointValue;
                
                const stepDiv = this.createCompactStepDiv(
                    level, 
                    upgradeType, 
                    rate, 
                    waypointValue, 
                    level <= startLevel, 
                    level > 9, 
                    yangCost, 
                    avgCost,
                    dataService
                );
                pathDisplay.appendChild(stepDiv);
            }
        }
        
        // Si on a des niveaux au-delà de 30, afficher un résumé
        if (endLevel > individualDisplayLimit) {
            const remainingLevels = endLevel - individualDisplayLimit;
            const groupsCount = Math.ceil(remainingLevels / 10);
            
            const summaryDiv = document.createElement('div');
            summaryDiv.style.cssText = `
                width: 100%;
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
                padding: 10px;
                background: rgba(99, 102, 241, 0.1);
                border: 1px solid #6366f1;
                border-radius: 6px;
            `;
            
            // Afficher les groupes de 10 en commençant à 31
            for (let groupStart = individualDisplayLimit + 1; groupStart <= endLevel; groupStart += 10) {
                const groupEnd = Math.min(groupStart + 9, endLevel);
                
                // Calculer les totaux pour ce groupe
                let groupTrials = 0;
                let groupCost = 0;
                
                for (let level = groupStart; level <= groupEnd; level++) {
                    const waypointValue = fullWaypoints[level - 1] || 0;
                    if (waypointValue > 0.01) {
                        const levelData = itemData[level.toString()] || { materials: {}, success_rate: 10, yang_cost: 0 };
                        const yangCost = levelData.yang_cost || 0;
                        const yangCostInMillions = yangCost / 1000000;
                        const materialCost = this.calculateMaterialCost(levelData.materials || {}, dataService);
                        const upgradeCost = dataService.getUpgradeCost("Pierre magique");
                        const totalLevelCost = yangCostInMillions + materialCost + upgradeCost;
                        
                        groupTrials += waypointValue;
                        groupCost += totalLevelCost * waypointValue;
                    }
                }
                
                const groupDiv = document.createElement('div');
                groupDiv.style.cssText = `
                    background: #1a1f2e;
                    border: 2px solid #9333ea;
                    border-radius: 6px;
                    padding: 10px;
                    text-align: center;
                    font-size: 11px;
                    width: 120px;
                `;
                
                const magicStoneName = dataService.getUpgradeItemName('Pierre magique');
                
                groupDiv.innerHTML = `
                    <div style="font-size: 12px; color: #e0aaff; font-weight: bold; margin-bottom: 5px;">
                        +${groupStart} → +${groupEnd}
                    </div>
                    <img src="${dataService.getUpgradeItemImagePath('Pierre magique')}" style="width: 32px; height: 32px; display: block; margin: 5px auto;">
                    <div style="color: #e0aaff; font-size: 10px; margin: 5px 0;">
                        ${Math.round(groupTrials)} ${this.translator.t('trials')}
                    </div>
                    <div style="font-size: 10px; color: #6366f1; font-weight: bold;">
                        ${this.formatters.formatCost(groupCost)}
                    </div>
                `;
                
                summaryDiv.appendChild(groupDiv);
            }
            
            pathDisplay.appendChild(summaryDiv);
        }

        // Ajouter une note si des niveaux > 9 sont présents
        if (hasLevelsAbove9) {
            const noteDiv = document.createElement('div');
            noteDiv.style.cssText = `
                width: 100%;
                text-align: center;
                margin-top: 10px;
                padding: 10px;
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid #f59e0b;
                border-radius: 6px;
                font-size: 11px;
                color: #f59e0b;
            `;
            noteDiv.innerHTML = `⚠️ ${this.translator.t('forcedMagicStone')}`;
            pathDisplay.appendChild(noteDiv);
        }

        return pathDisplay;
    }

    // Méthode pour créer le tableau des prix
    async createPriceTable(strategy, currentItemId, startLevel, endLevel, dataService) {
        const container = document.createElement('div');
        container.style.cssText = `
            background: #0f1419;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        `;

        // Titre
        const title = document.createElement('h3');
        title.style.cssText = `
            color: #ffffff;
            font-size: 18px;
            margin-bottom: 15px;
            text-align: center;
        `;
        title.textContent = this.translator.t('priceConfiguration');
        container.appendChild(title);

        // Créer deux colonnes
        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        `;

        // Colonne 1: Objets d'amélioration
        const upgradeColumn = document.createElement('div');
        const upgradeTitle = document.createElement('h4');
        upgradeTitle.style.cssText = 'color: #cbd5e1; font-size: 14px; margin-bottom: 10px;';
        upgradeTitle.textContent = this.translator.t('upgradeItems');
        upgradeColumn.appendChild(upgradeTitle);

        const upgradeOptions = dataService.getUpgradeOptions();

        upgradeOptions.forEach(option => {
            const cost = dataService.getUpgradeCost(option.internalName);
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;';
            row.innerHTML = `
                <span style="color: #94a3b8;">${option.displayName}:</span>
                <span style="color: ${cost > 0 ? '#6366f1' : '#6B7280'}; font-weight: bold;">
                    ${this.formatters.formatCost(cost)}
                </span>
            `;
            upgradeColumn.appendChild(row);
        });

        // Colonne 2: Matériaux uniques
        const materialsColumn = document.createElement('div');
        const materialsTitle = document.createElement('h4');
        materialsTitle.style.cssText = 'color: #cbd5e1; font-size: 14px; margin-bottom: 10px;';
        materialsTitle.textContent = this.translator.t('materials');
        materialsColumn.appendChild(materialsTitle);

        // Collecter TOUS les matériaux uniques de l'objet
        const allMaterials = new Map();
        const itemData = await dataService.getItemById(currentItemId);

        // Parcourir tous les niveaux pour collecter les matériaux uniques
        for (let level = 1; level <= 255; level++) {
            const levelData = itemData[level.toString()];
            if (levelData?.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!allMaterials.has(id)) {
                        allMaterials.set(id, {
                            id,
                            name: dataService.getMaterialName(id)
                        });
                    }
                });
            }
        }

        // Trier par nom et afficher
        const sortedMaterials = Array.from(allMaterials.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        sortedMaterials.forEach(mat => {
            const cost = dataService.getMaterialCost(mat.id);
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;';
            row.innerHTML = `
                <span style="color: #94a3b8;">${mat.name}:</span>
                <span style="color: ${cost > 0 ? '#6366f1' : '#6B7280'}; font-weight: bold;">
                    ${this.formatters.formatCost(cost)}
                </span>
            `;
            materialsColumn.appendChild(row);
        });

        // Si aucun matériau
        if (sortedMaterials.length === 0) {
            const noMaterials = document.createElement('div');
            noMaterials.style.cssText = 'color: #6B7280; font-size: 12px; font-style: italic;';
            noMaterials.textContent = this.translator.t('noMaterialsRequired');
            materialsColumn.appendChild(noMaterials);
        }

        grid.appendChild(upgradeColumn);
        grid.appendChild(materialsColumn);
        container.appendChild(grid);

        return container;
    }

    // Version compacte du stepDiv pour l'export avec affichage du coût en yang
    createCompactStepDiv(level, upgradeType, rate, waypointValue, isBelowStart, isHighLevel, yangCost, avgCost, dataService) {
        const stepDiv = document.createElement('div');
        stepDiv.style.cssText = `
            background: ${isHighLevel ? 'linear-gradient(135deg, #4a3c5a, #362847)' : 
                         isBelowStart ? 'linear-gradient(135deg, #3f2b1a, #2d1f14)' : 
                         '#1a1f2e'};
            border: 2px solid ${isHighLevel ? '#9333ea' :
                               isBelowStart ? '#f59e0b' : 
                               '#2d3748'};
            border-radius: 6px;
            padding: 10px 8px;
            text-align: center;
            font-size: 10px;
            width: 100px;
            min-height: 140px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        `;

        // Ajouter l'indicateur visuel pour les niveaux > 9
        if (isHighLevel) {
            const sparkle = document.createElement('div');
            sparkle.style.cssText = `
                position: absolute;
                top: -6px;
                right: -6px;
                background: linear-gradient(135deg, #9333ea, #7c3aed);
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
            sparkle.innerHTML = '✨';
            stepDiv.appendChild(sparkle);
        }

        // Créer le contenu interne avec structure flex
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            flex: 1;
            justify-content: center;
        `;

        // Afficher le coût en yang si > 0
        const yangDisplay = yangCost > 0 ? `
            <div style="font-size: 8px; color: #fbbf24; margin-top: 2px;">
                ${this.formatters.formatNumber(yangCost)} yang
            </div>
        ` : '';

        // Afficher le coût total moyen
        const avgCostDisplay = `
            <div style="font-size: 9px; color: #6366f1; font-weight: bold;">
                ${this.formatters.formatCost(avgCost)}
            </div>
        `;
        
        // Obtenir l'image et le nom traduit de l'objet d'amélioration
        const upgradeItemImage = dataService.getUpgradeItemImagePath(upgradeType);
        const upgradeItemName = dataService.getUpgradeItemName(upgradeType);

        content.innerHTML = `
            <div style="font-size: 11px; color: ${isHighLevel ? '#e0aaff' : '#6366f1'}; font-weight: bold;">+${level}</div>
            <img src="${upgradeItemImage}" style="width: 32px; height: 32px; display: block;">
            <div style="font-size: 9px; color: #cbd5e1; line-height: 1.2;">${upgradeItemName}</div>
            <div style="color: #48bb78; font-size: 11px; font-weight: bold;">${rate}%</div>
            <div style="color: ${isHighLevel ? '#e0aaff' : '#6366f1'}; font-size: 10px;">${waypointValue.toFixed(1)}x</div>
            ${avgCostDisplay}
            ${yangDisplay}
        `;

        stepDiv.appendChild(content);

        return stepDiv;
    }

    createPathSection(strategy, currentItem, itemImgSrc) {
        const section = document.createElement('div');
        section.style.cssText = `
            background: #0f1419;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
        `;

        const totalCost = strategy.totalCost; // Déjà en millions

        section.innerHTML = `
            <h2 style="color: #ffffff; font-size: 22px; margin-bottom: 12px; text-align: center;">
                ${this.translator.t('upgradePath')} ${this.translator.t('optimal').toLowerCase()}
            </h2>
            <div style="color: #ffffff; font-size: 18px; text-align: center; margin-bottom: 8px;">
                ${currentItem}
            </div>
            <div style="text-align: center; margin-bottom: 20px;">
                <img
                    src="${itemImgSrc}"
                    alt="${currentItem}"
                    style="
                        width: 50px;
                        height: auto;
                        object-fit: contain;
                        display: inline-block;
                    "
                />
            </div>
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="color: #6B7280; font-size: 16px;">${this.translator.t('avgCost')}</div>
                <div style="color: #6366f1; font-size: 28px; font-weight: bold;">
                    ${this.formatters.formatCost(totalCost)}
                </div>
            </div>
        `;

        return section;
    }

    calculateSuccessRate(level, upgradeType, baseRate) {
        switch (upgradeType) {
            case "Parchemin de bénédiction":
            case "Pierre magique":
                return baseRate || 0;
            case "Manuel de Forgeron":
                return [100, 100, 90, 80, 70, 60, 50, 30, 20][level - 1] || 0;
            case "Parchemin du Dieu Dragon":
                return [100, 75, 65, 55, 45, 40, 35, 25, 20][level - 1] || 0;
            case "Parchemin de Guerre":
                return 100;
            default:
                return 0;
        }
    }

    calculateMaterialCost(materials, dataService) {
        let cost = 0;
        Object.entries(materials).forEach(([id, info]) => {
            cost += dataService.getMaterialCost(id) * (info.qty || 0);
        });
        return cost; // Déjà en millions
    }
}