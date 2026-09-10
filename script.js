const categories = [
  { id: 'sumkalar', title: 'Sumkalar' },
  { id: 'kiyimlar', title: 'Kiyimlar' },
  { id: 'romollar', title: "Ro'mollar" }
];

const categoryBackgrounds = {
  sumkalar: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1800&q=85',
  kiyimlar: 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1800&q=85',
  romollar: null
};

const savedProducts = localStorage.getItem('eminamavi-products');
let products = savedProducts ? JSON.parse(savedProducts) : [];
if (!Array.isArray(products)) {
  products = [];
}
products = products.map((product, index) => ({
  ...product,
  id: product.id || `${product.category || 'product'}-${index}`,
  category: product.category || 'kiyimlar',
  quantity: Number(product.quantity) > 0 ? Number(product.quantity) : 1,
  discount: Number(product.discount) > 0 ? Number(product.discount) : 0,
  top: Boolean(product.top),
  visible: product.visible !== false,
  material: product.material || '',
  description: product.description || ''
  ,galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages : []
}));

const ADMIN_EMAIL = 'akromov30052009@gmail.com';
const ADMIN_PASSWORD = 'admin123';
const carouselState = {};
let carouselTimers = {};
let topCarouselTimer;
let saleCarouselTimer;
let clothingCarouselTimer;
let topCarouselSlide = 0;
let saleCarouselSlide = 0;
let clothingCarouselSlide = 0;
let activeCategory = 'all';
let activeSort = 'newest';
let currentCurrency = localStorage.getItem('eminamavi-currency') || 'uzs';
const dollarRate = 12800;
let productSearch = '';
let selectedProduct = null;
let favoriteProducts = JSON.parse(localStorage.getItem('eminamavi-favorites') || '[]');
const requestedCategory = new URLSearchParams(window.location.search).get('category');
const isAdminWindow = new URLSearchParams(window.location.search).get('admin') === 'true';
if (categories.some((category) => category.id === requestedCategory)) {
  activeCategory = requestedCategory;
}
let authModal = document.querySelector('#auth-modal');
let profileModal = document.querySelector('#profile-modal');
let favoritesModal = document.querySelector('#favorites-modal');
let authForm = document.querySelector('#auth-form');
let authMessage = document.querySelector('#auth-message');
let authEmail = document.querySelector('#auth-email');
let authPassword = document.querySelector('#auth-password');
let adminPanel = document.querySelector('#admin-panel');
let productModal = document.querySelector('#product-modal');
let editingProductId = null;

function formatPrice(price) {
  if (currentCurrency === 'usd') return `$${(Number(price) / dollarRate).toFixed(2)}`;
  return `${Number(price).toLocaleString('uz-UZ')} so'm`;
}

function getDiscountedPrice(product) {
  return Number(product.price) * (1 - Number(product.discount) / 100);
}

function getProducts(categoryId) {
  return getVisibleProducts().filter((product) => product.category === categoryId);
}

function getVisibleProducts() {
  const visibleProducts = activeCategory === 'all'
    ? products.filter((product) => product.visible !== false)
    : products.filter((product) => product.category === activeCategory && product.visible !== false);
  const searchedProducts = productSearch
    ? visibleProducts.filter((product) => product.name.toLowerCase().includes(productSearch))
    : visibleProducts;

  if (activeSort === 'price-low') return searchedProducts.sort((first, second) => Number(first.price) - Number(second.price));
  if (activeSort === 'price-high') return searchedProducts.sort((first, second) => Number(second.price) - Number(first.price));
  return searchedProducts;
}

function productCardAttributes(product) {
  return `data-product-id="${product.id}" tabindex="0" role="button"`;
}

function productBadges(product) {
  const badges = [];
  if (Number(product.discount) > 0) badges.push(`<span class="product-badge sale-badge">-${product.discount}%</span>`);
  if (Number(product.quantity) < 5) badges.push('<span class="product-badge stock-badge">Kam qoldi</span>');
  if (product.top) badges.push('<span class="product-badge top-badge">Top</span>');
  if (product.id.endsWith('-0')) badges.push('<span class="product-badge new-badge">Yangi</span>');
  return badges.length > 0 ? `<div class="product-badges">${badges.join('')}</div>` : '';
}

function favoriteMarkup(product) {
  const isFavorite = favoriteProducts.includes(product.id);
  return `<button class="card-favorite ${isFavorite ? 'active' : ''}" type="button" data-favorite-toggle="${product.id}" aria-label="${isFavorite ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo\'shish'}">${isFavorite ? '♥' : '♡'}</button>`;
}

