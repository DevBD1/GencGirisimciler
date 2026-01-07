/**
 * Genç Girişimciler Bilgilendirme Sitesi
 * Application Logic
 */

// ===================================
// Configuration
// ===================================
const CONFIG = {
    hashtag: 'GençGirişimci',
    storageKey: 'genc-girisimci-steps',
    legalBannerKey: 'legal-banner-dismissed',
    tweetTemplate: `Devletimizin 12 ay yanındayım sözüne güvenerek yola çıktık, yıla borç sürpriziyle uyandık. Kazanılmış haklar anayasal emanettir; devletimizin sözünde durarak #GençGirişimci'leri mağdur etmeyeceğine inanıyoruz.

@RTErdogan @isikhanvedat @csgbakanligi @sgksosyalmedya #Bağkur #SGK`,
};

// ===================================
// Legal Banner Management
// ===================================
function closeLegalBanner() {
    const banner = document.getElementById('legalBanner');
    if (banner) {
        banner.classList.add('hidden');
        localStorage.setItem(CONFIG.legalBannerKey, 'true');
    }
}

// Check if banner was previously dismissed
document.addEventListener('DOMContentLoaded', () => {
    const wasDismissed = localStorage.getItem(CONFIG.legalBannerKey);
    if (wasDismissed === 'true') {
        const banner = document.getElementById('legalBanner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }
});

// ===================================
// Checklist State Management
// ===================================
class ChecklistManager {
    constructor(storageKey) {
        this.storageKey = storageKey;
        this.state = this.loadState();
    }

    /**
     * Load saved state from localStorage
     * @returns {Object} Saved state or empty object
     */
    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.warn('Failed to load checklist state:', e);
            return {};
        }
    }

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save checklist state:', e);
        }
    }

    /**
     * Check if a step is completed
     * @param {string} stepId 
     * @returns {boolean}
     */
    isCompleted(stepId) {
        return this.state[stepId] === true;
    }

    /**
     * Toggle a step's completion status
     * @param {string} stepId 
     * @returns {boolean} New status
     */
    toggle(stepId) {
        this.state[stepId] = !this.state[stepId];
        this.saveState();
        return this.state[stepId];
    }

    /**
     * Get completion statistics
     * @param {number} totalSteps 
     * @returns {Object}
     */
    getStats(totalSteps) {
        const completed = Object.values(this.state).filter(v => v === true).length;
        return {
            completed,
            total: totalSteps,
            percentage: Math.round((completed / totalSteps) * 100)
        };
    }
}

// ===================================
// Tweet Functionality
// ===================================
class TweetManager {
    constructor(template) {
        this.template = template;
    }

    /**
     * Open Twitter intent with pre-filled tweet
     */
    openTweetIntent() {
        const encodedText = encodeURIComponent(this.template);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    }
}

