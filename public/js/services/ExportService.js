/**
 * Service d'export des résultats
 */
export class ExportService {
    constructor(formatters, translator) {
        this.formatters = formatters;
        this.translator = translator;
    }

    /**
     * Exporte les résultats sous forme d'image
     */
    async exportResults(strategy, currentItem, currentItemId, startLevel, endLevel, dataService) {
        try {
            // Créer un conteneur temporaire pour la capture
            const captureContainer = this.createCaptureContainer();
            document.body.appendChild(captureContainer);

            // Récupérer l'image de l'objet
            const selectedImgSrc = document.getElementById('itemImage').src;

            // Créer le header
            const header = this.createHeader();
            captureContainer.appendChild(header);

            // Créer la section du chemin d'amélioration
            const pathSection = this.createPathSection(strategy, currentItem, selectedImgSrc);
            captureContainer.appendChild(pathSection);

            // Créer l'affichage du chemin
            const pathDisplay = this.createPathDisplay(strategy, currentItemId, startLevel, endLevel, dataService);
            pathSection.appendChild(pathDisplay);

            // Capturer avec html2canvas
            const canvas = await html2canvas(captureContainer, {
                backgroundColor: '#1a1f2e',
                scale: 2,
                logging: false,
                windowWidth: 1200,
                windowHeight: captureContainer.scrollHeight
            });

            // Télécharger l'image
            const link = document.createElement('a');
            link.download = `upways-${currentItem}-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL();
            link.click();

            // Nettoyer
            document.body.removeChild(captureContainer);

            return true;
        } catch (error) {
            console.error('Export error:', error);
            throw error;
        }
    }

    /**
     * Crée le conteneur de capture
     */
    createCaptureContainer() {
        const container = document.createElement('div');
        container.style.cssText = `
            width: 1200px;
            background: #1a1f2e;
            padding: 20px;
            position: absolute;
            left: -9999px;
            top: 0;
        `;
        return container;
    }

    /**
     * Crée le header de l'export
     */
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

        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 20px;">
                <img src="logo.png" alt="Logo" style="height: 50px;">
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

    /**
     * Crée la section du chemin d'amélioration
     */
    createPathSection(strategy, currentItem, itemImgSrc) {
        const section = document.createElement('div');
        section.style.cssText = `
            background: #0f1419;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 20px;
        `;

        const totalCost = Math.round(strategy.totalCost);

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

    /**
     * Crée l'affichage du chemin d'amélioration
     */
    createPathDisplay(strategy, currentItemId, startLevel, endLevel, dataService) {
        const pathDisplay = document.createElement('div');
        pathDisplay.style.cssText = `
            display: flex;
            align-items: stretch;
            justify-content: space-between;
            flex-wrap: nowrap;
            width: 100%;
            gap: 20px;
            padding: 20px;
            overflow-x: auto;
        `;

        const itemData = dataService.getItemById(currentItemId);
        const fullWaypoints = strategy.markov.waypoints;

        for (let level = 1; level <= endLevel; level++) {
            const waypointValue = fullWaypoints[level - 1];

            if (waypointValue > 0.01) {
                const levelData = itemData[level.toString()] || { materials: {}, success_rate: 0 };

                let upgradeType;
                if (level > startLevel && level <= endLevel) {
                    const pathIndex = level - startLevel - 1;
                    upgradeType = strategy.path[pathIndex].name;
                } else {
                    upgradeType = level <= 4 ? "Parchemin de Guerre" : "Parchemin de bénédiction";
                }

                const rate = this.calculateSuccessRate(level, upgradeType, levelData.success_rate);

                const stepDiv = this.createStepDiv(level, upgradeType, rate, waypointValue, level <= startLevel);
                pathDisplay.appendChild(stepDiv);
            }
        }

        return pathDisplay;
    }

    /**
     * Crée un div pour une étape du chemin
     */
    createStepDiv(level, upgradeType, rate, waypointValue, isBelowStart) {
        const stepDiv = document.createElement('div');
        stepDiv.style.cssText = `
            background: #1a1f2e;
            border: 2px solid ${isBelowStart ? '#f59e0b' : '#2d3748'};
            border-radius: 8px;
            padding: 12px 10px;
            text-align: center;
            width: 100px;
            flex-shrink: 0;
            white-space: normal;
            overflow-wrap: break-word;
            word-break: break-word;
        `;

        stepDiv.innerHTML = `
            <div style="font-size: 12px; color: #6366f1; font-weight: bold; margin-bottom: 5px;">+${level}</div>
            <img src="img/${this.getUpgradeIcon(upgradeType)}" style="width: 40px; height: 40px; margin: 0 auto 5px; display: block;">
            <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 3px;">${this.translator.t(upgradeType)}</div>
            <div style="color: #48bb78; font-size: 14px; font-weight: bold;">${rate}%</div>
            <div style="color: #6366f1; font-size: 12px; margin-top: 3px;">${waypointValue.toFixed(1)}x</div>
        `;

        return stepDiv;
    }

    /**
     * Calcule le taux de succès (méthode dupliquée pour l'indépendance)
     */
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

    /**
     * Obtient l'icône pour un type d'amélioration
     */
    getUpgradeIcon(upgradeType) {
        const iconMap = {
            "Parchemin de bénédiction": "Parchemin_de_bénédiction.png",
            "Manuel de Forgeron": "Manuel_de_Forgeron.png",
            "Parchemin du Dieu Dragon": "Parchemin_du_Dieu_Dragon.png",
            "Parchemin de Guerre": "Parchemin_de_Guerre.png",
            "Pierre magique": "Pierre_magique.png"
        };
        return iconMap[upgradeType] || "default.png";
    }
}