function openProduct(productId) {
  selectedProduct = products.find((product) => product.id === productId);
  if (!selectedProduct) return;
  document.querySelector('#product-modal-image').src = selectedProduct.image;
  document.querySelector('#product-modal-image').alt = selectedProduct.name;
  renderProductGallery();
  document.querySelector('#product-modal-category').textContent = selectedProduct.category;
  document.querySelector('#product-modal-title').textContent = selectedProduct.name;
  document.querySelector('#product-modal-price').textContent = formatPrice(getDiscountedPrice(selectedProduct));
  document.querySelector('#product-modal-stock').textContent = `${selectedProduct.quantity} ta mavjud`;
  document.querySelector('#product-modal-description').textContent = selectedProduct.description || 'Mahsulot haqida qo\'shimcha ma\'lumot uchun bog\'laning.';
  document.querySelector('#product-modal-material').textContent = selectedProduct.material ? `Material: ${selectedProduct.material}` : '';
  document.querySelector('#order-quantity').max = selectedProduct.quantity;
  document.querySelector('#favorite-button').textContent = favoriteProducts.includes(selectedProduct.id) ? '♥ Sevimlida' : '♡ Sevimli';
  productModal.classList.remove('hidden');
}

function renderProductGallery() {
  const gallery = document.querySelector('#product-gallery');
  if (!gallery || !selectedProduct) return;
  const images = [selectedProduct.image, ...(selectedProduct.galleryImages || [])].filter(Boolean).slice(0, 5);
  gallery.innerHTML = images.map((image, index) => `<button class="gallery-thumb ${index === 0 ? 'active' : ''}" type="button" data-gallery-image="${image}"><img src="${image}" alt="${selectedProduct.name} ${index + 1}"></button>`).join('');
  document.querySelectorAll('[data-gallery-image]').forEach((thumb) => thumb.addEventListener('click', () => {
    document.querySelector('#product-modal-image').src = thumb.dataset.galleryImage;
    document.querySelectorAll('.gallery-thumb').forEach((item) => item.classList.remove('active'));
    thumb.classList.add('active');
  }));
}

function closeProduct() { productModal.classList.add('hidden'); }

function saveFavorite() {
  if (!selectedProduct) return;
  favoriteProducts = favoriteProducts.includes(selectedProduct.id)
    ? favoriteProducts.filter((id) => id !== selectedProduct.id)
    : [...favoriteProducts, selectedProduct.id];
  localStorage.setItem('eminamavi-favorites', JSON.stringify(favoriteProducts));
  document.querySelector('#favorite-button').textContent = favoriteProducts.includes(selectedProduct.id) ? '♥ Sevimlida' : '♡ Sevimli';
  updateFavoritesCount();
  renderFavorites();
}

function toggleFavorite(productId) {
  favoriteProducts = favoriteProducts.includes(productId)
    ? favoriteProducts.filter((id) => id !== productId)
    : [...favoriteProducts, productId];
  localStorage.setItem('eminamavi-favorites', JSON.stringify(favoriteProducts));
  updateFavoritesCount();
  renderFavorites();
  renderCarousels();
}

function updateFavoritesCount() {
  document.querySelector('#favorites-count').textContent = favoriteProducts.length;
}

function renderFavorites() {
  const favoriteItems = products.filter((product) => favoriteProducts.includes(product.id));
  const list = document.querySelector('#favorites-list');
  if (!list) return;
  list.innerHTML = favoriteItems.length > 0
    ? favoriteItems.map((product) => `<button class="favorite-item" type="button" data-favorite-id="${product.id}"><img src="${product.image}" alt="${product.name}"><span>${product.name}</span><strong>${formatPrice(getDiscountedPrice(product))}</strong></button>`).join('')
    : '<p class="empty-admin">Hali sevimli mahsulotlar yo\'q.</p>';
  document.querySelectorAll('.favorite-item').forEach((item) => item.addEventListener('click', () => {
    favoritesModal.classList.add('hidden');
    openProduct(item.dataset.favoriteId);
  }));
}

function sendTelegramOrder() {
  if (!selectedProduct) return;
  const quantity = Number(document.querySelector('#order-quantity').value);
  const color = document.querySelector('#product-color').value;
  const size = document.querySelector('#product-size').value;
    const customerName = document.querySelector('#order-name').value.trim();
    const customerPhone = document.querySelector('#order-phone').value.trim();
    const customerAddress = document.querySelector('#order-address').value.trim();
    const message = `Assalomu alaykum! ${selectedProduct.name} mahsulotidan ${quantity} ta buyurtma bermoqchiman. Rang: ${color}. O'lcham: ${size}. Ism: ${customerName}. Telefon: ${customerPhone}. Manzil: ${customerAddress}.`;
  const orders = JSON.parse(localStorage.getItem('eminamavi-orders') || '[]');
    orders.push({ id: Date.now(), product: selectedProduct.name, quantity, color, size, customerName, customerPhone, customerAddress, status: 'Yangi' });
  localStorage.setItem('eminamavi-orders', JSON.stringify(orders));
  renderAdminOrders();
  window.open(`https://t.me/eminamavi?text=${encodeURIComponent(message)}`, '_blank');
}

