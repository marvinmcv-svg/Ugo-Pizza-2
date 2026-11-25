/* Ugo's Pizza — ALL site content + catalog().
 * Shared by the website (window.UGOS) and the assistant's tools (module.exports).
 * Every fact has its source next to it. Nothing here is invented: if it isn't public, it isn't here
 * (see README "Needs owner input").
 *
 * Sources
 *   MENU   = https://www.ugospizzas.com/menu/                     (names, ingredients, prices)
 *   HOME   = https://ugospizzas.com/  "#NUESTRAS PROMOS" images   (combos, 2026/08 uploads)
 *   UBIC   = https://ugospizzas.com/ubicaciones/                 (branches, hours, WhatsApp, maps)
 *   IG     = https://www.instagram.com/ugos_pizza/               (bio, captions)
 */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.UGOS = data;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const UGOS = {
    config: {
      name: "Ugo's Pizza",
      slogan: "Sólo para hermosos",                       // IG bio "Ugo's Pizza sólo para hermosos🍕😎"
      city: "Santa Cruz de la Sierra",                    // UBIC: anillos / Radial 27 / Plan 3000 are Santa Cruz zones; HOME "la ciudad de los anillos"
      country: "Bolivia",
      callCenter: "59160007071",                          // HOME wa.me/59160007071 + IG captions "Haz tu pedido al WhatsApp"
      instagram: "https://www.instagram.com/ugos_pizza/",
      tiktok: "https://www.tiktok.com/@ugospizza",         // HOME "Síguenos en nuestras redes sociales"
      facebook: "https://www.facebook.com/PizzaUgos",       // HOME "Síguenos en nuestras redes sociales"
      website: "https://www.ugospizzas.com/",
      franchises: "https://ugospizzas.com/franquicias/",  // HOME "¿Querés tu propia sucursal?"
      timezone: "America/La_Paz",
      locale: "es-BO",
      currency: "Bs",
    },

    // MENU: every pizza starts with "Masa madre, salsa de tomate a la leña, mozzarella"
    base: "masa madre, salsa de tomate a la leña y mozzarella",
    // HOME combo images: "8 PORCIONES · TAMAÑO FAMILIAR"; IG DeH85kkIJpI "Tamaño Familiar". Menu prices = Familiar.
    sizes: { familiar: "Familiar · 8 porciones" },

    // MENU (ugospizzas.com/menu). Grouping into tabs is ours (presentation only); names, desc, prices are theirs.
    menu: [
      { id: "clasicas", name: "Clásicas", size: "familiar", items: [
        { id: "jamoneitor", name: "Jamoneitor", price: 47, img: "assets/img/pizza-jamoneitor.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella y jamón." },
        { id: "napolitana", name: "Napolitana", price: 44, img: "assets/img/pizza-napolitana.webp", desc: "Masa madre, salsa de tomate a la leña, tomate, mozzarella y orégano.", veg: true },
        { id: "margarita", name: "Margarita", price: 44, img: "assets/img/pizza-margarita.webp", desc: "Masa madre, salsa de tomate a la leña, tomate, mozzarella y albahaca fresca.", veg: true },
        { id: "salchichona", name: "Salchichona", price: 47, img: "assets/img/pizza-salchichona.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella y salchicha picada." },
        { id: "chocluda", name: "Chocluda", price: 49, img: "assets/img/pizza-chocluda.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella y choclo.", veg: true },
        { id: "brocoli-bacon", name: "Brócoli Bacon", price: 48, img: "assets/img/pizza-brocoli-bacon.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, tocino, brócoli, orégano y queso catupiry." },
      ] },
      { id: "especiales", name: "Especiales", size: "familiar", items: [
        { id: "bruto-tocino", name: "Bruto Tocino", price: 52, img: "assets/img/pizza-bruto-tocino.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, tocino, queso cheddar y orégano." },
        { id: "salame", name: "Salame", price: 52, img: "assets/img/pizza-salame.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, salame y orégano." },
        { id: "americana", name: "Americana", price: 52, img: "assets/img/pizza-americana.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, jamón, choclo y orégano." },
        { id: "hawaiana", name: "Hawaiana", price: 54, img: "assets/img/pizza-hawaiana.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, piña, jamón y orégano." },
        { id: "champinon", name: "Champiñón", price: 58, img: "assets/img/pizza-champinon.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, champiñones y jamón." },
        // IG Df98OMcuhXH: "la pizza más vendida de Ugo's: LA CHEESEBURGUER"
        { id: "cheeseburguer", name: "Cheeseburguer", price: 58, img: "assets/img/pizza-cheeseburguer.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, carne molida, tocino, queso cheddar y orégano.", star: true },
        { id: "pollo-requeson", name: "Pollo Requesón", price: 58, img: "assets/img/pizza-pollo-requeson.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, pollo desmechado, queso catupiry y orégano." },
        { id: "strogonoff-carne", name: "Strogonoff de Carne", price: 58, img: "assets/img/pizza-strogonoff-carne.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, carne, crema de leche, papa frita rayada y orégano." },
        { id: "strogonoff-pollo", name: "Strogonoff de Pollo", price: 58, img: "assets/img/pizza-strogonoff-pollo.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, pollo, crema de leche, papa frita rayada y orégano." },
      ] },
      { id: "top", name: "De la casa", size: "familiar", items: [
        { id: "mexicana", name: "Mexicana", price: 60, img: "assets/img/pizza-mexicana.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, queso cheddar, jamón, nachos, jalapeños y orégano." },
        { id: "4-quesos", name: "4 Quesos", price: 60, img: "assets/img/pizza-4-quesos.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, queso cheddar, queso roquefort y queso catupiry.", veg: true },
        // MENU first item "Ugo's": borde de salchichas + volcán de cheddar
        { id: "ugos", name: "Ugo's", price: 65, img: "assets/img/pizza-ugos.webp", desc: "Masa madre, salsa de tomate a la leña, mozzarella, jamón, borde de salchichas, volcán de crema de queso cheddar y orégano.", signature: true },
      ] },
    ],

    // No prices published for extras, sauces, crusts or loose drinks → left out (README: needs owner input).
    addons: null,

    // No weekly day promos found in posts → section hidden.
    weekly: [],

    // HOME "#NUESTRAS PROMOS" (ugospizzas.com/wp-content/uploads/2026/08/Promo-*.webp). All "8 porciones · Tamaño Familiar".
    combos: [
      { id: "combo-2-jamoneitor", name: "2 Jamoneitor + Pepsi 2 L", price: 100, poster: "assets/img/promo-2-jamoneitor.webp", img: "assets/img/combo-2-jamoneitor.webp", note: "2 pizzas Jamoneitor familiares + Pepsi 2 litros", parts: ["jamoneitor", "jamoneitor"], drink: "Pepsi 2 L", star: true, tag: "Para compartir" },
      { id: "combo-2-salchichonas", name: "2 Salchichonas + Pepsi 2 L", price: 100, poster: "assets/img/promo-2-salchichonas.webp", img: "assets/img/combo-2-salchichonas.webp", note: "2 pizzas Salchichona familiares + Pepsi 2 litros", parts: ["salchichona", "salchichona"], drink: "Pepsi 2 L", tag: "Para compartir" },
      { id: "combo-jamoneitor", name: "Jamoneitor + Pepsi 2 L", price: 60, poster: "assets/img/promo-jamoneitor.webp", img: "assets/img/combo-jamoneitor.webp", note: "Pizza Jamoneitor familiar + Pepsi 2 litros", parts: ["jamoneitor"], drink: "Pepsi 2 L", tag: "Favorito" },
      { id: "combo-salchichona", name: "Salchichona + Pepsi 2 L", price: 60, poster: "assets/img/promo-salchichona.webp", img: "assets/img/combo-salchichona.webp", note: "Pizza Salchichona familiar + Pepsi 2 litros", parts: ["salchichona"], drink: "Pepsi 2 L" },
      { id: "combo-chocluda", name: "Chocluda + Guaraná 2 L", price: 60, poster: "assets/img/promo-chocluda.webp", img: "assets/img/combo-chocluda.webp", note: "Pizza Chocluda familiar + Guaraná 2 litros", parts: ["chocluda"], drink: "Guaraná 2 L" },
      { id: "combo-americana", name: "Americana + Pepsi 1 L", price: 62, poster: "assets/img/promo-americana.webp", img: "assets/img/combo-americana.webp", note: "Pizza Americana familiar + Pepsi 1 litro", parts: ["americana"], drink: "Pepsi 1 L" },
      { id: "combo-salame", name: "Salame + Pepsi 1 L", price: 62, poster: "assets/img/promo-salame.webp", img: "assets/img/combo-salame.webp", note: "Pizza Salame familiar + Pepsi 1 litro", parts: ["salame"], drink: "Pepsi 1 L" },
      { id: "combo-bruto-tocino", name: "Bruto Tocino + Pepsi 2 L", price: 65, poster: "assets/img/promo-bruto-tocino.webp", img: "assets/img/combo-bruto-tocino.webp", note: "Pizza Bruto Tocino familiar + Pepsi 2 litros", parts: ["bruto-tocino"], drink: "Pepsi 2 L" },
      { id: "combo-strogonoff-pollo", name: "Strogonoff de Pollo + Pepsi 1 L", price: 66, poster: "assets/img/promo-strogonoff-pollo.webp", img: "assets/img/combo-strogonoff-pollo.webp", note: "Pizza Strogonoff de Pollo familiar + Pepsi 1 litro", parts: ["strogonoff-pollo"], drink: "Pepsi 1 L" },
    ],

    // Monthly special. IG DfapG5MludI / DfkrFlzoHYR / DfphlqNuh8Y / Df2marUnKKC (Nov 2026):
    // "Jamoneitor a solo 35 Bs (en vez de 47) si pedís por La Scoobyneta · primeras 100 pizzas del día · todos los días de noviembre"
    yapa: {
      id: "promo-jamoneitor-35", name: "Jamoneitor Scoobyneta", ref: "jamoneitor", price: 35, regular: 47,
      from: "2026-11-01", until: "2026-11-30", channel: "scoobyneta", month: "noviembre",
      img: "assets/img/pizza-jamoneitor.webp", post: "assets/img/ig-DfapG5MludI.webp",
      source: "IG DfapG5MludI",
      note: "Sólo pidiendo por La Scoobyneta (delivery de Ugo's) · primeras 100 pizzas del día",
    },

    // IG DfapG5MludI "LLEGÓ LA SCOOBYNETA! El delivery de Ugo's" · "Llamá al 76066200" (Df98OMcuhXH "Whatsapp Scoobyneta: 760 66200")
    delivery: { id: "scoobyneta", name: "La Scoobyneta", whatsapp: "59176066200", desc: "El delivery de Ugo's" },

    // "Descubrí nuestras promos" row: current promo images only (HOME 2026/08 + IG Nov 2026)
    // Shown and opened inside this site (no links out). `add` = the catalog item the promo sells;
    // `source` = where the image was published.
    offers: [
      { img: "assets/img/ig-DfapG5MludI.webp", add: "promo-jamoneitor-35", source: "IG DfapG5MludI", alt: "Llegó La Scoobyneta: Jamoneitor a 35 Bs en noviembre" },
      { img: "assets/img/promo-2-jamoneitor.webp", add: "combo-2-jamoneitor", source: "HOME", alt: "2 Jamoneitor + Pepsi 2 L a 100 Bs" },
      { img: "assets/img/ig-Df2marUnKKC.webp", add: "promo-jamoneitor-35", source: "IG Df2marUnKKC", alt: "Por si se acaba el mundo: Jamoneitor a 35 Bs por La Scoobyneta" },
      { img: "assets/img/promo-bruto-tocino.webp", add: "combo-bruto-tocino", source: "HOME", alt: "Bruto Tocino + Pepsi 2 L a 65 Bs" },
      { img: "assets/img/promo-2-salchichonas.webp", add: "combo-2-salchichonas", source: "HOME", alt: "2 Salchichonas + Pepsi 2 L a 100 Bs" },
      { img: "assets/img/promo-jamoneitor.webp", add: "combo-jamoneitor", source: "HOME", alt: "Jamoneitor + Pepsi 2 L a 60 Bs" },
      { img: "assets/img/promo-americana.webp", add: "combo-americana", source: "HOME", alt: "Americana + Pepsi 1 L a 62 Bs" },
      { img: "assets/img/promo-salchichona.webp", add: "combo-salchichona", source: "HOME", alt: "Salchichona + Pepsi 2 L a 60 Bs" },
      { img: "assets/img/promo-chocluda.webp", add: "combo-chocluda", source: "HOME", alt: "Chocluda + Guaraná 2 L a 60 Bs" },
      { img: "assets/img/promo-salame.webp", add: "combo-salame", source: "HOME", alt: "Salame + Pepsi 1 L a 62 Bs" },
      { img: "assets/img/promo-strogonoff-pollo.webp", add: "combo-strogonoff-pollo", source: "HOME", alt: "Strogonoff de Pollo + Pepsi 1 L a 66 Bs" },
    ],

    featured: [
      { ref: "cheeseburguer", name: "Cheeseburguer", tag: "La más vendida", img: "assets/img/pizza-cheeseburguer.webp", desc: "Carne molida, tocino y cheddar. La más pedida de Ugo's." },   // IG Df98OMcuhXH
      { ref: "ugos", name: "Ugo's", tag: "La de la casa", img: "assets/img/pizza-ugos.webp", desc: "Borde de salchichas y un volcán de crema de cheddar al centro." }, // MENU
      { ref: "promo-jamoneitor-35", name: "Jamoneitor a 35", tag: "Por La Scoobyneta", img: "assets/img/pizza-jamoneitor.webp", desc: "En noviembre, pidiendo por La Scoobyneta. Primeras 100 del día." }, // IG DfapG5MludI
    ],

    // UBIC: hours as published: "Lunes a Domingo: 12:00 am a 01:00 am. Martes: 17:00 pm a 01:00 am."
    // Read as 12:00 → 01:00 (next day), Tuesday 17:00 → 01:00. Same for every branch. (Confirm with owner.)
    hours: { def: ["12:00", "01:00"], 2: ["17:00", "01:00"] },
    branches: [
      { id: "radial-27", name: "Radial 27", address: "Radial 27, 5to anillo (norte)", whatsapp: "59176066200", maps: "https://www.google.com/maps?q=-17.7375495,-63.1727192" },
      { id: "paragua", name: "Paragua", address: "Av. Cristóbal de Mendoza", whatsapp: "59175662162", maps: "https://maps.app.goo.gl/NBsJEpTYfNiuyuHTA" },
      { id: "santos-dumont", name: "Santos Dumont", address: "Av. Santos Dumont", whatsapp: "59176666551", maps: "https://maps.app.goo.gl/3o5t7nV6rM9swMi7A" },
      { id: "mechero", name: "Mechero", address: "Av. Plan 3000, calle Petrolera, al frente de la plaza El Mechero", whatsapp: "59177030613", maps: "https://maps.app.goo.gl/5whL5aBuwByRoJev5" },
      { id: "plan-3000", name: "Plan 3000", address: "Av. Paurito", whatsapp: "59175657123", maps: "https://maps.app.goo.gl/dWEtYf3qRhhrzcNe9" },
      { id: "pirai", name: "Piraí", address: "Av. Piraí entre 2do y 3er anillo", whatsapp: "59176046564", maps: "https://maps.app.goo.gl/njMqbGRan6p5CRtX9" },
      { id: "lujan", name: "Luján", address: "Av. Virgen de Luján", whatsapp: "59175150007", maps: "https://www.google.com/maps?q=-17.7440395,-63.1166574" },
      { id: "km6", name: "Doble Vía Km 6", address: "Av. Doble Vía La Guardia entre 6to y 7mo anillo", whatsapp: "59169339933", maps: "https://maps.app.goo.gl/YvFhfirK4VkvWNwX8" },
      { id: "villa", name: "Villa 1ro de Mayo", address: "Plaza principal, esquina calle 3", whatsapp: "59176000301", maps: "https://maps.app.goo.gl/7z43GE5gmibF4xeHA" },
    ],

    facts: [
      "Ugo's Pizza es una cadena de restaurantes 100% boliviana.",
      "El sabor único de Ugo's: masa madre, urucú y salsa preparada a la leña (banner 'Ingredientes' de la web oficial).",
      "Todas las pizzas son tamaño familiar de 8 porciones.",
      "La pizza más vendida de Ugo's es la Cheeseburguer (Instagram).",
      "La Scoobyneta es el delivery de Ugo's; se pide al WhatsApp 76066200.",
      "Para pedidos generales está el WhatsApp 60007071.",
      "Ugo's tiene la Caja Transformer: la caja se divide por las líneas en cuatro platos, y doblándola tenés una mini caja para llevar.",
      "Ugo's está preparando una nueva pizza 'combinación carnívora' que llegará pronto (todavía sin nombre ni precio).",
      "Ugo's está en Instagram (@ugos_pizza), TikTok (@ugospizza) y Facebook (PizzaUgos).",
      "Ugo's ofrece franquicias: se piden en la sección Franquicias de esta página (formulario que llega por WhatsApp al call center).",
      "No tenemos información publicada de alérgenos, costo de delivery ni medios de pago: eso se consulta con la sucursal.",
    ],

    story: {
      video: "assets/video/apagon",
      eyebrow: "Cadena 100% boliviana",
      title: "Pizza hecha para hermosos",
      p1: "Masa madre, urucú y salsa de tomate preparada a la leña: ese es el sabor único de Ugo's, el mejor sabor en la ciudad de los anillos.",
      p2: "Más de 20 sabores para elegir, nueve sucursales en Santa Cruz y La Scoobyneta llevándote la pizza a tu casa. Hecho en Bolivia, para clientes hermosos y precavidos.",
      timeline: [
        { k: "9", v: "sucursales en Santa Cruz" },
        { k: "8", v: "porciones en cada familiar" },
        { k: "20+", v: "sabores para elegir" },
      ],
    },

    reels: [
      { src: "assets/video/cheeseburguer", caption: "La más vendida: Cheeseburguer 🍔🍕", source: "IG Df98OMcuhXH" , add: "cheeseburguer" },
      { src: "assets/video/scoobyneta-35", caption: "Jamoneitor a 35 Bs por La Scoobyneta", source: "IG DfphlqNuh8Y" , add: "promo-jamoneitor-35" },
      { src: "assets/video/jamoneitor-35", caption: "En noviembre nos volvemos locos 🤪", source: "IG DfkrFlzoHYR" , add: "promo-jamoneitor-35" },
      { src: "assets/video/kit-supervivencia", caption: "Tu kit de supervivencia 🔥", source: "IG Df0DxInuIvG" },
      { src: "assets/video/apagon", caption: "Que no te sorprenda el apagón 🚨", source: "IG Dfx1wxHlvJm" },
      { src: "assets/video/suegra", caption: "¿Querés conquistar a tu suegra? 👑", source: "IG DfC0seNoVa7" },
    ],

    feed: [
      { img: "assets/img/ig-Df98OMcuhXH.webp", source: "IG Df98OMcuhXH", alt: "Sólo para hermosos: la Cheeseburguer y La Scoobyneta" , add: "cheeseburguer" },
      { img: "assets/img/ig-Df2marUnKKC.webp", source: "IG Df2marUnKKC", alt: "Por si se acaba el mundo: Jamoneitor a 35 Bs" , add: "promo-jamoneitor-35" },
      { img: "assets/img/ig-Df0DxInuIvG.webp", source: "IG Df0DxInuIvG", alt: "Tu kit de supervivencia" },
      { img: "assets/img/ig-Dfx1wxHlvJm.webp", source: "IG Dfx1wxHlvJm", alt: "Que no te sorprenda el apagón" },
      { img: "assets/img/ig-DfphlqNuh8Y.webp", source: "IG DfphlqNuh8Y", alt: "Jamoneitor a solo 35 Bs" , add: "promo-jamoneitor-35" },
      { img: "assets/img/ig-DfkrFlzoHYR.webp", source: "IG DfkrFlzoHYR", alt: "Tu Jamoneitor a 35 Bs" , add: "promo-jamoneitor-35" },
      { img: "assets/img/ig-DfkMuSflkbP.webp", source: "IG DfkMuSflkbP", alt: "Ugo's está preparando algo nuevo" },
      { img: "assets/img/ig-DfC0seNoVa7.webp", source: "IG DfC0seNoVa7", alt: "Conquistá a tu suegra con una pizza de Ugo's" },
    ],

    // HOME banner "TEXTO-el-mejor-Sabor" + "Ingredientes": masa madre, urucú, salsa preparada a la leña
    flavor: {
      img: "assets/img/ingredientes.webp",
      items: [
        { k: "Masa madre", v: "La base de todas nuestras pizzas, de la Jamoneitor a la Ugo's." },
        { k: "Urucú", v: "Un ingrediente bien nuestro, parte del sabor único de Ugo's." },
        { k: "Salsa a la leña", v: "Salsa de tomate preparada a la leña: va en todas las pizzas de la carta." },
      ],
    },

    // HOME slider "SLIDER-CEL-CAJA-1/2/3": Caja Transformer
    box: {
      img: "assets/img/caja-transformer-ugo.webp",
      steps: [
        { k: "1", v: "Abrí la caja y servite tu pizza." },
        { k: "2", v: "Cortá por las líneas: la tapa se vuelve cuatro platos." },
        { k: "3", v: "Doblá lo que queda y tenés una mini caja para llevar lo que sobró." },
      ],
    },

    // Answers only from published facts (MENU, UBIC, IG, HOME). Unknowns say "consultá en tu sucursal".
    faq: [
      { q: "¿Qué tamaño tienen las pizzas?", a: "Todas las pizzas de la carta son tamaño familiar de 8 porciones. Los precios de la carta son por la familiar." },
      { q: "¿Cuál es el horario?", a: "Todas las sucursales abren todos los días de 12:00 a 01:00, excepto los martes, que abren de 17:00 a 01:00." },
      { q: "¿Hacen delivery?", a: "Sí. La Scoobyneta es el delivery de Ugo's: escribí al WhatsApp 76066200. También podés pedir al call center 60007071 o directo a tu sucursal." },
      { q: "¿Cómo hago un pedido por esta web?", a: "Armá tu pedido en \"Pedí por WhatsApp\" (4 pasos) o con Ugo·IA. Al final se abre WhatsApp con el mensaje listo para la sucursal que elegiste; nada se envía hasta que vos lo mandes." },
      { q: "¿Cuánto cuesta el delivery y cómo pago?", a: "El costo de envío y los medios de pago dependen de la zona y la sucursal. Consultalo por WhatsApp al hacer tu pedido." },
      { q: "¿Tienen opciones sin carne?", a: "Sí: Napolitana, Margarita, Chocluda y 4 Quesos no llevan carne. Para alergias o intolerancias, consultá en tu sucursal." },
      { q: "¿Cómo pido la promo de Jamoneitor a Bs 35?", a: "Es la promo de noviembre: la Jamoneitor sale Bs 35 (en vez de Bs 47) sólo pidiendo por La Scoobyneta al 76066200, para las primeras 100 pizzas del día." },
      { q: "¿Puedo tener una franquicia de Ugo's?", a: "Sí. Dejá tus datos en la sección Franquicias y te escribimos por WhatsApp con la ficha técnica." },
    ],

    // HOME: "¿QUIERES TRABAJAR CON NOSOTROS? CONTÁCTANOS"
    jobs: { title: "¿Querés trabajar con nosotros?", text: "Ugo's busca gente hermosa. Escribinos y contanos de vos.", wa: "Hola Ugo's, quiero trabajar con ustedes 🙌" },
  };

  /* ---------- helpers shared by site and tools ---------- */
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

  /** Local {date:"YYYY-MM-DD", dow, min, hhmm} in the shop's timezone. */
  UGOS.localNow = (d = new Date()) => {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: UGOS.config.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
    const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
    const hour = p.hour === "24" ? "00" : p.hour;
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    return { date: `${p.year}-${p.month}-${p.day}`, dow, min: Number(hour) * 60 + Number(p.minute), hhmm: `${hour}:${p.minute}` };
  };

  /** Opening window for a weekday: [openMin, closeMin] with close possibly > 1440 (past midnight). */
  UGOS.windowFor = (dow) => {
    const [o, c] = UGOS.hours[dow] || UGOS.hours.def;
    let om = toMin(o), cm = toMin(c);
    if (cm <= om) cm += 1440;
    return [om, cm];
  };

  /** Is a branch open at local (dow, min)? Considers yesterday's window running past midnight. */
  UGOS.isOpenAt = (dow, min) => {
    const [o, c] = UGOS.windowFor(dow);
    if (min >= o && min < c) return true;
    const [yo, yc] = UGOS.windowFor((dow + 6) % 7);
    return yc > 1440 && min + 1440 >= yo && min + 1440 < yc;
  };

  /** Status for the UI and the tools: open | closing | opens | closed. */
  UGOS.branchStatus = (now = UGOS.localNow()) => {
    const { dow, min } = now;
    const fmt = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (UGOS.isOpenAt(dow, min)) {
      let [o, c] = UGOS.windowFor(dow);
      let closeAt = c;
      if (!(min >= o && min < c)) closeAt = UGOS.windowFor((dow + 6) % 7)[1] - 1440;
      const left = closeAt - min;
      return { state: left <= 45 ? "closing" : "open", open: true, closes: fmt(closeAt), minutesLeft: left };
    }
    const [o] = UGOS.windowFor(dow);
    if (min < o) return { state: "opens", open: false, opens: fmt(o), today: true };
    return { state: "closed", open: false, opens: fmt(UGOS.windowFor((dow + 1) % 7)[0]), today: false };
  };

  UGOS.hoursText = () => {
    const d = UGOS.hours.def, t = UGOS.hours[2];
    return `Todos los días ${d[0]} a ${d[1]} · martes ${t[0]} a ${t[1]}`;
  };

  /** Is the monthly special active on local date YYYY-MM-DD? */
  UGOS.yapaActive = (date = UGOS.localNow().date) => !!UGOS.yapa && date >= UGOS.yapa.from && date <= UGOS.yapa.until;

  UGOS.money = (n) => `${UGOS.config.currency} ${Number.isInteger(n) ? n : n.toFixed(2)}`;

  /** id → item, for site + tools. */
  UGOS.catalog = (date) => {
    const out = {};
    for (const cat of UGOS.menu) for (const it of cat.items) {
      out[it.id] = { id: it.id, name: it.name, price: it.price, kind: "pizza", cat: cat.id, size: cat.size, desc: it.desc, veg: !!it.veg, hot: !!it.hot, img: it.img };
    }
    for (const c of UGOS.combos) out[c.id] = { id: c.id, name: c.name, price: c.price, kind: "combo", cat: "combos", size: "familiar", desc: c.note, veg: false, hot: !!c.hot, img: c.img, parts: c.parts, drink: c.drink };
    const y = UGOS.yapa;
    if (y && UGOS.yapaActive(date)) out[y.id] = { id: y.id, name: y.name, price: y.price, kind: "promo", cat: "promo", size: "familiar", desc: `${y.note}. Precio normal ${UGOS.money(y.regular)}.`, veg: false, hot: true, img: y.img, ref: y.ref, regular: y.regular, channel: y.channel };
    return out;
  };

  /** Cart {id: qty} → lines + total, priced only from catalog(). Unknown ids are dropped. */
  UGOS.priceCart = (cart, date) => {
    const cat = UGOS.catalog(date); const lines = []; let total = 0;
    for (const [id, q] of Object.entries(cart || {})) {
      const it = cat[id]; const qty = Math.max(0, Math.min(50, Math.floor(Number(q) || 0)));
      if (!it || !qty) continue;
      const sub = it.price * qty; total += sub;
      lines.push({ id, name: it.name, qty, price: it.price, sub, kind: it.kind });
    }
    return { lines, total };
  };

  /** WhatsApp text, same format for the funnel and the assistant. */
  UGOS.buildMessage = (o) => {
    const L = [];
    const svc = { delivery: "🛵 Delivery", pickup: "🏪 Recojo en sucursal", event: "🎉 Mesa o evento", question: "💬 Consulta" }[o.intent] || "🛵 Delivery";
    if (o.intent === "question") {
      L.push("¡Hola Ugo's! 😎 Tengo una consulta");
      if (o.topic) L.push(`Tema: ${o.topic}`);
      if (o.name) L.push(`👤 ${o.name}`);
      if (o.note) L.push(`📝 ${o.note}`);
      return L.join("\n");
    }
    if (o.intent === "event") {
      L.push("¡Hola Ugo's! 😎 Quiero reservar para un evento");
      if (o.event && o.event.date) L.push(`📅 Fecha: ${o.event.date}`);
      if (o.event && o.event.people) L.push(`👥 Personas: ${o.event.people}`);
      if (o.event && o.event.occasion) L.push(`🎉 Ocasión: ${o.event.occasion}`);
    } else {
      L.push(o.orderId ? `¡Hola Ugo's! 😎 Pedido ${o.orderId}` : "¡Hola Ugo's! 😎 Quiero hacer un pedido");
    }
    L.push(`${svc}${o.branchName ? ` · ${o.branchName}` : ""}`);
    const { lines, total } = UGOS.priceCart(o.cart, o.date);
    if (lines.length) {
      L.push("━━━━━━━━━━");
      for (const l of lines) L.push(`${l.qty}× ${l.name} — ${UGOS.money(l.sub)}`);
      L.push("━━━━━━━━━━");
      L.push(`Total: ${UGOS.money(total)}`);
    }
    if (o.name) L.push(`👤 Nombre: ${o.name}`);
    if (o.intent === "delivery") {
      if (o.address) L.push(`📍 Dirección: ${o.address}${o.reference ? ` (Ref: ${o.reference})` : ""}`);
      if (o.pin) L.push(`📌 Ubicación: ${o.pin}`);
    }
    if (o.intent !== "event") L.push(`🕒 ${!o.when || o.when === "asap" ? "Lo antes posible" : `Para las ${o.when}`}`);
    if (o.payment) L.push(`💵 Pago: ${o.payment}`);
    if (o.note) L.push(`📝 Nota: ${o.note}`);
    return L.join("\n");
  };

  UGOS.waUrl = (num, text) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;

  /** Destination for an order: a branch, La Scoobyneta, or the call centre. */
  UGOS.destination = (id) => {
    if (id === UGOS.delivery.id) return { id, name: UGOS.delivery.name, whatsapp: UGOS.delivery.whatsapp, kind: "delivery" };
    const b = UGOS.branches.find((x) => x.id === id);
    if (b) return { id: b.id, name: `Sucursal ${b.name}`, whatsapp: b.whatsapp, kind: "branch", branch: b };
    return { id: "callcenter", name: "Ugo's Pizza", whatsapp: UGOS.config.callCenter, kind: "callcenter" };
  };

  return UGOS;
});