// ===================================
// DOM Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    const checklistManager = new ChecklistManager(CONFIG.storageKey);
    const tweetManager = new TweetManager(CONFIG.tweetTemplate);

    // ===================================
    // Checklist Setup
    // ===================================
    const checklistItems = document.querySelectorAll('.checklist-item');
    
    checklistItems.forEach(item => {
        const stepId = item.dataset.step;
        const checkbox = item.querySelector('input[type="checkbox"]');
        
        if (!checkbox || !stepId) return;

        // Restore saved state
        if (checklistManager.isCompleted(stepId)) {
            checkbox.checked = true;
            item.classList.add('completed');
        }

        // Handle checkbox changes
        checkbox.addEventListener('change', () => {
            const isCompleted = checklistManager.toggle(stepId);
            
            if (isCompleted) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }

            // Log stats for debugging
            const stats = checklistManager.getStats(checklistItems.length);
            console.log(`Checklist progress: ${stats.completed}/${stats.total} (${stats.percentage}%)`);
        });
    });

    // ===================================
    // Tweet Button Setup
    // ===================================
    const tweetBtn = document.getElementById('tweetBtn');
    
    if (tweetBtn) {
        tweetBtn.addEventListener('click', () => {
            tweetManager.openTweetIntent();
        });
    }

    // ===================================
    // Keyboard Accessibility
    // ===================================
    // Allow Enter key to toggle checkboxes when focused on label
    document.querySelectorAll('.checklist-item__checkbox').forEach(label => {
        label.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const checkbox = label.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
        });
        
        // Make labels focusable
        label.setAttribute('tabindex', '0');
    });

    // ===================================
    // Social Embeds Loading from posts.json
    // ===================================
    const loadTweets = async () => {
        const container = document.getElementById('tweets-container');
        const loading = document.getElementById('twitter-loading');
        
        if (!container) return;
        
        try {
            // Fetch posts.json
            const response = await fetch('posts.json');
            if (!response.ok) throw new Error('Failed to load posts.json');
            
            const data = await response.json();
            const tweets = data.tweets || [];
            
            if (tweets.length === 0) {
                loading.innerHTML = '<p>Henüz paylaşılan gönderi yok.</p>';
                return;
            }
            
            // Hide loading indicator
            loading.style.display = 'none';
            
            // Wait for Twitter widgets to be ready
            const renderTweets = () => {
                tweets.forEach(tweetUrl => {
                    // Extract tweet ID from URL
                    const tweetIdMatch = tweetUrl.match(/status\/(\d+)/);
                    if (tweetIdMatch && window.twttr) {
                        const tweetId = tweetIdMatch[1];
                        const tweetDiv = document.createElement('div');
                        tweetDiv.className = 'tweet-embed';
                        container.appendChild(tweetDiv);
                        
                        window.twttr.widgets.createTweet(tweetId, tweetDiv, {
                            theme: 'light',
                            lang: 'tr',
                            dnt: true,
                            conversation: 'none'
                        });
                    }
                });
            };
            
            // Check if Twitter widgets are loaded
            if (window.twttr && window.twttr.widgets) {
                renderTweets();
            } else {
                // Wait for Twitter widgets to load
                window.twttr = window.twttr || {};
                window.twttr.ready = window.twttr.ready || [];
                window.twttr.ready.push(renderTweets);
            }
            
        } catch (error) {
            console.warn('Failed to load tweets:', error);
            loading.innerHTML = `
                <p>Gönderiler yüklenemedi.</p>
                <a href="https://twitter.com/search?q=%23GençGirişimci" target="_blank" rel="noopener noreferrer" class="social-embed__link">
                    X'te Ara →
                </a>
            `;
        }
    };
    
    // Load tweets after DOM is ready
    loadTweets();

    console.log('Genç Girişimciler Bilgilendirme Sitesi initialized');
});

// ===================================
// Petition Generator
// ===================================
class PetitionGenerator {
    constructor() {
        this.currentPetitionType = 'sgk';
        this.generatedText = '';
    }