function bindProductCards() {
  document.querySelectorAll('[data-product-id]').forEach((card) => card.addEventListener('click', () => openProduct(card.dataset.productId)));
  document.querySelectorAll('[data-favorite-toggle]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFavorite(button.dataset.favoriteToggle);
  }));
}

function renderTopCarousel() {
  const track = document.querySelector('#top-carousel-track');
  const dots = document.querySelector('#top-carousel-dots');
  const controls = document.querySelector('#top-carousel-controls');
  const visibleProducts = getVisibleProducts();
  const cards = visibleProducts.length > 0 ? visibleProducts.map((product) => `
    <article class="carousel-card product-card" ${productCardAttributes(product)}>
      <img class="carousel-image" src="${product.carouselImage || product.image}" alt="${product.name}">
      ${favoriteMarkup(product)}
      ${productBadges(product)}
      <div class="carousel-info"><div><h3>${product.name}</h3><p>Yangi kolleksiya</p></div><p class="carousel-price">${formatPrice(product.price)}</p></div>
    </article>
  `).join('') : [1, 2, 3].map((number) => `<div class="photo-placeholder">Photo ${number}</div>`).join('');

  track.innerHTML = cards;
  controls.classList.remove('hidden');
  dots.innerHTML = visibleProducts.map((_, index) => `<button class="carousel-dot top-dot ${index === topCarouselSlide ? 'active' : ''}" data-slide="${index}" aria-label="Yangi mahsulot ${index + 1}"></button>`).join('');
  document.querySelectorAll('.top-dot').forEach((dot) => dot.addEventListener('click', () => {
    topCarouselSlide = Number(dot.dataset.slide);
    moveTopCarousel();
    restartTopCarousel();
  }));
  bindProductCards();
  moveTopCarousel();
  restartTopCarousel();
}

function moveTopCarousel() {
  const track = document.querySelector('#top-carousel-track');
  const visibleProducts = getVisibleProducts();
  if (!track || visibleProducts.length === 0) return;
  const cardsVisible = window.innerWidth <= 760 ? 1.22 : 3;
  const maximum = Math.max(0, visibleProducts.length - Math.floor(cardsVisible));
  topCarouselSlide = Math.min(topCarouselSlide, maximum);
  const gapPercent = 18 / track.parentElement.clientWidth * 100;
  track.style.transform = `translateX(-${topCarouselSlide * (100 / cardsVisible + gapPercent)}%)`;
  document.querySelectorAll('.top-dot').forEach((dot, index) => dot.classList.toggle('active', index === topCarouselSlide));
}

function changeTopSlide(direction) {
  const maximum = Math.max(0, getVisibleProducts().length - (window.innerWidth <= 760 ? 1 : 3));
  topCarouselSlide = topCarouselSlide + direction > maximum ? 0 : topCarouselSlide + direction < 0 ? maximum : topCarouselSlide + direction;
  moveTopCarousel();
  restartTopCarousel();
}

function restartTopCarousel() {
  clearInterval(topCarouselTimer);
  if (getVisibleProducts().length > 0) topCarouselTimer = setInterval(() => changeTopSlide(1), 4000);
}

function getSaleProducts() {
  return getVisibleProducts().filter((product) => Number(product.discount) > 0);
}

function renderSaleCarousel() {
  const saleProducts = getSaleProducts();
  const track = document.querySelector('#sale-carousel-track');
  const dots = document.querySelector('#sale-carousel-dots');
  const controls = document.querySelector('#sale-carousel-controls');
  const cards = saleProducts.length > 0 ? saleProducts.map((product) => `
    <article class="carousel-card sale-card product-card" ${productCardAttributes(product)}>
      <img class="carousel-image" src="${product.carouselImage || product.image}" alt="${product.name}">
      ${favoriteMarkup(product)}
      ${productBadges(product)}
      <div class="carousel-info"><div><h3>${product.name}</h3><p class="sale-badge">-${product.discount}%</p></div><div><p class="old-price">${formatPrice(product.price)}</p><p class="carousel-price">${formatPrice(getDiscountedPrice(product))}</p></div></div>
    </article>
  `).join('') : '<div class="sale-empty">Hozircha aksiya mahsulotlari yo\'q.</div>';

  track.innerHTML = cards;
  controls.classList.remove('hidden');
  dots.innerHTML = saleProducts.map((_, index) => `<button class="carousel-dot sale-dot ${index === saleCarouselSlide ? 'active' : ''}" data-slide="${index}" aria-label="Aksiya mahsuloti ${index + 1}"></button>`).join('');
  document.querySelectorAll('.sale-dot').forEach((dot) => dot.addEventListener('click', () => {
    saleCarouselSlide = Number(dot.dataset.slide);
    moveSaleCarousel();
    restartSaleCarousel();
  }));
  bindProductCards();
  moveSaleCarousel();
  restartSaleCarousel();
}

