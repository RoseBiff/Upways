/**
 * Helpers pour l'interface utilisateur
 */

/**
 * Affiche un toast de notification
 */
export function showToast(type, message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : '✗'}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });
    
    // Suppression automatique
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
}

/**
 * Affiche l'overlay de chargement
 */
export function showLoading(message = null) {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    if (message) {
        const textElement = overlay.querySelector('p');
        if (textElement) {
            textElement.textContent = message;
        }
    }
    
    overlay.style.display = 'flex';
}

/**
 * Cache l'overlay de chargement
 */
export function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    overlay.style.display = 'none';
}

/**
 * Crée et gère un tooltip
 */
export class TooltipManager {
    constructor() {
        this.tooltip = document.getElementById('tooltip');
        this.tooltipContent = document.getElementById('tooltipContent');
        this.currentTarget = null;
        
        // Créer le tooltip s'il n'existe pas
        if (!this.tooltip) {
            this.createTooltip();
        }
    }
    
    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.tooltip.id = 'tooltip';
        this.tooltip.style.display = 'none';
        
        this.tooltipContent = document.createElement('div');
        this.tooltipContent.className = 'tooltip-content';
        this.tooltipContent.id = 'tooltipContent';
        
        this.tooltip.appendChild(this.tooltipContent);
        document.body.appendChild(this.tooltip);
    }
    
    show(element, content, options = {}) {
        this.currentTarget = element;
        this.tooltipContent.innerHTML = content;
        this.tooltip.style.display = 'block';
        
        // Position du tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;
        
        // Ajuster si sort de l'écran
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
            this.tooltip.classList.add('tooltip-bottom');
        } else {
            this.tooltip.classList.remove('tooltip-bottom');
        }
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        
        // Options supplémentaires
        if (options.className) {
            this.tooltip.classList.add(options.className);
        }
    }
    
    hide() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
            this.tooltip.className = 'tooltip'; // Reset classes
        }
        this.currentTarget = null;
    }
    
    attach(element, content, options = {}) {
        element.addEventListener('mouseenter', () => this.show(element, content, options));
        element.addEventListener('mouseleave', () => this.hide());
    }
}

/**
 * Crée une modale
 */
export function createModal(options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">${options.title || ''}</h3>
                <button class="modal-close">×</button>
            </div>
            <div class="modal-body">
                ${options.content || ''}
            </div>
            ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
        </div>
    `;
    
    // Événements
    const backdrop = modal.querySelector('.modal-backdrop');
    const closeBtn = modal.querySelector('.modal-close');
    
    const close = () => {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 300);
    };
    
    backdrop.addEventListener('click', close);
    closeBtn.addEventListener('click', close);
    
    // Ajouter au DOM
    document.body.appendChild(modal);
    
    // Animation d'ouverture
    requestAnimationFrame(() => {
        modal.classList.add('open');
    });
    
    return {
        element: modal,
        close,
        setContent: (content) => {
            modal.querySelector('.modal-body').innerHTML = content;
        }
    };
}

/**
 * Confirme une action avec une boîte de dialogue
 */
export function confirm(message, options = {}) {
    return new Promise((resolve) => {
        const modal = createModal({
            title: options.title || 'Confirmation',
            content: `<p>${message}</p>`,
            footer: `
                <button class="btn btn-secondary" data-action="cancel">
                    ${options.cancelText || 'Annuler'}
                </button>
                <button class="btn btn-primary" data-action="confirm">
                    ${options.confirmText || 'Confirmer'}
                </button>
            `
        });
        
        const buttons = modal.element.querySelectorAll('[data-action]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                modal.close();
                resolve(action === 'confirm');
            });
        });
    });
}

/**
 * Anime un élément
 */
export function animate(element, animation, duration = 300) {
    return new Promise((resolve) => {
        element.style.animation = `${animation} ${duration}ms ease-out`;
        
        const handleEnd = () => {
            element.style.animation = '';
            element.removeEventListener('animationend', handleEnd);
            resolve();
        };
        
        element.addEventListener('animationend', handleEnd);
    });
}

/**
 * Fait défiler jusqu'à un élément
 */
export function scrollToElement(element, options = {}) {
    const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
        ...options
    };
    
    element.scrollIntoView(defaultOptions);
}

/**
 * Copie du texte dans le presse-papiers
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('success', 'Copié dans le presse-papiers');
        return true;
    } catch (err) {
        console.error('Erreur lors de la copie:', err);
        showToast('error', 'Impossible de copier');
        return false;
    }
}

/**
 * Débounce une fonction
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle une fonction
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Classe pour gérer l'état de l'UI
 */
export class UIState {
    constructor() {
        this.loading = false;
        this.tooltipManager = new TooltipManager();
    }
    
    showLoading(message) {
        this.loading = true;
        showLoading(message);
    }
    
    hideLoading() {
        this.loading = false;
        hideLoading();
    }
    
    showToast(type, message, duration) {
        return showToast(type, message, duration);
    }
    
    showTooltip(element, content, options) {
        this.tooltipManager.show(element, content, options);
    }
    
    hideTooltip() {
        this.tooltipManager.hide();
    }
    
    async confirm(message, options) {
        return confirm(message, options);
    }
    
    isLoading() {
        return this.loading;
    }
}