    /**
     * Format date to Turkish format (DD.MM.YYYY)
     * @param {string} dateStr - Date string in YYYY-MM-DD format
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}.${month}.${year}`;
    }

    /**
     * Calculate end date (1 year after start date)
     * @param {string} startDateStr - Start date in YYYY-MM-DD format
     * @returns {string} End date in Turkish format
     */
    calculateEndDate(startDateStr) {
        if (!startDateStr) return '';
        const date = new Date(startDateStr);
        date.setFullYear(date.getFullYear() + 1);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Generate the SGK petition text
     * @param {Object} data - Form data
     * @returns {string} Generated petition text
     */
    generateSGKPetition(data) {
        const startDateFormatted = this.formatDate(data.startDate);
        const endDateFormatted = this.calculateEndDate(data.startDate);
        const applicationDateFormatted = this.formatDate(data.applicationDate);
        const approvalDateFormatted = this.formatDate(data.approvalDate);
        const petitionDateFormatted = this.formatDate(data.petitionDate);

        return `SOSYAL GÜVENLİK KURUMU BAŞKANLIĞI
${data.sgkCity.toUpperCase()} ${data.sgkDistrict.toUpperCase()} SOSYAL GÜVENLİK MÜDÜRLÜĞÜNE

AD SOYAD : ${data.fullName.toUpperCase()}
TCKN : ${data.tckn}
ADRES : ${data.address}

KONU : Hukuka aykırı olarak tahakkuk ettirilen prim borcunun geri alınması ve Genç Girişimci Desteğinin ${endDateFormatted} tarihine kadar devamı hususunda talepleri içerir dilekçedir.

${data.workCity} ${data.workDistrict}'de ${startDateFormatted} tarihinden beri ${data.profession} mesleğini icra etmekteyim. İlgili şartları sağladığım için ${applicationDateFormatted} Genç Girişimcilerde Kazanç İstisnası programına başvurdum ve ${data.taxOffice} tarafından ${approvalDateFormatted} tarihinde tarafıma tebliğ edilen:

'İlgi dilekçenize istinaden dairemiz kayıtları tetkik edildiğinde; ${data.tckn} T.C kimlik numarası ile ${startDateFormatted} tarihinden itibaren dairemiz mükellefi olduğunuz ve 193 Sayılı Gelir Vergisi Kanunu'nun mükerrer 20. maddesindeki "Genç Girişimcilerde Kazanç İstisnası " şartlarını taşıdığınız görülmüştür.'

şeklindeki kabul yazısını ${data.sgkDistrict} SGK müdürlüğüne ibraz etmem akabinde ilgili genç girişimci desteğinden yararlanmaya başladım.

Genç girişimci desteğim devam etmekte iken 04/12/2025 tarihinde kabul edilen 7566 sayılı kanunun 23.Maddesi ile 5510 sayılı Kanunun 81 inci maddesinin birinci fıkrasının (k) bendi yürürlükten kaldırılmıştır.

İlgili kanunun mülga bendi aynen şöyledir:

"31/12/1960 tarihli ve 193 sayılı Gelir Vergisi Kanununun mükerrer 20 nci maddesi kapsamında genç girişimcilerde kazanç istisnasından faydalanan ve mükellefiyet başlangıç tarihi itibarıyla 18 yaşını doldurmuş ve 29 yaşını doldurmamış olanlardan, bu Kanunun 4 üncü maddesinin birinci fıkrasının (b) bendinin (1) numaralı alt bendi kapsamında 1/6/2018 tarihinden itibaren ilk defa sigortalı sayılan gerçek kişilerin primleri, 1 yıl süreyle 82 nci madde uyarınca belirlenen prime esas kazanç alt sınır üzerinden Hazinece karşılanır. Adi ortaklıklar ve şahıs şirket ortaklıklarında sadece bir ortak bu fıkra hükmünden yararlandırılır."

Kanun hükmünden de anlaşıldığı üzere şartları sağlayan gerçek kişilerin sigorta primleri 1 yıl süreyle devletçe karşılanmaktadır. Sigorta prim desteği 1 takvim yılı değil, 12 aylık süreyle uygulanmaktadır.

İlgili kanun 01.01.2026 tarihinde yürürlüğe girecek ve bu tarihten sonra yapılacak olan başvuruları kapsayacak şekilde Genç Girişimci Desteği kaldırılmıştır. Ancak normal şartlarda mesleğe başladığım tarih olan ${startDateFormatted} tarihinden 1 yıl sonrası olan ${endDateFormatted} tarihine kadar devam etmesi gereken Genç Girişimci Desteği 01.01.2026 tarihinde sona erdirilmiş ve tarafıma ${data.debtAmount} TL tutarında prim borcu yansıtılmıştır.

Bu durum konu itibariyle hukuka aykırılık teşkil etmektedir. Ayrıca Anayasamızın 2.Maddesinde güvence altına alınan hukuk devleti ilkesinin en temel dayanaklarından birisi olan kazanılmış haklara saygı ilkesini ihlal etmiştir.

Tüm bu nedenlerle ilgili hukuka aykırı prim borcu tahakkuku işleminin baştan itibaren geri alınması ve desteğin sona ereceği tarih olan ${endDateFormatted} tarihine kadar ilgili sigorta prim desteğinin devam ettirilmesi gerekmektedir.

TALEP VE SONUÇ:
1) Hukuka aykırı prim borcu tahakkukunun baştan itibaren GERİ ALINMASI,
2) Mülga edilen kanun bendinde belirtilen 1 yıllık sürenin bitimi olan ${endDateFormatted} tarihine kadar sigorta primlerimin ÖDENMESİNE DEVAM EDİLMESİ'ni talep ediyorum.

${petitionDateFormatted}

Ekler:
EK1 - Genç Girişimcilerde Kazanç İstisnası şartlarını taşıdığıma dair Vergi dairesi üst yazısı
EK2 - Haksız olarak tahakkuk ettirilen ${data.debtAmount} TL tutarındaki prim borcunu gösterir görsel

${data.fullName}`;
    }

    /**
     * Get form data
     * @returns {Object} Form data object
     */
    getFormData() {
        return {
            fullName: document.getElementById('fullName')?.value || '',
            tckn: document.getElementById('tckn')?.value || '',
            address: document.getElementById('address')?.value || '',
            sgkCity: document.getElementById('sgkCity')?.value || '',
            sgkDistrict: document.getElementById('sgkDistrict')?.value || '',
            workCity: document.getElementById('workCity')?.value || '',
            workDistrict: document.getElementById('workDistrict')?.value || '',
            profession: document.getElementById('profession')?.value || '',
            startDate: document.getElementById('startDate')?.value || '',
            applicationDate: document.getElementById('applicationDate')?.value || '',
            approvalDate: document.getElementById('approvalDate')?.value || '',
            taxOffice: document.getElementById('taxOffice')?.value || '',
            debtAmount: document.getElementById('debtAmount')?.value || '',
            petitionDate: document.getElementById('petitionDate')?.value || '',
        };
    }

    /**
     * Validate form data
     * @param {Object} data - Form data
     * @returns {boolean} Is valid
     */
    validateForm(data) {
        const requiredFields = [
            'fullName', 'tckn', 'address', 'sgkCity', 'sgkDistrict',
            'workCity', 'workDistrict', 'profession', 'startDate',
            'applicationDate', 'approvalDate', 'taxOffice', 'debtAmount', 'petitionDate'
        ];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                return false;
            }
        }
        