function moveSaleCarousel() {
  const track = document.querySelector('#sale-carousel-track');
  const saleProducts = getSaleProducts();
  if (!track || saleProducts.length === 0) return;
  const cardsVisible = window.innerWidth <= 760 ? 1.22 : 3;
  const maximum = Math.max(0, saleProducts.length - Math.floor(cardsVisible));
  saleCarouselSlide = Math.min(saleCarouselSlide, maximum);
  const gapPercent = 18 / track.parentElement.clientWidth * 100;
  track.style.transform = `translateX(-${saleCarouselSlide * (100 / cardsVisible + gapPercent)}%)`;
  document.querySelectorAll('.sale-dot').forEach((dot, index) => dot.classList.toggle('active', index === saleCarouselSlide));
}

function changeSaleSlide(direction) {
  const saleProducts = getSaleProducts();
  const maximum = Math.max(0, saleProducts.length - (window.innerWidth <= 760 ? 1 : 3));
  saleCarouselSlide = saleCarouselSlide + direction > maximum ? 0 : saleCarouselSlide + direction < 0 ? maximum : saleCarouselSlide + direction;
  moveSaleCarousel();
  restartSaleCarousel();
}

function restartSaleCarousel() {
  clearInterval(saleCarouselTimer);
  if (getSaleProducts().length > 0) saleCarouselTimer = setInterval(() => changeSaleSlide(1), 4000);
}

function renderClothingCarousel() {
  const clothingProducts = getProducts('kiyimlar');
  const track = document.querySelector('#clothing-carousel-track');
  const dots = document.querySelector('#clothing-carousel-dots');
  const cards = clothingProducts.length > 0 ? clothingProducts.map((product) => `
    <article class="carousel-card product-card" ${productCardAttributes(product)}>
      <img class="carousel-image" src="${product.carouselImage || product.image}" alt="${product.name}">
      ${productBadges(product)}
      <div class="carousel-info"><div><h3>${product.name}</h3><p>Kiyimlar kolleksiyasi</p></div><p class="carousel-price">${formatPrice(getDiscountedPrice(product))}</p></div>
    </article>
  `).join('') : '<div class="sale-empty">Hozircha kiyimlar qo\'shilmagan.</div>';
  track.innerHTML = cards;
  dots.innerHTML = clothingProducts.map((_, index) => `<button class="carousel-dot clothing-dot ${index === clothingCarouselSlide ? 'active' : ''}" data-slide="${index}" aria-label="Kiyim ${index + 1}"></button>`).join('');
  document.querySelectorAll('.clothing-dot').forEach((dot) => dot.addEventListener('click', () => {
    clothingCarouselSlide = Number(dot.dataset.slide);
    moveClothingCarousel();
    restartClothingCarousel();
  }));
  bindProductCards();
  moveClothingCarousel();
  restartClothingCarousel();
}

function moveClothingCarousel() {
  const track = document.querySelector('#clothing-carousel-track');
  const clothingProducts = getProducts('kiyimlar');
  if (!track || clothingProducts.length === 0) return;
  const cardsVisible = window.innerWidth <= 760 ? 1.22 : 3;
  const maximum = Math.max(0, clothingProducts.length - Math.floor(cardsVisible));
  clothingCarouselSlide = Math.min(clothingCarouselSlide, maximum);
  const gapPercent = 18 / track.parentElement.clientWidth * 100;
  track.style.transform = `translateX(-${clothingCarouselSlide * (100 / cardsVisible + gapPercent)}%)`;
  document.querySelectorAll('.clothing-dot').forEach((dot, index) => dot.classList.toggle('active', index === clothingCarouselSlide));
}

function changeClothingSlide(direction) {
  const maximum = Math.max(0, getProducts('kiyimlar').length - (window.innerWidth <= 760 ? 1 : 3));
  clothingCarouselSlide = clothingCarouselSlide + direction > maximum ? 0 : clothingCarouselSlide + direction < 0 ? maximum : clothingCarouselSlide + direction;
  moveClothingCarousel();
  restartClothingCarousel();
}

function restartClothingCarousel() {
  clearInterval(clothingCarouselTimer);
  if (getProducts('kiyimlar').length > 0) clothingCarouselTimer = setInterval(() => changeClothingSlide(1), 4000);
}

