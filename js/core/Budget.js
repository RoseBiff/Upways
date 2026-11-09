/**
 * Budget → probabilité de réussir l'amélioration complète.
 *
 * Inverse exact de la liste de préparation (AnalysisComponent._computeScaleFactor) :
 *  - les paliers déterministes (taux 100 %, 1 tentative) ont un coût fixe ;
 *  - les paliers aléatoires sont mis à l'échelle avec le nombre total de tentatives.
 * Un budget égal au coût affiché pour une confiance de X % redonne donc ~X %.
 *
 * @param {object} strategy   Résultat de StrategyService (distribution, totalCost, path…)
 * @param {number} budgetM    Budget en millions de yangs
 * @param {{startLevel:number, endLevel:number}} levels
 * @returns {{probability:number, trials:number} | null}
 */
export function computeBudgetProbability(strategy, budgetM, { startLevel, endLevel }) {
    const dist = strategy?.distribution;
    const meanCost = strategy?.totalCost || 0;
    if (!dist?.length || !(budgetM >= 0) || meanCost <= 0) return null;

    const isHybrid = strategy.type === 'hybrid';
    const meanTrials = isHybrid
        ? (strategy.expectedItems || strategy.totalTrials || 1)
        : (strategy.intervals?.total?.mean || strategy.totalTrials || 1);

    // Paliers déterministes (coût fixe)
    let detTrials = 0, detCost = 0;
    if (!isHybrid) {
        const path = strategy.path || [];
        const extWp = strategy.extendedWaypoints || [];
        for (let level = 1; level <= endLevel; level++) {
            const pathData = path[level - startLevel - 1];
            const wp = pathData?.expectedTrials || extWp[level - 1] || 0;
            if (pathData?.rate === 100 && wp <= 1.01) {
                detTrials += wp;
                detCost += wp * (pathData.totalCost || 0);
            }
        }
    }

    const stochCost = meanCost - detCost;
    const stochTrials = meanTrials - detTrials;
    let trials;
    if (stochCost <= 0 || stochTrials <= 0) {
        trials = budgetM >= meanCost ? dist.length : 0;
    } else {
        trials = detTrials + Math.max(budgetM - detCost, 0) / stochCost * stochTrials;
    }

    // P(nombre total de tentatives ≤ trials)
    let cdf = 0;
    const idx = Math.floor(trials + 1e-9);
    for (let i = 0; i <= Math.min(idx, dist.length - 1); i++) cdf += dist[i];
    return { probability: Math.min(cdf, 1), trials };
}
