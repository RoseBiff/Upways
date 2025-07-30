/**
 * Service d'export des résultats avec options de partage - Version 4.2
 * Optimisation de l'affichage des matériaux pour éviter les images trop longues
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

            // Déterminer le type de stratégie
            const isOptimal = options.strategyType === 'optimal' || !options.strategyType;
            const strategyName = isOptimal ? 
                this.translator.t('optimal') : 
                this.translator.t('custom');

            // Créer le header
            const header = this.createHeader();
            captureContainer.appendChild(header);

            // Créer la section du chemin d'amélioration avec le bon nom
            const pathSection = this.createPathSection(strategy, displayItemName, selectedImgSrc, strategyName);
            captureContainer.appendChild(pathSection);

            // Attendre la création de l'affichage du chemin
            const pathDisplay = await this.createImprovedPathDisplay(strategy, currentItemId, startLevel, endLevel, dataService);
            pathSection.appendChild(pathDisplay);

            // Ajouter le tableau des prix utilisés - VERSION OPTIMISÉE
            const priceTable = await this.createOptimizedPriceTable(strategy, currentItemId, startLevel, endLevel, dataService);
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
        const fullWaypoints = strategy.extendedWaypoints || strategy.waypoints || [];

        let hasLevelsAbove9 = false;

        // Pour l'export, on affiche tous les niveaux jusqu'à 30, puis on groupe
        const individualDisplayLimit = 19;

        // Afficher les niveaux individuels
        for (let level = 1; level <= Math.min(endLevel, individualDisplayLimit); level++) {
            const waypointValue = fullWaypoints[level - 1] || 0;

            if (waypointValue > 0.01) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0, yang_cost: 0 };
            
                let upgradeType;
                
                // Utiliser fullPath si disponible
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
                
                // Déterminer les états du niveau
                const isStartLevel = (level === startLevel);
                const isBelowStart = (level < startLevel);
                
                const stepDiv = this.createCompactStepDiv(
                    level, 
                    upgradeType, 
                    rate, 
                    waypointValue, 
                    isStartLevel,
                    level > 9, 
                    yangCost, 
                    avgCost,
                    dataService,
                    isBelowStart
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
                margin-top: 15px;
                padding: 12px;
                background: linear-gradient(135deg, rgba(147, 51, 234, 0.05), rgba(99, 102, 241, 0.05));
                border: 1.5px solid rgba(147, 51, 234, 0.3);
                border-radius: 10px;
                position: relative;
                overflow: hidden;
            `;
            
            // Ajouter un effet de brillance
            const shimmer = document.createElement('div');
            shimmer.style.cssText = `
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    rgba(255, 255, 255, 0.05) 50%,
                    transparent 100%
                );
                animation: shimmer 3s infinite;
            `;
            summaryDiv.appendChild(shimmer);
            
            // Ajouter le style pour l'animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
            `;
            summaryDiv.appendChild(style);
            
            // Ajouter le texte de répétition
            const loopIndicator = document.createElement('div');
            loopIndicator.style.cssText = `
                width: 100%;
                text-align: center;
                padding: 10px;
                margin-bottom: 10px;
                z-index: 1;
                position: relative;
            `;
            loopIndicator.innerHTML = `
                <div style="display: inline-flex; align-items: center; gap: 15px; background: rgba(30, 41, 59, 0.8); padding: 8px 20px; border-radius: 8px; border: 1px solid rgba(147, 51, 234, 0.4);">
                    <span style="font-size: 2rem; color: #9333ea;">🔄</span>
                    <div style="text-align: left;">
                        <div style="font-size: 14px; font-weight: 700; color: #e0aaff; margin-bottom: 2px;">
                            ${this.translator.t('repeatPattern') || 'Répétition du motif'}
                        </div>
                        <div style="font-size: 16px; color: #f1f5f9; font-weight: 600;">
                            +${individualDisplayLimit + 1} → +${endLevel}
                        </div>
                    </div>
                </div>
            `;
            summaryDiv.appendChild(loopIndicator);
            
            // Afficher les groupes de 10 en commençant à 31
            const groupsContainer = document.createElement('div');
            groupsContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                position: relative;
                z-index: 1;
            `;
            
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
                    background: #252d3d;
                    border: 1.5px solid #475569;
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                    font-size: 11px;
                    width: 140px;
                    position: relative;
                    overflow: hidden;
                `;
                
                groupDiv.innerHTML += `
                    <div style="font-size: 13px; color: #e0aaff; font-weight: bold; margin-bottom: 5px;">
                        +${groupStart} → +${groupEnd}
                    </div>
                    <img src="${dataService.getUpgradeItemImagePath('Pierre magique')}" style="width: 36px; height: 36px; display: block; margin: 5px auto;">
                    <div style="color: #e0aaff; font-size: 11px; margin: 5px 0;">
                        ${Math.round(groupTrials)} ${this.translator.t('trials')}
                    </div>
                    <div style="font-size: 11px; color: #6366f1; font-weight: bold;">
                        ${this.formatters.formatCost(groupCost)}
                    </div>
                `;
                
                groupsContainer.appendChild(groupDiv);
            }
            
            summaryDiv.appendChild(groupsContainer);
            pathDisplay.appendChild(summaryDiv);
        }

        // Ajouter une note si des niveaux > 9 sont présents
        if (hasLevelsAbove9) {
            const noteDiv = document.createElement('div');
            noteDiv.style.cssText = `
                width: 100%;
                text-align: center;
                margin-top: 15px;
                padding: 12px;
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid #f59e0b;
                border-radius: 8px;
                font-size: 12px;
                color: #f59e0b;
                font-weight: 600;
            `;
            noteDiv.innerHTML = `⚠️ ${this.translator.t('forcedMagicStone')}`;
            pathDisplay.appendChild(noteDiv);
        }

        return pathDisplay;
    }

    /**
     * Méthode optimisée pour créer le tableau des prix avec une présentation compacte et unifiée
     */
    async createOptimizedPriceTable(strategy, currentItemId, startLevel, endLevel, dataService) {
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

        // Section pour les objets d'amélioration (toujours affichés normalement)
        const upgradeSection = document.createElement('div');
        upgradeSection.style.cssText = `
            margin-bottom: 20px;
        `;
        
        const upgradeTitle = document.createElement('h4');
        upgradeTitle.style.cssText = 'color: #cbd5e1; font-size: 14px; margin-bottom: 10px;';
        upgradeTitle.textContent = this.translator.t('upgradeItems');
        upgradeSection.appendChild(upgradeTitle);

        const upgradeGrid = document.createElement('div');
        upgradeGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        `;

        const upgradeOptions = dataService.getUpgradeOptions();
        upgradeOptions.forEach(option => {
            const cost = dataService.getUpgradeCost(option.internalName);
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px 0;';
            
            const itemInfo = document.createElement('div');
            itemInfo.style.cssText = 'display: flex; align-items: center; gap: 8px; flex: 1;';
            
            const img = document.createElement('img');
            img.src = dataService.getUpgradeItemImagePath(option.internalName);
            img.style.cssText = 'width: 24px; height: 24px; object-fit: contain;';
            
            const name = document.createElement('span');
            name.style.cssText = 'color: #94a3b8; font-size: 12px;';
            name.textContent = option.displayName;
            
            itemInfo.appendChild(img);
            itemInfo.appendChild(name);
            
            const price = document.createElement('span');
            price.style.cssText = `color: ${cost > 0 ? '#6366f1' : '#6B7280'}; font-weight: bold; font-size: 12px;`;
            price.textContent = this.formatters.formatCost(cost);
            
            row.appendChild(itemInfo);
            row.appendChild(price);
            upgradeGrid.appendChild(row);
        });

        upgradeSection.appendChild(upgradeGrid);
        container.appendChild(upgradeSection);

        // Section optimisée pour les matériaux
        const materialsSection = document.createElement('div');
        const materialsTitle = document.createElement('h4');
        materialsTitle.style.cssText = 'color: #cbd5e1; font-size: 14px; margin-bottom: 10px;';
        materialsTitle.textContent = this.translator.t('materials');
        materialsSection.appendChild(materialsTitle);

        // Collecter TOUS les matériaux uniques de l'objet
        const allMaterials = new Map();
        const itemData = await dataService.getItemById(currentItemId);

        // Parcourir uniquement les niveaux concernés par l'amélioration
        for (let level = startLevel; level <= endLevel; level++) {
            const levelData = itemData[level.toString()];
            if (levelData?.materials) {
                Object.entries(levelData.materials).forEach(([id, info]) => {
                    if (!allMaterials.has(id)) {
                        allMaterials.set(id, {
                            id,
                            name: dataService.getMaterialName(id),
                            imgPath: dataService.getItemImagePath(id)
                        });
                    }
                });
            }
        }

        // Trier par nom
        const sortedMaterials = Array.from(allMaterials.values()).sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        if (sortedMaterials.length > 0) {
            const materialsGrid = document.createElement('div');
            
            // Déterminer le nombre de colonnes en fonction du nombre de matériaux
            let columns;
            if (sortedMaterials.length <= 6) {
                columns = 2;
            } else if (sortedMaterials.length <= 12) {
                columns = 3;
            } else if (sortedMaterials.length <= 20) {
                columns = 4;
            } else {
                // Pour beaucoup de matériaux, utiliser un affichage ultra compact
                this.createUltraCompactMaterialsDisplay(sortedMaterials, dataService, materialsSection);
                container.appendChild(materialsSection);
                return container;
            }
            
            materialsGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(${columns}, 1fr);
                gap: 8px;
            `;

            // Style plus compact pour les items
            sortedMaterials.forEach(mat => {
                const cost = dataService.getMaterialCost(mat.id);
                const cell = document.createElement('div');
                cell.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 3px 0;
                    font-size: 11px;
                `;
                
                const img = document.createElement('img');
                img.src = mat.imgPath;
                img.style.cssText = 'width: 20px; height: 20px; object-fit: contain;';
                
                const info = document.createElement('div');
                info.style.cssText = 'flex: 1; min-width: 0;';
                
                const name = document.createElement('div');
                name.style.cssText = 'color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
                name.textContent = mat.name;
                
                const price = document.createElement('div');
                price.style.cssText = `color: ${cost > 0 ? '#6366f1' : '#6B7280'}; font-weight: bold;`;
                price.textContent = this.formatters.formatCost(cost);
                
                info.appendChild(name);
                info.appendChild(price);
                
                cell.appendChild(img);
                cell.appendChild(info);
                materialsGrid.appendChild(cell);
            });

            materialsSection.appendChild(materialsGrid);
        } else {
            const noMaterials = document.createElement('div');
            noMaterials.style.cssText = 'color: #6B7280; font-size: 12px; font-style: italic;';
            noMaterials.textContent = this.translator.t('noMaterialsRequired');
            materialsSection.appendChild(noMaterials);
        }

        container.appendChild(materialsSection);
        return container;
    }

    /**
     * Affichage ultra compact pour les cas avec beaucoup de matériaux (20+)
     */
    createUltraCompactMaterialsDisplay(materials, dataService, container) {
        // Séparer les matériaux avec prix et sans prix
        const withPrice = materials.filter(m => dataService.getMaterialCost(m.id) > 0);
        const withoutPrice = materials.filter(m => dataService.getMaterialCost(m.id) === 0);

        // Section pour les matériaux avec prix (plus importants)
        if (withPrice.length > 0) {
            const pricedSection = document.createElement('div');
            pricedSection.style.cssText = 'margin-bottom: 15px;';
            
            const pricedTitle = document.createElement('div');
            pricedTitle.style.cssText = 'color: #6366f1; font-size: 12px; font-weight: 600; margin-bottom: 8px;';
            pricedTitle.textContent = this.translator.t('pricedMaterials') || 'Matériaux avec prix configuré';
            pricedSection.appendChild(pricedTitle);

            const pricedGrid = document.createElement('div');
            pricedGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            `;

            withPrice.forEach(mat => {
                const cost = dataService.getMaterialCost(mat.id);
                const cell = document.createElement('div');
                cell.style.cssText = `
                    background: #1a1f2e;
                    border: 1px solid #334155;
                    border-radius: 6px;
                    padding: 6px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                `;
                
                cell.innerHTML = `
                    <img src="${mat.imgPath}" style="width: 18px; height: 18px;">
                    <div style="flex: 1; overflow: hidden;">
                        <div style="color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${mat.name}">
                            ${mat.name}
                        </div>
                        <div style="color: #6366f1; font-weight: bold;">
                            ${this.formatters.formatCost(cost)}
                        </div>
                    </div>
                `;
                
                pricedGrid.appendChild(cell);
            });

            pricedSection.appendChild(pricedGrid);
            container.appendChild(pricedSection);
        }

        // Section compacte pour les matériaux sans prix
        if (withoutPrice.length > 0) {
            const unpricedSection = document.createElement('div');
            
            const unpricedTitle = document.createElement('div');
            unpricedTitle.style.cssText = 'color: #6B7280; font-size: 12px; font-weight: 600; margin-bottom: 8px;';
            unpricedTitle.textContent = this.translator.t('unpricedMaterials') || 'Autres matériaux requis';
            unpricedSection.appendChild(unpricedTitle);

            // Affichage en grille d'icônes uniquement
            const iconGrid = document.createElement('div');
            iconGrid.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 8px;
                background: #1a1f2e;
                border-radius: 6px;
            `;

            withoutPrice.forEach(mat => {
                const icon = document.createElement('img');
                icon.src = mat.imgPath;
                icon.style.cssText = 'width: 24px; height: 24px; object-fit: contain; cursor: help;';
                icon.title = mat.name;
                iconGrid.appendChild(icon);
            });

            // Ajouter un compteur
            const counter = document.createElement('div');
            counter.style.cssText = `
                color: #6B7280;
                font-size: 11px;
                margin-top: 4px;
                text-align: right;
            `;
            counter.textContent = `(${withoutPrice.length} ${this.translator.t('materials').toLowerCase()})`;

            unpricedSection.appendChild(iconGrid);
            unpricedSection.appendChild(counter);
            container.appendChild(unpricedSection);
        }
    }

    // Version compacte du stepDiv pour l'export avec affichage du coût en yang
    createCompactStepDiv(level, upgradeType, rate, waypointValue, isStartLevel, isHighLevel, yangCost, avgCost, dataService, isBelowStart = false) {
        const stepDiv = document.createElement('div');
        
        // Style adapté pour correspondre au site avec meilleur contraste
        let backgroundStyle = '#252d3d'; // Fond plus clair pour meilleur contraste
        let borderColor = '#475569';
        let borderWidth = '1.5px';
        let textColorPrimary = '#f1f5f9'; // Texte plus clair
        let textColorSecondary = '#e2e8f0';
        
        if (isStartLevel) {
            // Style spécial UNIQUEMENT pour le niveau de départ
            borderColor = '#FFD700';
            borderWidth = '3px';
            backgroundStyle = '#252d3d';
        } else if (isBelowStart && !isStartLevel) {
            // Style atténué pour les niveaux sous le départ
            backgroundStyle = '#1a1f2e';
            textColorPrimary = '#94a3b8';
            textColorSecondary = '#64748b';
        }
        
        stepDiv.style.cssText = `
            background: ${backgroundStyle};
            border: ${borderWidth} solid ${borderColor};
            border-radius: 8px;
            padding: 10px 8px;
            text-align: center;
            font-size: 10px;
            width: 110px;
            min-height: 150px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            ${isStartLevel ? 'box-shadow: 0 0 0 1px #FFD700, 0 0 15px rgba(255, 215, 0, 0.3);' : ''}
        `;

        // Ajouter un indicateur "DÉPART" pour le niveau de départ
        if (isStartLevel) {
            const startIndicator = document.createElement('div');
            startIndicator.style.cssText = `
                position: absolute;
                top: -12px;
                left: 50%;
                transform: translateX(-50%);
                background: #FFD700;
                color: #000;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.05em;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            `;
            startIndicator.textContent = 'DÉPART';
            stepDiv.appendChild(startIndicator);

            // Ajouter la flèche indicatrice
            const arrow = document.createElement('div');
            arrow.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                width: 24px;
                height: 24px;
                background: #FFD700;
                color: #000;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                box-shadow: 0 2px 6px rgba(255, 215, 0, 0.4);
            `;
            arrow.innerHTML = '▶';
            stepDiv.appendChild(arrow);
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

        // Afficher le coût en yang avec l'icône money.png
        const yangDisplay = yangCost > 0 ? `
            <div style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #fbbf24; margin-top: 2px;">
                <img src="money.png" style="width: 12px; height: 12px;">
                <span>${this.formatters.formatNumber(yangCost)}</span>
            </div>
        ` : '';

        // Afficher le coût total moyen
        const avgCostDisplay = `
            <div style="font-size: 9px; color: ${isStartLevel ? '#FFD700' : '#10b981'}; font-weight: bold;">
                ${this.formatters.formatCost(avgCost)}
            </div>
        `;
        
        // Obtenir l'image et le nom traduit de l'objet d'amélioration
        const upgradeItemImage = dataService.getUpgradeItemImagePath(upgradeType);
        const upgradeItemName = dataService.getUpgradeItemName(upgradeType);

        // Ajuster l'opacité pour les niveaux sous le départ
        const imageOpacity = (isBelowStart && !isStartLevel) ? '0.6' : '1';

        content.innerHTML = `
            <div style="font-size: 11px; color: ${isStartLevel ? '#FFD700' : '#10b981'}; font-weight: bold;">+${level}</div>
            <img src="${upgradeItemImage}" style="width: 36px; height: 36px; display: block; opacity: ${imageOpacity};">
            <div style="font-size: 9px; color: ${textColorPrimary}; line-height: 1.2;">${upgradeItemName}</div>
            <div style="color: #10b981; font-size: 11px; font-weight: bold;">${rate}%</div>
            <div style="color: ${isStartLevel ? '#FFD700' : '#818cf8'}; font-size: 10px; font-weight: 600;">${waypointValue.toFixed(1)}x</div>
            ${avgCostDisplay}
        `;
            // ${yangDisplay} Retiré de content.innerHTML pour tester sans les yangs... data peu interessante.

        stepDiv.appendChild(content);

        return stepDiv;
    }

    createPathSection(strategy, currentItem, itemImgSrc, strategyName) {
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
                ${this.translator.t('upgradePath')} ${strategyName.toLowerCase()}
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
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(99, 102, 241, 0.1); padding: 8px 20px; border-radius: 20px; border: 1px solid rgba(99, 102, 241, 0.3);">
                    <span style="color: #FFD700; font-size: 18px; font-weight: bold;">+${strategy.startLevel}</span>
                    <span style="color: #6366f1; font-size: 20px;">→</span>
                    <span style="color: #10b981; font-size: 18px; font-weight: bold;">+${strategy.endLevel}</span>
                </div>
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
                return [100, 100, 100, 100, 70, 60, 50, 30, 20][level - 1] || 0;
            case "Parchemin du Dieu Dragon":
                return [100, 100, 100, 100, 45, 40, 35, 25, 20][level - 1] || 0;
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