function renderCategory(category) {
  const categoryProducts = getProducts(category.id);
  const currentSlide = carouselState[category.id] || 0;
  const cards = Array.from({ length: 6 }, (_, index) => {
    const product = categoryProducts[index];
    if (!product) return `<div class="photo-placeholder">Photo ${index + 1}</div>`;
    return `
      <article class="carousel-card product-card" ${productCardAttributes(product)}>
        <img class="carousel-image" src="${product.carouselImage || product.image}" alt="${product.name}">
        ${favoriteMarkup(product)}
        ${productBadges(product)}
        <div class="carousel-info">
          <div><h3>${product.name}</h3><p>Yangi kolleksiya</p></div>
          <p class="carousel-price">${formatPrice(product.price)}</p>
        </div>
      </article>
    `;
  }).join('');

  const controls = `
    <div class="carousel-controls">
      <button class="circle-button previous-button" data-category="${category.id}" aria-label="Oldingi ${category.title}">←</button>
      <button class="circle-button next-button" data-category="${category.id}" aria-label="Keyingi ${category.title}">→</button>
    </div>
  `;

  return `
    <section class="category-section">
      <div class="category-heading"><button class="category-title category-link" type="button" data-category="${category.id}">${category.title}</button>${controls}</div>
      <div class="carousel-window"><div class="carousel-track" id="track-${category.id}">${cards}</div></div>
      <div class="carousel-dots" id="dots-${category.id}"></div>
    </section>
  `;
}

function renderCarousels() {
  topCarouselSlide = 0;
  saleCarouselSlide = 0;
  clothingCarouselSlide = 0;
  renderTopCarousel();
  renderSaleCarousel();
  renderClothingCarousel();
  const visibleCategories = activeCategory === 'all'
    ? categories
    : categories.filter((category) => category.id === activeCategory);
  document.querySelector('#category-carousels').innerHTML = visibleCategories.map(renderCategory).join('');

  visibleCategories.forEach((category) => {
    const categoryProducts = getProducts(category.id);
    const dots = document.querySelector(`#dots-${category.id}`);
    dots.innerHTML = Array.from({ length: 6 }, (_, index) => `
      <button class="carousel-dot ${index === (carouselState[category.id] || 0) ? 'active' : ''}" data-category="${category.id}" data-slide="${index}" aria-label="${category.title} photo ${index + 1}"></button>
    `).join('');

    document.querySelectorAll(`.carousel-dot[data-category="${category.id}"]`).forEach((dot) => {
      dot.addEventListener('click', () => {
        carouselState[category.id] = Number(dot.dataset.slide);
        moveCarousel(category.id);
        restartCarousel(category.id);
      });
    });

    document.querySelector(`.previous-button[data-category="${category.id}"]`)?.addEventListener('click', () => changeSlide(category.id, -1));
    document.querySelector(`.next-button[data-category="${category.id}"]`)?.addEventListener('click', () => changeSlide(category.id, 1));
    document.querySelector(`.category-link[data-category="${category.id}"]`)?.addEventListener('click', () => {
      window.open(`${window.location.pathname}?category=${category.id}`, '_blank');
    });
    moveCarousel(category.id);
    restartCarousel(category.id);
  });
  bindProductCards();
}

function renderBagStore() {
  const storeCategory = categories.find((category) => category.id === requestedCategory);
  const categoryProducts = products.filter((product) => product.category === requestedCategory);
  const bagPage = document.querySelector('#bag-store-page');
  const mainContent = document.querySelector('main');
  if (!storeCategory) return;

  mainContent.classList.add('hidden');
  bagPage.classList.remove('hidden');
  const firstCategoryImage = requestedCategory === 'romollar'
    ? null
    : categoryProducts[0]?.image || categoryBackgrounds[requestedCategory];
  if (firstCategoryImage) {
    bagPage.style.setProperty('--bag-background', `url("${firstCategoryImage}")`);
  } else {
    bagPage.style.removeProperty('--bag-background');
  }
  document.querySelector('#store-category-title').textContent = storeCategory.title;
  document.querySelector('#store-category-description').textContent = `Har kuni uchun tanlangan ${storeCategory.title.toLowerCase()}.`;
  document.querySelector('#store-products-title').textContent = `Barcha ${storeCategory.title.toLowerCase()}`;

  const carouselTrack = document.querySelector('#bag-carousel-track');
  carouselTrack.innerHTML = categoryProducts.length > 0
    ? categoryProducts.map((product) => `
      <article class="bag-feature-card product-card" ${productCardAttributes(product)}>
        <img src="${product.image}" alt="${product.name}">
        ${favoriteMarkup(product)}
        ${productBadges(product)}
        <div><h3>${product.name}</h3><p>${formatPrice(product.price)}</p></div>
      </article>
    `).join('')
    : '<p class="bag-empty">Hozircha sumkalar qo\'shilmagan.</p>';

  document.querySelector('#bag-carousel-dots').innerHTML = categoryProducts.map((_, index) => `
    <button class="bag-dot ${index === 0 ? 'active' : ''}" data-bag-slide="${index}" aria-label="${storeCategory.title} ${index + 1}"></button>
  `).join('');
  document.querySelectorAll('.bag-dot').forEach((dot) => dot.addEventListener('click', () => {
    carouselTrack.style.transform = `translateX(-${Number(dot.dataset.bagSlide) * 100}%)`;
    document.querySelectorAll('.bag-dot').forEach((item) => item.classList.remove('active'));
    dot.classList.add('active');
  }));

  document.querySelector('#bag-product-count').textContent = `${categoryProducts.length} ta mahsulot`;
  document.querySelector('#bag-product-grid').innerHTML = categoryProducts.length > 0
    ? categoryProducts.map((product) => `
      <article class="bag-product-card product-card" ${productCardAttributes(product)}>
        <img src="${product.image}" alt="${product.name}">
        ${favoriteMarkup(product)}
        ${productBadges(product)}
        <div class="bag-product-details"><h3>${product.name}</h3><p>${formatPrice(product.price)}</p></div>
      </article>
    `).join('')
    : `<p class="bag-empty">${storeCategory.title} ro\'yxati bo\'sh.</p>`;
  bindProductCards();
}

