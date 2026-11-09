/**
 * Fichier de diagnostic pour identifier les problèmes d'intégration
 */

export class DiagnosticHelper {
    /**
     * Vérifie la structure d'une stratégie
     */
    static validateStrategyStructure(strategy, name = 'Strategy') {
        console.group(`🔍 Validating ${name}`);
        
        const requiredFields = [
            'method',
            'waypoints',
            'totalTrials',
            'totalCost',
            'intervals',
            'path'
        ];
        
        const optionalFields = [
            'extendedWaypoints',
            'fullPath',
            'rates',
            'flags',
            'riskLevel',
            'markov',
            'strategy'
        ];
        
        // Vérifier les champs requis
        const missingFields = requiredFields.filter(field => !(field in strategy));
        if (missingFields.length > 0) {
            console.error(`❌ Missing required fields:`, missingFields);
        } else {
            console.log('✅ All required fields present');
        }
        
        // Afficher la structure
        console.log('📊 Strategy structure:', {
            method: strategy.method,
            totalTrials: strategy.totalTrials,
            totalCost: strategy.totalCost,
            waypointsLength: strategy.waypoints?.length,
            pathLength: strategy.path?.length,
            hasIntervals: !!strategy.intervals,
            hasMarkov: !!strategy.markov,
            hasExtendedWaypoints: !!strategy.extendedWaypoints
        });
        
        // Vérifier les types
        if (strategy.waypoints && !Array.isArray(strategy.waypoints)) {
            console.error('❌ waypoints should be an array');
        }
        
        if (strategy.path && !Array.isArray(strategy.path)) {
            console.error('❌ path should be an array');
        }
        
        if (typeof strategy.totalTrials !== 'number') {
            console.error('❌ totalTrials should be a number');
        }
        
        if (typeof strategy.totalCost !== 'number') {
            console.error('❌ totalCost should be a number');
        }
        
        // Vérifier les intervalles
        if (strategy.intervals) {
            console.log('📈 Intervals structure:', {
                hasTotal: !!strategy.intervals.total,
                hasByLevel: !!strategy.intervals.byLevel,
                totalMean: strategy.intervals.total?.mean,
                totalStd: strategy.intervals.total?.std
            });
        }
        
        console.groupEnd();
        
        return missingFields.length === 0;
    }
    
    /**
     * Compare deux stratégies
     */
    static compareStrategies(oldStrategy, newStrategy) {
        console.group('🔄 Comparing strategies');
        
        console.log('Old total cost:', oldStrategy.expectedTotalCost || oldStrategy.totalCost);
        console.log('New total cost:', newStrategy.totalCost);
        
        if (oldStrategy.expectedVisits && newStrategy.waypoints) {
            console.log('Old visits:', oldStrategy.expectedVisits);
            console.log('New waypoints:', newStrategy.waypoints);
        }
        
        if (oldStrategy.strategy?.path && newStrategy.path) {
            console.log('Old path:', oldStrategy.strategy.path);
            console.log('New path (IDs):', newStrategy.strategy?.path);
            console.log('New path (names):', newStrategy.fullPath);
        }
        
        console.groupEnd();
    }
    
    /**
     * Vérifie la compatibilité avec l'interface
     */
    static checkUICompatibility(strategy) {
        console.group('🎨 Checking UI compatibility');
        
        // Vérifier pour AnalysisComponent
        const analysisChecks = {
            'Can display total trials': !!strategy.totalTrials,
            'Can display total cost': !!strategy.totalCost,
            'Can display intervals': !!strategy.intervals?.total?.ci95,
            'Can display path': !!strategy.path && Array.isArray(strategy.path),
            'Can display waypoints': !!strategy.waypoints || !!strategy.extendedWaypoints
        };
        
        Object.entries(analysisChecks).forEach(([check, result]) => {
            console.log(`${result ? '✅' : '❌'} ${check}`);
        });
        
        // Vérifier pour ChartComponent
        const chartChecks = {
            'Can calculate probabilities': !!(strategy.markov?.calculateTrialsProbabilities || strategy.calculateTrialsProbabilities),
            'Has total trials for mean line': !!strategy.totalTrials,
            'Has path with rates': !!strategy.path && strategy.path[0]?.rate !== undefined
        };
        
        console.log('\n📊 Chart compatibility:');
        Object.entries(chartChecks).forEach(([check, result]) => {
            console.log(`${result ? '✅' : '❌'} ${check}`);
        });
        
        console.groupEnd();
    }
    
    /**
     * Teste un calcul simple
     */
    static async testSimpleCalculation(strategyService) {
        console.group('🧪 Testing simple calculation');
        
        try {
            // Créer un item de test simple
            const testResult = await strategyService.calculateOptimalStrategy("test_item", 0, 5);
            
            this.validateStrategyStructure(testResult, 'Test Result');
            this.checkUICompatibility(testResult);
            
            console.log('✅ Test completed successfully');
            return testResult;
        } catch (error) {
            console.error('❌ Test failed:', error);
            console.error('Stack trace:', error.stack);
            return null;
        } finally {
            console.groupEnd();
        }
    }
    
    /**
     * Affiche les informations de debug
     */
    static debugStrategy(strategy) {
        console.group('🐛 Debug Strategy');
        
        // Afficher toute la structure
        console.log('Full strategy object:', strategy);
        
        // Afficher les waypoints
        if (strategy.waypoints) {
            console.table(strategy.waypoints.map((w, i) => ({
                level: i + 1,
                waypoint: w,
                trials: Math.round(w * 10) / 10
            })));
        }
        
        // Afficher le path
        if (strategy.path) {
            console.table(strategy.path.map(p => ({
                level: p.level,
                name: p.name,
                rate: p.rate,
                cost: p.totalCost
            })));
        }
        
        console.groupEnd();
    }
}

// Fonction helper globale pour debug rapide
window.debugStrategy = function(strategy) {
    DiagnosticHelper.debugStrategy(strategy);
};

window.validateStrategy = function(strategy) {
    return DiagnosticHelper.validateStrategyStructure(strategy);
};

// Auto-diagnostic au chargement
console.log('🔧 Diagnostic Helper loaded. Use window.debugStrategy() and window.validateStrategy() for debugging.');