        // Validate TCKN (11 digits)
        if (!/^\d{11}$/.test(data.tckn)) {
            alert('TC Kimlik No 11 haneli olmalıdır.');
            return false;
        }
        
        return true;
    }

    /**
     * Generate petition based on type
     * @param {string} type - Petition type
     * @returns {string|null} Generated petition text or null if invalid
     */
    generate(type) {
        const data = this.getFormData();
        
        if (!this.validateForm(data)) {
            alert('Lütfen tüm alanları doldurun.');
            return null;
        }
        
        this.currentPetitionType = type;
        
        switch (type) {
            case 'sgk':
                this.generatedText = this.generateSGKPetition(data);
                break;
            default:
                this.generatedText = this.generateSGKPetition(data);
        }
        
        return this.generatedText;
    }
}

// Create global petition generator instance
const petitionGenerator = new PetitionGenerator();

// ===================================
// Modal Control Functions (Global)
// ===================================
function openPetitionGenerator(type = 'sgk') {
    petitionGenerator.currentPetitionType = type;
    
    // Set default petition date to today
    const today = new Date().toISOString().split('T')[0];
    const petitionDateInput = document.getElementById('petitionDate');
    if (petitionDateInput && !petitionDateInput.value) {
        petitionDateInput.value = today;
    }
    
    document.getElementById('petitionModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePetitionGenerator() {
    document.getElementById('petitionModal').classList.remove('active');
    document.body.style.overflow = '';
}

function generatePetition() {
    const form = document.getElementById('petitionForm');
    
    // Check form validity using HTML5 validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const text = petitionGenerator.generate(petitionGenerator.currentPetitionType);
    
    if (text) {
        document.getElementById('petitionPreview').textContent = text;
        closePetitionGenerator();
        document.getElementById('petitionResultModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePetitionResult() {
    document.getElementById('petitionResultModal').classList.remove('active');
    document.body.style.overflow = '';
}

function copyPetition() {
    const text = petitionGenerator.generatedText;
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Dilekçe panoya kopyalandı!');
    }).catch(err => {
        console.error('Kopyalama hatası:', err);
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Dilekçe panoya kopyalandı!');
    });
}

function printPetition() {
    window.print();
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'petitionModal') {
            closePetitionGenerator();
        } else if (e.target.id === 'petitionResultModal') {
            closePetitionResult();
        }
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePetitionGenerator();
        closePetitionResult();
    }
});

// ===================================
// Export for potential module usage
// ===================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ChecklistManager, TweetManager, PetitionGenerator };
}