function renderAdminWindow() {
  if (!isAdminWindow) return;
  document.querySelector('#new-arrivals').classList.add('hidden');
  document.querySelector('#about').classList.add('hidden');
  adminPanel.classList.remove('hidden');
  document.body.classList.add('admin-window');
  renderAdminProducts();
  renderAdminOrders();
  renderAdminStats();
}

function moveCarousel(categoryId) {
  const track = document.querySelector(`#track-${categoryId}`);
  if (!track || getProducts(categoryId).length === 0) return;

  const cardsVisible = window.innerWidth <= 760 ? 1.22 : 3;
  const maxSlide = Math.max(0, 6 - Math.floor(cardsVisible));
  carouselState[categoryId] = Math.min(carouselState[categoryId] || 0, maxSlide);
  const gapPercent = 18 / track.parentElement.clientWidth * 100;
  track.style.transform = `translateX(-${carouselState[categoryId] * (100 / cardsVisible + gapPercent)}%)`;
  document.querySelectorAll(`.carousel-dot[data-category="${categoryId}"]`).forEach((dot, index) => {
    dot.classList.toggle('active', index === carouselState[categoryId]);
  });
}

function changeSlide(categoryId, direction) {
  const maximum = Math.max(0, 6 - (window.innerWidth <= 760 ? 1 : 3));
  const current = carouselState[categoryId] || 0;
  carouselState[categoryId] = current + direction > maximum ? 0 : current + direction < 0 ? maximum : current + direction;
  moveCarousel(categoryId);
  restartCarousel(categoryId);
}

function restartCarousel(categoryId) {
  clearInterval(carouselTimers[categoryId]);
  if (getProducts(categoryId).length > 0) {
    carouselTimers[categoryId] = setInterval(() => changeSlide(categoryId, 1), 4000);
  }
}

function formatAdminProduct(product, index) {
  const visibilityClass = product.visible ? '' : 'admin-product-hidden';
  const visibilityLabel = product.visible ? 'Yashirish' : 'Korsatish';
  return [
    '<article class="admin-product ', visibilityClass, '">',
    '<img src="', product.image, '" alt="', product.name, '">',
    '<p>', product.name, '<br>', product.category, '<br>', formatPrice(product.price), '<br>', product.quantity, ' ta mavjud</p>',
    '<div class="admin-product-actions"><button class="edit-button" data-index="', index, '">Tahrirlash</button>',
    '<button class="visibility-button" data-index="', index, '">', visibilityLabel, '</button>',
    '<button class="delete-button" data-index="', index, '">Ochir</button></div></article>'
  ].join('');
}

