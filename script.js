/* ===== Data and localization: consolidated catalog / language / Spanish ===== */
const siteData=JSON.parse(document.getElementById('siteData').textContent);
const products=siteData.products;
const languageDictionary=siteData.translations.ptToEn;
const spanishDictionary=siteData.translations.enToEs;
/* Translate once per match, longest phrase first, preserving source text for language changes. */
function createTranslator(entries) {
  const dictionary = new Map(entries);
  const keys = Array.from(dictionary.keys()).filter(Boolean).sort((a, b) => b.length - a.length);
  const expression = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const isWord = character => Boolean(character && /[A-Za-zÀ-ÖØ-öø-ÿ0-9_]/.test(character));
  return function translate(value) {
    const text = String(value);
    if (dictionary.has(text)) return dictionary.get(text);
    return text.replace(expression, (match, offset) => {
      if ((isWord(match[0]) && isWord(text[offset - 1])) ||
          (isWord(match[match.length - 1]) && isWord(text[offset + match.length]))) return match;
      return dictionary.get(match);
    });
  };
}
const englishText = createTranslator(languageDictionary);
const spanishText = createTranslator(spanishDictionary);
const directSpanishText = createTranslator([...spanishDictionary, ...languageDictionary.map(([source,english]) => [source,spanishText(english)])]);

/* Personal names remain literal; only the greeting and predefined guest name translate. */
function updateGreeting() {
  const greeting = document.querySelector('.brand>span');
  if (!greeting) return;
  const name = state.name === 'Visitante' ? localizedText(state.name) : state.name;
  greeting.textContent = `${localizedText('Olá,')} ${name}! 👋`;
}