function renderAdminProducts() {
  document.querySelector('#admin-products').innerHTML = products.length > 0
    ? products.map(formatAdminProduct).join('')
    : '<p class="empty-admin">Hali mahsulot qo\'shilmagan.</p>';
  document.querySelectorAll('.delete-button').forEach((button) => {
    button.addEventListener('click', () => {
      products.splice(Number(button.dataset.index), 1);
      localStorage.setItem('eminamavi-products', JSON.stringify(products));
      renderCarousels();
      renderAdminProducts();
      renderAdminStats();
    });
  });
  document.querySelectorAll('.visibility-button').forEach((button) => button.addEventListener('click', () => {
    products[Number(button.dataset.index)].visible = !products[Number(button.dataset.index)].visible;
    localStorage.setItem('eminamavi-products', JSON.stringify(products));
    renderCarousels();
    renderAdminProducts();
    renderAdminStats();
  }));
  document.querySelectorAll('.edit-button').forEach((button) => button.addEventListener('click', () => {
    const product = products[Number(button.dataset.index)];
    editingProductId = product.id;
    document.querySelector('#product-category').value = product.category;
    document.querySelector('#product-name').value = product.name;
    document.querySelector('#product-price').value = product.price;
    document.querySelector('#product-price-currency').value = 'uzs';
    document.querySelector('#product-quantity').value = product.quantity;
    document.querySelector('#product-discount').value = product.discount;
    document.querySelector('#product-top').checked = product.top;
    document.querySelector('#product-material').value = product.material;
    document.querySelector('#product-description').value = product.description;
    document.querySelector('#product-image').value = product.image.startsWith('data:') ? '' : product.image;
    document.querySelector('#product-carousel-image').value = product.carouselImage || '';
    document.querySelector('#product-gallery-images').value = (product.galleryImages || []).filter((image) => !image.startsWith('data:')).join('\n');
    document.querySelector('#product-form button[type="submit"]').textContent = 'Saqlash';
    document.querySelector('#product-form').scrollIntoView({ behavior: 'smooth' });
  }));
}

function renderAdminStats() {
  const orders = JSON.parse(localStorage.getItem('eminamavi-orders') || '[]');
  document.querySelector('#stat-products').textContent = products.length;
  document.querySelector('#stat-orders').textContent = orders.length;
  document.querySelector('#stat-sales').textContent = products.filter((product) => product.discount > 0).length;
  document.querySelector('#stat-hidden').textContent = products.filter((product) => !product.visible).length;
}

function renderAdminOrders() {
  const orders = JSON.parse(localStorage.getItem('eminamavi-orders') || '[]');
  const container = document.querySelector('#admin-orders');
  if (!container) return;
  container.innerHTML = orders.length > 0 ? orders.map((order) => {
    const orderDetails = '<p><strong>' + order.product + '</strong><br>' + order.quantity + ' ta, ' + order.color + ', ' + order.size + '</p>';
    const statusOptions = '<option ' + (order.status === 'Yangi' ? 'selected' : '') + '>Yangi</option><option ' + (order.status === 'Tayyorlanmoqda' ? 'selected' : '') + '>Tayyorlanmoqda</option><option ' + (order.status === 'Yuborildi' ? 'selected' : '') + '>Yuborildi</option>';
    return '<article class="admin-order">' + orderDetails + '<select class="order-status" data-order-id="' + order.id + '">' + statusOptions + '</select></article>';
  }).join('') : '<p class="empty-admin">Hali buyurtma yo\'q.</p>';
  document.querySelectorAll('.order-status').forEach((select) => select.addEventListener('change', () => {
    const updatedOrders = JSON.parse(localStorage.getItem('eminamavi-orders') || '[]');
    const order = updatedOrders.find((item) => String(item.id) === select.dataset.orderId);
    if (order) order.status = select.value;
    localStorage.setItem('eminamavi-orders', JSON.stringify(updatedOrders));
  }));
}

function openModal(modal) { modal.classList.remove('hidden'); }
function closeModal(modal) { modal.classList.add('hidden'); }

function updateUserProfile() {
  const profile = JSON.parse(localStorage.getItem('eminamavi-user'));
  document.querySelector('#auth-button').classList.toggle('hidden', Boolean(profile));
  document.querySelector('#profile-button').classList.toggle('hidden', !profile);
  if (profile) {
    document.querySelector('#user-avatar').textContent = profile.email.charAt(0).toUpperCase();
    document.querySelector('#profile-email').textContent = profile.email;
  }
}

document.querySelector('#auth-button').addEventListener('click', () => {
  authForm.reset();
  authMessage.textContent = '';
  openModal(authModal);
  authEmail.focus();
});
document.querySelector('#profile-button').addEventListener('click', () => openModal(profileModal));
document.querySelector('#favorites-button').addEventListener('click', () => {
  renderFavorites();
  openModal(favoritesModal);
});
document.querySelector('#close-auth').addEventListener('click', () => closeModal(authModal));
document.querySelector('#close-profile').addEventListener('click', () => closeModal(profileModal));
document.querySelector('#close-favorites').addEventListener('click', () => closeModal(favoritesModal));
document.querySelector('#user-logout').addEventListener('click', () => {
  localStorage.removeItem('eminamavi-user');
  updateUserProfile();
  closeModal(profileModal);
});
document.querySelector('#admin-logout').addEventListener('click', () => {
  if (isAdminWindow) {
    window.close();
    return;
  }
  adminPanel.classList.add('hidden');
});

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const email = authEmail.value.trim();
  if (email === ADMIN_EMAIL) {
    if (authPassword.value !== ADMIN_PASSWORD) {
      authMessage.textContent = 'Admin email yoki parol noto\'g\'ri.';
      return;
    }
    closeModal(authModal);
    const adminWindow = window.open(`${window.location.pathname}?admin=true`, 'eminamaviAdminWindow', 'width=1200,height=800,resizable=yes,scrollbars=yes');
    if (!adminWindow) {
      window.location.href = `${window.location.pathname}?admin=true`;
    }
    return;
  }
  localStorage.setItem('eminamavi-user', JSON.stringify({ email }));
  updateUserProfile();
  closeModal(authModal);
});

function readImageFile(file) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.readAsDataURL(file);
  });
}

document.querySelector('#product-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const category = document.querySelector('#product-category').value;
  const existingProduct = products.find((product) => product.id === editingProductId);
  const imageUrl = document.querySelector('#product-image').value.trim();
  const carouselImageUrl = document.querySelector('#product-carousel-image').value.trim();
  const imageFile = await readImageFile(document.querySelector('#product-image-file').files[0]);
  const carouselImageFile = await readImageFile(document.querySelector('#product-carousel-image-file').files[0]);
  const galleryFiles = await Promise.all(Array.from(document.querySelector('#product-gallery-files').files).map(readImageFile));
  const galleryUrls = document.querySelector('#product-gallery-images').value.split('\n').map((url) => url.trim()).filter(Boolean);
  const image = imageFile || imageUrl || existingProduct?.image || '';
  const enteredPrice = Number(document.querySelector('#product-price').value);
  const priceCurrency = document.querySelector('#product-price-currency').value;
  if (!image) {
    window.alert('Asosiy rasm URL manzilini yoki rasm faylini kiriting.');
    return;
  }
  const productData = {
    id: existingProduct?.id || `${category}-${Date.now()}`,
    category,
    name: document.querySelector('#product-name').value.trim(),
    price: priceCurrency === 'usd' ? enteredPrice * dollarRate : enteredPrice,
    quantity: Number(document.querySelector('#product-quantity').value),
    discount: Number(document.querySelector('#product-discount').value) || 0,
    top: document.querySelector('#product-top').checked,
    material: document.querySelector('#product-material').value.trim(),
    description: document.querySelector('#product-description').value.trim(),
    image,
    carouselImage: carouselImageFile || carouselImageUrl || existingProduct?.carouselImage || '',
    galleryImages: [...galleryFiles, ...galleryUrls].filter(Boolean).slice(0, 4),
    visible: existingProduct?.visible !== false
  };
  if (existingProduct) {
    products = products.map((product) => product.id === existingProduct.id ? productData : product);
    editingProductId = null;
    document.querySelector('#product-form button[type="submit"]').textContent = "Kiyim qo'shish";
  } else {
    products.push(productData);
  }
  localStorage.setItem('eminamavi-products', JSON.stringify(products));
  event.target.reset();
  renderCarousels();
  renderAdminProducts();
  renderAdminOrders();
  renderAdminStats();
});

window.addEventListener('resize', () => categories.forEach((category) => moveCarousel(category.id)));
window.addEventListener('resize', () => {
  moveTopCarousel();
  moveSaleCarousel();
  moveClothingCarousel();
});
document.querySelector('#category-filter').addEventListener('change', (event) => {
  activeCategory = event.target.value;
  renderCarousels();
});
document.querySelector('#sort-filter').addEventListener('change', (event) => {
  activeSort = event.target.value;
  renderCarousels();
});
document.querySelector('#currency-filter').value = currentCurrency;
document.querySelector('#currency-filter').addEventListener('change', (event) => {
  currentCurrency = event.target.value;
  localStorage.setItem('eminamavi-currency', currentCurrency);
  renderCarousels();
  renderBagStore();
});
document.querySelector('#product-search').addEventListener('input', (event) => {
  productSearch = event.target.value.trim().toLowerCase();
  renderCarousels();
});
document.querySelector('#close-product').addEventListener('click', closeProduct);
document.querySelector('#favorite-button').addEventListener('click', saveFavorite);
document.querySelector('#telegram-order-button').addEventListener('click', sendTelegramOrder);
document.querySelector('#top-previous-button').addEventListener('click', () => changeTopSlide(-1));
document.querySelector('#top-next-button').addEventListener('click', () => changeTopSlide(1));
document.querySelector('#sale-previous-button').addEventListener('click', () => changeSaleSlide(-1));
document.querySelector('#sale-next-button').addEventListener('click', () => changeSaleSlide(1));
document.querySelector('#clothing-previous-button').addEventListener('click', () => changeClothingSlide(-1));
document.querySelector('#clothing-next-button').addEventListener('click', () => changeClothingSlide(1));
renderCarousels();
renderBagStore();
renderAdminWindow();
updateUserProfile();
updateFavoritesCount();