let siteLanguage='en';
try { const savedLanguage=localStorage.getItem('kfc-language');siteLanguage=siteData.settings.languages.includes(savedLanguage)?savedLanguage:siteData.settings.defaultLanguage; } catch(e) {}
const languageOriginals=new WeakMap();
function languageMenuHTML(){return '<fieldset class="language-options" aria-label="Choose language">'+[['en','EN','us','English'],['pt','PT','br','Português'],['es','ES','es','Español']].map(function(option){return '<button type="button" data-language="'+option[0]+'" aria-label="'+option[3]+'" onclick="setSiteLanguage(\''+option[0]+'\')" aria-pressed="'+(siteLanguage===option[0])+'"><img src="assets/images/icons/flag-'+option[2]+'.png" alt="" width="24" height="18"><span>'+option[1]+'</span></button>';}).join('')+'</fieldset>';}
function localizedText(text){return siteLanguage==='pt'?text:siteLanguage==='es'?directSpanishText(text):englishText(text);}
const languageObserver=new MutationObserver(function(){translatePage();});
function translatePage(){
 languageObserver.disconnect();
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 let node;while(node=walker.nextNode()){
  if(!node.parentElement || node.parentElement.closest('script,style,.language-options,textarea,input,.brand>span'))continue;
  const saved=languageOriginals.get(node);
  const original=saved&&node.nodeValue===saved.last?saved.original:node.nodeValue;
  const output=localizedText(original);
  languageOriginals.set(node,{original:original,last:output});if(node.nodeValue!==output)node.nodeValue=output;
 }
 document.querySelectorAll('[aria-label],[placeholder],[alt],[title]').forEach(function(element){
  if(element.closest('.language-options'))return;
  let saved=languageOriginals.get(element)||{};
  ['aria-label','placeholder','alt','title'].forEach(function(attr){if(!element.hasAttribute(attr))return;const current=element.getAttribute(attr),record=saved[attr];const original=record&&current===record.last?record.original:current;const output=localizedText(original);saved[attr]={original:original,last:output};if(current!==output)element.setAttribute(attr,output);});languageOriginals.set(element,saved);
 });
 document.documentElement.lang=siteLanguage==='pt'?'pt-BR':siteLanguage;document.title="KFC copy";
 document.querySelectorAll('.language-options button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.language===siteLanguage));});
 languageObserver.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','alt','title']});
}
function setSiteLanguage(language){siteLanguage=siteData.settings.languages.includes(language)?language:siteData.settings.defaultLanguage;try{localStorage.setItem('kfc-language',siteLanguage)}catch(e){}updateGreeting();translatePage();}
document.addEventListener('DOMContentLoaded',translatePage);

/* ===== Application: original events, storage and interaction flow ===== */
const categoryLabels = {
  All: "Tudo",
  Buckets: "Baldes",
  Burgers: "Burgers",
  Snacks: "Lanches",
  Sides: "Acompanhamentos",
  Drinks: "Bebidas",
  Desserts: "Sobremesas",
};
const categories = [
  "All",
  "Buckets",
  "Burgers",
  "Snacks",
  "Sides",
  "Drinks",
  "Desserts",
];
const state = {
  category: "All",
  offers: false,
  favoritesOnly: false,
  all: false,
  cart: {},
  favorites: [],
  coupon: false,
  name: "Visitante",
  fulfillment: "pickup",
  note: "",
};
const $ = (s) => document.querySelector(s),
  icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`,
  money = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);
const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
try {
  const stored = JSON.parse(localStorage.getItem("kfc-cart") || "{}");
  for (const [key, value] of Object.entries(stored))
    if (
      /^\d+(?:-large)?$/.test(key) &&
      products[parseInt(key)] &&
      Number.isInteger(value) &&
      value > 0 &&
      value <= 99
    )
      state.cart[key] = value;
  const f = JSON.parse(localStorage.getItem("kfc-favorites") || "[]");
  state.favorites = Array.isArray(f)
    ? f.filter((i) => Number.isInteger(i) && products[i])
    : [];
  state.name = (localStorage.getItem("kfc-name") || "Visitante").slice(
    0,
    30,
  );
  if (["johnny", "jhonny", "chicken lover", "fã de frango"].includes(state.name.trim().toLowerCase())) state.name = "Visitante";
} catch (e) {}
function persist() {
  try {
    localStorage.setItem("kfc-cart", JSON.stringify(state.cart));
    localStorage.setItem("kfc-favorites", JSON.stringify(state.favorites));
    localStorage.setItem("kfc-name", state.name);
  } catch (e) {}
}
function image(p) {
  const fallback = p.image.replace(".webp", ".png");
  return `<picture><source srcset="assets/images/${p.image}" type="image/webp"><img src="assets/images/${fallback}" alt="${p.name}" loading="lazy" decoding="async"></picture>`;
}
function productBadge(p) {
  return p.originalPrice > p.price
    ? `${Math.floor((1 - p.price / p.originalPrice) * 100 + 1e-7)}% DE DESCONTO`
    : p.badge;
}
function productPrice(p) {
  return `<span class="price">${p.originalPrice > p.price ? `<del class="previous-price" aria-label="Preço anterior">${money(p.originalPrice)}</del>` : ""}<span>${money(p.price)}</span></span>`;
}
function card(p, i) {
  return `<article class="product ${p.realProduct ? "real-product" : ""}" style="--delay:${(i % 3) * 45}ms">${productBadge(p) ? `<span class="badge ${p.badgeTone === "yellow" ? "yellow" : ""}">${productBadge(p)}</span>` : ""}<button class="favorite ${state.favorites.includes(i) ? "saved" : ""}" onclick="favorite(${i})" aria-label="Favoritar ${p.name}" aria-pressed="${state.favorites.includes(i)}">${icon("heart")}</button><button class="product-image ${p.duo ? "duo" : ""} ${["Drinks", "Desserts"].includes(p.category) ? "tall-product" : ""}" onclick="productDetails(${i})" aria-label="Detalhes de ${p.name}">${image(p)}${p.duo ? image(p) : ""}</button><button class="product-title" onclick="productDetails(${i})"><h2>${p.name}</h2></button><p>${p.desc}</p><div class="rating" title="Avaliações ilustrativas desta cópia">${p.rating ? icon("star") + "<span>" + p.rating + "</span>" : ""}</div><div class="product-bottom">${productPrice(p)}<button class="add" onclick="add(${i})" aria-label="Adicionar ${p.name}">${icon("plus")}</button></div></article>`;
}
function render() {
  const categoryScroll = $(".categories").scrollLeft;
  updateGreeting();
  $(".categories").innerHTML = categories
    .map(
      (c) =>
        `<button class="${c === state.category ? "active" : ""}" onclick="selectCategory('${c}')" aria-pressed="${c === state.category}"><span class="category-image"><picture><source srcset="assets/images/categories/${c.toLowerCase()}.webp" type="image/webp"><img src="assets/images/categories/${c.toLowerCase()}.png" alt="" width="76" height="76" decoding="async"></picture></span><span>${categoryLabels[c]}</span></button>`,
    )
    .join("");
  $(".categories").scrollLeft = categoryScroll;
  const catalogView = state.category !== "All" || state.offers || state.favoritesOnly || state.all;
  const result = products.map((p, i) => Object.assign({}, p, { i })).filter((p) =>
    (state.category === "All" || p.category === state.category) &&
    (!state.offers || p.offer) && (!state.favoritesOnly || state.favorites.includes(p.i))
  );
  $("#products>.products").innerHTML = (catalogView ? result : result.slice(0, 3))
    .map((p) => card(p, p.i))
    .join("");
  $(".empty").hidden = !!result.length;
  $("h1").textContent = state.favoritesOnly
    ? "Seus favoritos"
    : state.offers
      ? "Ofertas especiais"
      : state.category !== "All"
        ? categoryLabels[state.category]
        : catalogView
            ? "Cardápio"
            : "Combos populares";
  $("#viewAll").hidden = !!catalogView;
  $("#resultInfo").textContent = catalogView
    ? `${result.length} ${result.length === 1 ? "opção deliciosa" : "opções deliciosas"}`
    : "";
  $("#moreMenu").hidden = !!catalogView;
  $("#offer").hidden = !!catalogView;
  if (!catalogView)
    $("#moreMenu").innerHTML =
      `<div class="section-heading"><div><span class="eyebrow">COMPLETE SEU PEDIDO</span><h2>Um pouco mais de felicidade</h2></div><button onclick="viewMenu()">Ver todos ${icon("arrow")}</button></div><div class="products">${[3, 4, 6].map((i) => card(products[i], i)).join("")}</div>`;
  updateBag();
}
function updateBag() {
  const count = Object.values(state.cart).reduce((a, b) => a + b, 0);
  $("#count").textContent = count;
  $("#count").hidden = !count;
  $("#mobileCartCount").textContent = count;
  $("#mobileCartCount").hidden = !count;
  $(".orders").setAttribute("aria-label", `Pedidos, ${count} itens na sacola`);
  $(".bag-live").textContent = `${count} itens na sua sacola`;
}
function selectCategory(c) {
  const nextCategory = state.category === c ? "All" : c;
  Object.assign(state, {
    category: nextCategory,
    offers: false,
    favoritesOnly: false,
    all: true,
  });
  render();
  setNav("Menu");
}
let cartToastTimer;
function showCartToast() {
  const toast = $("#cartToast");
  clearTimeout(cartToastTimer);
  toast.textContent = localizedText("Pedido adicionado ao carrinho");
  toast.hidden = false;
  cartToastTimer = setTimeout(() => {
    toast.hidden = true;
    toast.textContent = "";
  }, 3000);
}
function add(i, n = 1, size = "regular") {
  if (!products[i]) return;
  const key = size === "large" ? `${i}-large` : String(i);
  const previousQuantity = state.cart[key] || 0;
  state.cart[key] = Math.min(99, (state.cart[key] || 0) + n);
  persist();
  updateBag();
  if (state.cart[key] > previousQuantity) showCartToast();
  if (
    typeof $("#count").animate === "function" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    $("#count").animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.3)" },
        { transform: "scale(1)" },
      ],
      { duration: 260 },
    );
}
function favorite(i) {
  state.favorites = state.favorites.includes(i)
    ? state.favorites.filter((x) => x !== i)
    : [...state.favorites, i];
  persist();
  render();
}
function setNav(label) {
  document.querySelectorAll(".bottom-nav button").forEach((b) => {
    const active = b.textContent.trim() === label || b.textContent.trim() === localizedText(label);
    b.classList.toggle("selected", active);
    if (active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}
function closePanel() {
  var _a2;
  const d = $("#panel");
  if (typeof d.close === "function") d.close();
  else d.removeAttribute("open");
  (_a2 = document.querySelector(".dialog-fallback-shade")) == null
    ? void 0
    : _a2.remove();
  document.body.classList.remove("panel-open");
}
function panel(title, body, type = "default") {
  document.body.dataset.panel = type;
  $("#panelTitle").textContent = title;
  $("#panelBody").innerHTML = body + (type === "menu" ? languageMenuHTML() : "");
  $("#panel").dataset.type = type;
  if (!$("#panel").open) {
    const d = $("#panel");
    if (typeof d.showModal === "function") { d.showModal(); d.focus({preventScroll:true}); }
    else {
      d.setAttribute("open", "");
      d.classList.add("fallback-dialog");
      const shade = document.createElement("div");
      shade.className = "dialog-fallback-shade";
      shade.onclick = closePanel;
      document.body.appendChild(shade);
      d.focus({preventScroll:true});
    }
  }
  document.body.classList.add("panel-open");
}
function cartPrice(key) {
  const p = products[parseInt(key)];
  return key.endsWith("-large") ? (p.largePrice || p.price + 0.8) : p.price;
}
function openCart() {
  const entries = Object.entries(state.cart),
    subtotal = entries.reduce((s, [key, n]) => s + cartPrice(key) * n, 0),
    discount = state.coupon ? subtotal * 0.1 : 0;
  const rows = entries
    .map(([key, n]) => {
      const p = products[parseInt(key)];
      return `<div class="cart-line"><img src="assets/images/${p.image}" alt="${p.name}"><div class="cart-item-info"><strong>${p.name}</strong><small>${p.realProduct ? (key.endsWith("-large") ? "Grande · " + p.desc : p.desc) : key.endsWith("-large") ? "600 ml · Grande" : p.category === "Drinks" ? "400 ml · Tradicional" : p.desc}</small><b>${money(cartPrice(key) * n)}</b></div><div class="quantity"><button onclick="change('${key}',-1)" aria-label="Remover uma unidade de ${p.name}">${icon(n === 1 ? "trash" : "minus")}</button><span>${n}</span><button onclick="change('${key}',1)" aria-label="Adicionar uma unidade de ${p.name}" ${n >= 99 ? "disabled" : ""}>${icon("plus")}</button></div></div>`;
    })
    .join("");
  panel(
    "Sua sacola",
    rows
      ? `<div class="fulfillment"><button class="${state.fulfillment === "pickup" ? "active" : ""}" onclick="setFulfillment('pickup')">${icon("store")} Retirada</button><button class="${state.fulfillment === "delivery" ? "active" : ""}" onclick="setFulfillment('delivery')">${icon("delivery")} Entrega</button></div>${rows}<form class="coupon" onsubmit="applyCoupon(event)"><label class="sr-only" for="couponCode">Cupom de desconto</label><input id="couponCode" placeholder="Cupom de desconto · use KFC10" value="${state.coupon ? "KFC10" : ""}" autocomplete="off"><button type="submit">Aplicar ${icon("arrow")}</button></form><p class="form-feedback" id="couponFeedback" role="status">${state.coupon ? "KFC10 aplicado. Aproveite 10% de desconto!" : ""}</p><div class="summary-line"><span>Subtotal</span><span>${money(subtotal)}</span></div>${state.coupon ? `<div class="summary-line discount"><span>Cupom · KFC10</span><span>−${money(discount)}</span></div>` : ""}<div class="total"><span>Total</span><span>${money(subtotal - discount)}</span></div><button class="primary" onclick="reviewOrder()">Revisar pedido ${icon("arrow")}</button><button class="continue" onclick="closePanel()">Continuar no cardápio</button>`
      : `<div class="empty-bag">${icon("bag")}<h3>Seu próximo favorito está aqui.</h3><p>Sua sacola está vazia. Que tal escolher algo de lamber os dedos?</p></div><button class="primary" onclick="closePanel();viewMenu()">Explorar o cardápio ${icon("arrow")}</button>`,
    "cart",
  );
}
function change(key, n) {
  const qty = Math.max(0, Math.min(99, (state.cart[key] || 0) + n));
  if (qty) state.cart[key] = qty;
  else delete state.cart[key];
  persist();
  updateBag();
  openCart();
}
function setFulfillment(value) {
  state.fulfillment = value;
  openCart();
}
function applyCoupon(e) {
  e.preventDefault();
  if ($("#couponCode").value.trim().toUpperCase() === "KFC10") {
    state.coupon = true;
    openCart();
  } else
    $("#couponFeedback").textContent = "Use KFC10 para ganhar 10% de desconto.";
}
function reviewOrder() {
  const total =
    Object.entries(state.cart).reduce((s, [k, n]) => s + cartPrice(k) * n, 0) *
    (state.coupon ? 0.9 : 1);
  panel(
    "Revise seu pedido",
    `<div class="review-icon">${icon("bag")}</div><h3>Tudo pronto para dar água na boca.</h3><p>${Object.values(state.cart).reduce((a, b) => a + b, 0)} itens · ${state.fulfillment === "pickup" ? "Retirada" : "Entrega"}</p><div class="total"><span>Total do pedido</span><span>${money(total)}</span></div><label class="field-label" for="orderNote">Quer acrescentar alguma observação?</label><textarea id="orderNote" maxlength="200" placeholder="Escreva uma observação para o pedido" oninput="state.note=this.value">${escapeHtml(state.note)}</textarea><p class="demo-note">Finalização demonstrativa. Nenhum pedido real ou pagamento será enviado.</p><button class="primary" onclick="openCart()">Voltar à sacola ${icon("arrow")}</button>`,
    "review",
  );
}
let detailProductId = 0;
function productDetails(i) {
  detailProductId = i;
  const p = products[i];
  panel(
    p.name,
    `<div class="detail-image ${p.realProduct ? "real-product-image" : ""} ${p.category === "Desserts" ? "detail-dessert" : ""}">${image(p)}</div><span class="eyebrow">${categoryLabels[p.category]}${productBadge(p) ? " · " + productBadge(p) : ""}</span><p class="detail-copy">${p.detail}</p>${p.offer ? `<div class="detail-price">${productPrice(p)}</div>` : ""}${p.rating ? `<div class="detail-rating" title="Avaliações ilustrativas desta cópia">${icon("star")} ${p.rating}</div>` : ""}${p.sizes ? `<fieldset class="sizes"><legend>Escolha o tamanho</legend><label><input type="radio" name="size" value="regular" checked>${p.regularLabel || "Tradicional"} <span>${p.realProduct ? money(p.price) : "400 ml"}</span></label><label><input type="radio" name="size" value="large">${p.largeLabel || "Grande"} <span>${p.realProduct ? money(p.largePrice) : "600 ml · +" + money(0.8)}</span></label></fieldset>` : ""}<div class="detail-quantity"><label for="detailQty">Quantidade</label><div class="quantity"><button onclick="detailQuantidade(-1)" aria-label="Diminuir quantidade">${icon("minus")}</button><input id="detailQty" aria-label="Quantidade do produto" type="number" min="1" max="20" value="1" oninput="updateDetailTotal()"><button onclick="detailQuantidade(1)" aria-label="Aumentar quantidade">${icon("plus")}</button></div></div><details><summary>Ingredientes e alérgenos ${icon("chevron")}</summary><p>${p.allergens}. As informações do cardápio são ilustrativas; confirme os ingredientes com o restaurante.</p></details><button class="primary" onclick="addDetails(${i})">${icon("plus")} Adicionar à sacola <span>${money(p.price)}</span></button>`,
    "product",
  );
  if (p.sizes)
    document
      .querySelectorAll("[name=size]")
      .forEach((r) => (r.onchange = updateDetailTotal));
}
function updateDetailTotal() {
  var _a2;
  const qty = Math.min(20, Math.max(1, parseInt($("#detailQty").value) || 1));
  const price =
    products[detailProductId].price +
    (((_a2 = $("input[name=size]:checked")) == null ? void 0 : _a2.value) ===
    "large"
      ? (products[detailProductId].largePrice || products[detailProductId].price + 0.8) - products[detailProductId].price
      : 0);
  $("#panelBody>.primary>span").textContent = money(qty * price);
}
function detailQuantidade(n) {
  $("#detailQty").value = Math.min(
    20,
    Math.max(1, (parseInt($("#detailQty").value) || 1) + n),
  );
  updateDetailTotal();
}
function addDetails(i) {
  var _a2;
  add(
    i,
    Math.min(20, Math.max(1, parseInt($("#detailQty").value) || 1)),
    ((_a2 = $("input[name=size]:checked")) == null ? void 0 : _a2.value) ||
      "regular",
  );
  closePanel();
}
function scrollMenu() {
  $("#products").scrollIntoView({ behavior: "smooth", block: "start" });
}
function viewMenu() {
  Object.assign(state, {
    category: "All",
    offers: false,
    favoritesOnly: false,
    all: true,
  });
  render();
  setNav("Menu");
  scrollMenu();
}
function showOfertas() {
  Object.assign(state, {
    category: "All",
    offers: true,
    favoritesOnly: false,
    all: true,
  });
  render();
  setNav("Ofertas");
  scrollMenu();
}
function showFavoritos() {
  Object.assign(state, {
    category: "All",
    offers: false,
    favoritesOnly: true,
    all: true,
  });
  render();
  setNav("Perfil");
  scrollMenu();
}
function home() {
  Object.assign(state, {
    category: "All",
    offers: false,
    favoritesOnly: false,
    all: false,
  });
  render();
  setNav("Início");
  scrollTo({ top: 0, behavior: "smooth" });
}
function profile() {
  panel(
    "Seu espaço no KFC",
    `<form onsubmit="savePerfil(event)"><label class="field-label" for="profileName">Como podemos chamar você?</label><input class="text-field" id="profileName" maxlength="30" value="${escapeHtml(state.name)}" required autocomplete="nickname"><button class="primary" type="submit">Salvar ${icon("check")}</button></form>`,
    "profile",
  );
}
function savePerfil(e) {
  e.preventDefault();
  state.name = $("#profileName").value.trim() || "Visitante";
  persist();
  render();
  closePanel();
}
/* Automatic five-second rotation, with manual mouse/touch swipes resetting the timer. */
let heroSlideTimer;
function scheduleHeroSlide() {
  clearTimeout(heroSlideTimer);
  if (document.hidden) return;
  heroSlideTimer = setTimeout(() => {
    if (!$("#panel").open && !heroDrag) showSlide((heroSlideIndex + 1) % 4);
    else scheduleHeroSlide();
  }, 5000);
}
document.addEventListener("visibilitychange", scheduleHeroSlide);
let heroSlideIndex = 0;
let heroSlideInitialized = false;
let heroTransitionId = 0;
async function showSlide(i) {
  clearTimeout(heroSlideTimer);
  const slides = [
    {
      title: "CROCANTE.<br>SUCULENTO.<br>IRRESISTÍVEL.",
      copy: "Frango de verdade.<br>Feito na hora. Sempre.",
      image: "products/buckets/8-pcs-chicken-bucket.webp",
      product: 0,
    },
    {
      title: "MUITO SABOR.<br>A MORDIDA<br>PERFEITA.",
      copy: "Conheça seu Zinger favorito.<br>Crocância a cada mordida.",
      image: "products/burgers/zinger-burger-combo.webp",
      product: 1,
    },
    {
      title: "PICANTE.<br>CROCANTE.<br>INCRÍVEL.",
      copy: "Uma explosão de sabor.<br>15% de desconto no combo.",
      image: "products/snacks/5-pcs-hot-crispy.webp",
      product: 2,
    },
    {
      title: "DOCE.<br>CREMOSO.<br>IMPERDÍVEL.",
      copy: "Um pequeno mimo, muita alegria.<br>Sempre cabe uma sobremesa.",
      image: "products/desserts/chocolate-sundae.webp",
      product: 3,
    },
  ];
  const s = slides[i];
  if (!s) return;
  const transitionId = ++heroTransitionId;
  const shouldAnimate = heroSlideInitialized && i !== heroSlideIndex;
  const outgoing = [...document.querySelectorAll("#heroDynamic > .hero-copy, #heroDynamic > .hero-photo")];
  outgoing.forEach((element) => {
    if (typeof element.getAnimations === "function") element.getAnimations().forEach((animation) => animation.cancel());
  });
  if (shouldAnimate) {
    const fadeOut = outgoing.filter((element) => typeof element.animate === "function").map((element) =>
      element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 180,
        easing: "ease-in",
        fill: "forwards",
      })
    );
    await Promise.allSettled(fadeOut.map((animation) => animation.finished));
    if (transitionId !== heroTransitionId) return;
  }
  heroSlideIndex = i;
  $(".hero").setAttribute("aria-label", products[s.product].name);
  $(".hero").classList.toggle("hero-dessert", s.product === 3);
  $("#heroDynamic").innerHTML =
    `<div class="hero-copy"><span>POR TEMPO LIMITADO</span><h2>${s.title}</h2><p>${s.copy}</p></div><picture class="hero-photo"><source srcset="assets/images/${s.image}" type="image/webp"><img src="assets/images/${s.image.replace(".webp", ".png")}" alt="${products[s.product].name}" fetchpriority="high" decoding="async"></picture>`;
  $(".hero-order").onclick = () => productDetails(s.product);
  if (shouldAnimate) {
    document.querySelectorAll("#heroDynamic > .hero-copy, #heroDynamic > .hero-photo").forEach((element) => {
      if (typeof element.animate === "function") {
        element.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 360,
          easing: "ease-out",
        });
      }
    });
  }
  heroSlideInitialized = true;
  scheduleHeroSlide();
}
$("#viewAll").onclick = viewMenu;
$("#profile").onclick = profile;
$("#menuButton").onclick = () =>
  panel(
    "De lamber os dedos.",
    `<div class="menu-brand"><img src="assets/images/logos/kfc.svg" alt="KFC"><span>Feito por <strong>@joaogallindodev</strong> para fins educacionais.</span></div><button class="panel-link" onclick="showCoupons()"><img class="menu-coupon-icon" src="assets/images/icons/coupon.svg" alt=""> Cupons ${icon("arrow")}</button><button class="panel-link" onclick="closePanel();showFavoritos()">${icon("heart")} Favoritos ${icon("arrow")}</button><button class="panel-link menu-profile-link" onclick="profile()">${icon("user")} Perfil ${icon("arrow")}</button>`,
    "menu",
  );
const notificationIDs = ["instagram", "friend"];
let dismissedNotifications = [];
try { dismissedNotifications = JSON.parse(localStorage.getItem("kfc-notifications-read") || "[]").filter(id => notificationIDs.includes(id)); } catch(e) {}
function updateNotifications() {
  const badge = $("#notifications b");
  const unread = notificationIDs.filter(id => !dismissedNotifications.includes(id)).length;
  badge.textContent = unread;
  badge.hidden = !unread;
}
function showNotifications() {
  const cards = {
    instagram: `<button class="notification-card instagram-card" onclick="dismissNotification('instagram')"><span class="instagram-icon"><img src="assets/images/icons/instagram.svg" alt="" width="24" height="24"></span><span><strong>Siga o KFC no Instagram</strong><small>Conheça a página @kfcbrasil e acompanhe as novidades.</small></span>${icon("arrow")}</button>`,
    friend: `<button class="notification-card friend-card" onclick="dismissNotification('friend')"><span class="friend-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M19 8v6M16 11h6"/></svg></span><span><strong>Chame um amigo</strong><small>Convide um amigo para compartilhar seus favoritos do KFC.</small></span>${icon("arrow")}</button>`
  };
  const unread = notificationIDs.filter(id => !dismissedNotifications.includes(id));
  panel("Novidades saindo da cozinha", unread.length ? unread.map(id => cards[id]).join("") : '<p class="notifications-empty">Você está em dia com as novidades.</p>', "notifications");
}
function dismissNotification(id) {
  if (!notificationIDs.includes(id)) return;
  if (!dismissedNotifications.includes(id)) dismissedNotifications.push(id);
  try { localStorage.setItem("kfc-notifications-read", JSON.stringify(dismissedNotifications)); } catch(e) {}
  updateNotifications();
  showNotifications();
}
$("#notifications").onclick = showNotifications;
updateNotifications();
const heroBanner = $(".hero");
let heroDrag = null;
let suppressHeroClick = false;
heroBanner.addEventListener("pointerdown", (e) => {
  if (!e.isPrimary || e.button !== 0 || $("#panel").open) return;
  suppressHeroClick = false;
  clearTimeout(heroSlideTimer);
  heroDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, horizontal: false };
});
heroBanner.addEventListener("pointermove", (e) => {
  if (!heroDrag || e.pointerId !== heroDrag.id) return;
  const dx = e.clientX - heroDrag.x;
  const dy = e.clientY - heroDrag.y;
  if (!heroDrag.horizontal) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { heroDrag = null; scheduleHeroSlide(); return; }
    if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return;
    heroDrag.horizontal = true;
    heroBanner.setPointerCapture(e.pointerId);
    heroBanner.classList.add("is-dragging");
  }
  e.preventDefault();
});
function finishHeroDrag(e) {
  if (!heroDrag || e.pointerId !== heroDrag.id) return;
  const drag = heroDrag;
  heroDrag = null;
  heroBanner.classList.remove("is-dragging");
  if (heroBanner.hasPointerCapture(e.pointerId)) heroBanner.releasePointerCapture(e.pointerId);
  suppressHeroClick = drag.horizontal;
  scheduleHeroSlide();
  if (e.type === "pointerup" && drag.horizontal && Math.abs(e.clientX - drag.x) >= 40) {
    showSlide((heroSlideIndex + (e.clientX < drag.x ? 1 : 3)) % 4);
  }
}
heroBanner.addEventListener("pointerup", finishHeroDrag);
heroBanner.addEventListener("pointercancel", finishHeroDrag);
heroBanner.addEventListener("lostpointercapture", finishHeroDrag);
heroBanner.addEventListener("click", (e) => {
  if (!suppressHeroClick) return;
  suppressHeroClick = false;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);
$("#panel").addEventListener("close", () =>
  document.body.classList.remove("panel-open"),
);
$("#panel").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) {
    const r = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closePanel();
  }
});
render();
showSlide(0);
if (document.modelContext && document.modelContext.registerTool)
  try {
    document.modelContext.registerTool({
      name: "read_menu",
      description:
        "Consultar os produtos disponíveis neste cardápio ilustrativo do KFC.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => ({ products }),
    });
  } catch (e) {}
document.addEventListener("keydown", function (e) {
  const d = $("#panel");
  if (!d.open || typeof d.showModal === "function") return;
  if (e.key === "Escape") closePanel();
  if (e.key === "Tab") {
    const f = Array.from(
      d.querySelectorAll("button,input,select,textarea,a[href]"),
    );
    const a = f[0],
      b = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) {
      e.preventDefault();
      b.focus();
    } else if (!e.shiftKey && document.activeElement === b) {
      e.preventDefault();
      a.focus();
    }
  }
});

// Match menu anchor spacing to the actual header in every language and viewport.
const navigationHeader = document.querySelector(".app > header");
function updateNavigationOffset() {
  if (!navigationHeader) return;
  document.documentElement.style.setProperty(
    "--navigation-offset",
    Math.ceil(navigationHeader.getBoundingClientRect().height) + 16 + "px"
  );
}
updateNavigationOffset();
window.addEventListener("resize", updateNavigationOffset, { passive: true });
if (navigationHeader && typeof ResizeObserver === "function") {
  new ResizeObserver(updateNavigationOffset).observe(navigationHeader);
}
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(updateNavigationOffset);
}

// Native touch scrolling, with mouse dragging for narrow desktop windows too.
const categoryStrip = document.querySelector(".categories");
let categoryDrag = null;
let suppressCategoryClick = false;
categoryStrip.addEventListener("pointerdown", function (e) {
  suppressCategoryClick = false;
  if (e.pointerType !== "mouse" || e.button !== 0 || categoryStrip.scrollWidth <= categoryStrip.clientWidth) return;
  categoryDrag = { id: e.pointerId, x: e.clientX, left: categoryStrip.scrollLeft, moved: false };
});
categoryStrip.addEventListener("pointermove", function (e) {
  if (!categoryDrag || e.pointerId !== categoryDrag.id) return;
  const distance = e.clientX - categoryDrag.x;
  if (!categoryDrag.moved && Math.abs(distance) < 6) return;
  if (!categoryDrag.moved) {
    categoryDrag.moved = true;
    categoryStrip.setPointerCapture(e.pointerId);
    categoryStrip.classList.add("is-dragging");
  }
  e.preventDefault();
  categoryStrip.scrollLeft = categoryDrag.left - distance;
});
function finishCategoryDrag(e) {
  if (!categoryDrag || e.pointerId !== categoryDrag.id) return;
  suppressCategoryClick = categoryDrag.moved && e.type === "pointerup";
  categoryDrag = null;
  categoryStrip.classList.remove("is-dragging");
}
categoryStrip.addEventListener("pointerup", finishCategoryDrag);
categoryStrip.addEventListener("pointercancel", finishCategoryDrag);
categoryStrip.addEventListener("lostpointercapture", finishCategoryDrag);
categoryStrip.addEventListener("click", function (e) {
  if (!suppressCategoryClick) return;
  suppressCategoryClick = false;
  e.preventDefault();
  e.stopImmediatePropagation();
}, true);

function showCoupons() {
  panel("Cupons", `<div class="coupon-card"><img class="menu-coupon-icon" src="assets/images/icons/coupon.svg" alt=""><h3>KFC10</h3><p>10% de desconto no seu pedido.</p><button class="primary" onclick="useMenuCoupon()">Usar cupom</button></div>`, "coupons");
}
function useMenuCoupon() {
  state.coupon = true;
  openCart();
}
