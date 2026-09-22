let CONFIG=null, cart=[], currentCategory="pizzas", productQty=1;
const money=n=>"$"+Math.round(n).toLocaleString("es-AR");
const $=s=>document.querySelector(s);

async function load(){
  try{
    const r=await fetch("/api/public-config", { cache: "no-store" });
    if(!r.ok) throw new Error("No se pudo cargar la configuración");
    CONFIG=await r.json();
    renderHeader(); renderTabs(); renderMenu();
  }catch(err){
    console.error("Error actualizando NONNA PIZZAS:", err);
  }
}

// Mantiene la página pública sincronizada con el panel de administración.
// Así los cambios de estado, precios, productos e imágenes aparecen sin editar el código.
let syncTimer=setInterval(load, 10000);
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible") load();
});
function renderHeader(){
  const s=CONFIG.settings;
  $("#statusLine").textContent=s.open?"🟢 ESTAMOS ATENDIENDO":"🔴 ESTAMOS CERRADOS";
  $("#statusLine").className="status-line "+(s.open?"status-open":"status-closed");
  $("#scheduleLine").textContent="Horario: "+s.schedule;
  $("#mapsLink").href=`https://www.google.com/maps?q=${s.latitude},${s.longitude}`;
  $("#phoneLink").href=`tel:+${s.phone}`; $("#phoneLink").textContent="📞 +54 9 3755 208648";
  $("#instagramLink").href=s.instagram; $("#instagramLink").textContent="📷 Instagram de NONNA PIZZAS";
  $("#deliveryPriceLabel").textContent="+"+money(s.deliveryPrice);
}
function renderTabs(){document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCategory=b.dataset.category;renderMenu()})}
function products(){return CONFIG.products.filter(p=>p.category===currentCategory)}
function renderMenu(){
  const grid=$("#menu");
  if(currentCategory==="bebidas"||currentCategory==="tragos"){
    grid.innerHTML=products().map(card).join("");
  }else if(currentCategory==="prepizzas"){
    grid.innerHTML=products().map(card).join("");
  }else{
    const list=products();
    grid.innerHTML=list.map(card).join("");
    if(currentCategory==="pizzas"){
      grid.insertAdjacentHTML("afterbegin",`<article class="product-card"><div class="placeholder">🍕</div><div class="product-body"><h3>Mitad y Mitad</h3><p>Elegí dos sabores y armá una pizza entera a tu gusto.</p><div class="price">Desde ${money(Math.min(...list.map(p=>p.price)))}</div><button class="add-btn" onclick="openHalf()">Armar mitad y mitad</button></div></article>`);
    }
  }
}
function card(p){
  return `<article class="product-card">${p.image?`<img class="product-img" src="${p.image}" alt="${esc(p.name)}">`:`<div class="placeholder">${p.category==="bebidas"?"🥤":p.category==="tragos"?"🍹":"🍕"}</div>`}<div class="product-body"><h3>${esc(p.name)}</h3><p>${esc(p.description||"")}</p><div class="price">${money(p.price)}</div><button class="add-btn" onclick="openProduct(${p.id})">Personalizar / Agregar</button></div></article>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openProduct(id){
  const p=CONFIG.products.find(x=>x.id===id); productQty=1;
  const prepizza=p.category==="prepizzas", simple=["bebidas","tragos"].includes(p.category);
  let html=`<h2>${esc(p.name)}</h2><p>${esc(p.description||"")}</p>`;
  if(prepizza){
    html+=`<div class="option-group"><h3>Producto</h3><p><strong>Prepizza entera</strong> · sin opción de porciones, asada/prelista ni extras de pizza.</p></div>`;
  }else if(simple){
    html+=`<div class="option-group"><h3>Presentación</h3><p>Producto listo para agregar al pedido.</p></div>`;
  }else{
    const special=p.category==="especiales";
    html+=`<div class="option-group"><h3>Preparación</h3><label class="option"><input type="radio" name="prep" value="prelista" checked> ❄️ Prelista / sin asar</label><label class="option"><input type="radio" name="prep" value="asada"> 🔥 Asada (+${money(CONFIG.settings.cookedExtra)})</label>
    <h3 style="margin-top:16px">Tamaño</h3><label class="option"><input type="radio" name="size" value="mitad" checked> Mitad (1/2)</label><label class="option"><input type="radio" name="size" value="entera"> Entera</label>
    ${special ? `<p class="option-note">⭐ Especial: incluye borde relleno.</p>` : `<h3 style="margin-top:16px">Borde</h3><label class="option"><input type="radio" name="edge" value="normal" checked> Tradicional</label><label class="option"><input type="radio" name="edge" value="relleno"> Relleno (+${money(CONFIG.settings.filledEdgeExtra)})</label>`}
    </div>`;
  }
  html+=`<div class="qty"><strong>Cantidad</strong><button type="button" onclick="changeQty(-1)">−</button><span id="productQty">1</span><button type="button" onclick="changeQty(1)">+</button></div><div class="summary"><div><span>Total</span><strong id="productTotal">${money(p.price)}</strong></div></div><button class="primary" onclick="addProduct(${p.id})">Agregar al pedido</button>`;
  $("#productContent").innerHTML=html; $("#productModal").classList.remove("hidden");
  document.querySelectorAll("#productContent input").forEach(x=>x.onchange=updateProductTotal); updateProductTotal();
}
function changeQty(d){productQty=Math.max(1,productQty+d);$("#productQty").textContent=productQty;updateProductTotal()}
function unitPrice(p){
  if(p.category==="prepizzas"||["bebidas","tragos"].includes(p.category))return p.price;
  const size=document.querySelector('input[name="size"]:checked').value;
  const asada=document.querySelector('input[name="prep"]:checked').value==="asada";
  const edge=!p || p.category==="especiales" ? true : document.querySelector('input[name="edge"]:checked').value==="relleno";
  const mult=size==="mitad"?1/2:1;
  return p.price*mult+(asada?CONFIG.settings.cookedExtra:0)+(!p || p.category==="especiales" ? 0 : (edge?CONFIG.settings.filledEdgeExtra:0));
}
function updateProductTotal(){const h=$("#productContent h2");if(!h)return;const p=CONFIG.products.find(x=>x.name===h.textContent);if(!p)return;$("#productTotal").textContent=money(unitPrice(p)*productQty)}
function addProduct(id){const p=CONFIG.products.find(x=>x.id===id), u=unitPrice(p);let detail="";
  if(p.category==="prepizzas")detail="Prepizza entera";
  else if(["bebidas","tragos"].includes(p.category))detail="Producto";
  else{const size=document.querySelector('input[name="size"]:checked').value;const prep=document.querySelector('input[name="prep"]:checked').value;if(p.category==="especiales"){detail=`${size==="mitad"?"Mitad (1/2)":"Entera"} · ${prep==="asada"?"Asada":"Prelista / sin asar"} · Borde relleno (incluido)`}else{const edge=document.querySelector('input[name="edge"]:checked').value;detail=`${size==="mitad"?"Mitad (1/2)":"Entera"} · ${prep==="asada"?"Asada":"Prelista / sin asar"} · ${edge==="relleno"?"Borde relleno":"Borde tradicional"}`}}
  cart.push({name:p.name,qty:productQty,unit:u,detail});close("productModal");updateBar();
}
function openHalf(){
  const ps=CONFIG.products.filter(p=>p.category==="pizzas");$("#half1").innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)} · ${money(p.price)}</option>`).join("");$("#half2").innerHTML=$("#half1").innerHTML;
  $("#halfCooked").textContent=CONFIG.settings.cookedExtra.toLocaleString("es-AR");$("#halfEdge").textContent=CONFIG.settings.filledEdgeExtra.toLocaleString("es-AR");
  ["#half1","#half2"].forEach(s=>$(s).onchange=updateHalf);document.querySelectorAll('input[name="halfPrep"],input[name="halfEdge"]').forEach(x=>x.onchange=updateHalf);$("#halfModal").classList.remove("hidden");updateHalf();
}
function updateHalf(){const a=CONFIG.products.find(p=>p.id==+$("#half1").value),b=CONFIG.products.find(p=>p.id==+$("#half2").value);let total=(a.price+b.price)/2; if($('input[name="halfPrep"]:checked').value==="asada")total+=CONFIG.settings.cookedExtra;if($('input[name="halfEdge"]:checked').value==="relleno")total+=CONFIG.settings.filledEdgeExtra;$("#halfTotal").textContent=money(total)}
$("#addHalf").onclick=()=>{const a=CONFIG.products.find(p=>p.id==+$("#half1").value),b=CONFIG.products.find(p=>p.id==+$("#half2").value);let u=(a.price+b.price)/2;if($('input[name="halfPrep"]:checked').value==="asada")u+=CONFIG.settings.cookedExtra;if($('input[name="halfEdge"]:checked').value==="relleno")u+=CONFIG.settings.filledEdgeExtra;cart.push({name:"Pizza Mitad y Mitad",qty:1,unit:u,detail:`½ ${a.name} + ½ ${b.name} · ${$('input[name="halfPrep"]:checked').value==="asada"?"Asada":"Prelista"} · ${$('input[name="halfEdge"]:checked').value==="relleno"?"Borde relleno":"Borde tradicional"}`});close("halfModal");updateBar()}
function subtotal(){return cart.reduce((s,x)=>s+x.qty*x.unit,0)}
function updateBar(){if(!cart.length){$("#cartBar").classList.add("hidden");return}$("#cartBar").classList.remove("hidden");$("#cartCount").textContent=`${cart.reduce((s,x)=>s+x.qty,0)} productos`;$("#cartTotal").textContent=money(subtotal())}
function renderCart(){const d=document.querySelector('input[name="fulfillment"]:checked')?.value==="Delivery"?CONFIG.settings.deliveryPrice:0;$("#cartItems").innerHTML=cart.map((x,i)=>`<div class="cart-item"><div><strong>${x.qty}× ${esc(x.name)}</strong><small>${esc(x.detail)}</small></div><div><strong>${money(x.qty*x.unit)}</strong><br><button class="remove" onclick="removeItem(${i})">Eliminar</button></div></div>`).join("");$("#summarySubtotal").textContent=money(subtotal());$("#summaryDelivery").textContent=money(d);$("#summaryTotal").textContent=money(subtotal()+d)}
function removeItem(i){cart.splice(i,1);renderCart();updateBar();if(!cart.length)close("cartModal")}
function close(id){$("#"+id).classList.add("hidden")}
$("#openCart").onclick=()=>{renderCart();$("#cartModal").classList.remove("hidden")};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.add("hidden")});
document.querySelectorAll('input[name="fulfillment"]').forEach(r=>r.onchange=()=>{const d=r.value==="Delivery"&&r.checked;$("#deliveryFields").classList.toggle("hidden",!d);document.querySelector('[name="address"]').required=d;document.querySelector('[name="neighborhood"]').required=d;renderCart()});
$("#gpsBtn").onclick=()=>{if(!navigator.geolocation){$("#gpsStatus").textContent="Tu navegador no permite geolocalización.";return}$("#gpsStatus").textContent="Obteniendo ubicación...";navigator.geolocation.getCurrentPosition(pos=>{document.querySelector('[name="latitude"]').value=pos.coords.latitude;document.querySelector('[name="longitude"]').value=pos.coords.longitude;$("#gpsStatus").textContent=`Ubicación GPS cargada: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`},()=>$("#gpsStatus").textContent="No se pudo obtener la ubicación. Revisá los permisos del navegador.",{enableHighAccuracy:true,timeout:10000})};
$("#orderForm").onsubmit=e=>{e.preventDefault();if(!cart.length)return alert("Tu carrito está vacío.");const f=new FormData(e.target),delivery=f.get("fulfillment")==="Delivery",total=subtotal()+(delivery?CONFIG.settings.deliveryPrice:0);let msg=`🍕 *NONNA PIZZAS*%0A%0A👤 *Cliente:* ${f.get("name")}%0A📞 *Teléfono:* ${f.get("phone")}%0A%0A*PEDIDO:*%0A`;cart.forEach(x=>msg+=`• ${x.qty}× ${x.name} — ${money(x.qty*x.unit)}%0A  ${x.detail}%0A`);msg+=`%0A💵 *Subtotal:* ${money(subtotal())}%0A${delivery?"🛵 *Delivery:* "+money(CONFIG.settings.deliveryPrice):"🏠 *Retiro en local:* sin costo"}%0A`;if(delivery){msg+=`📍 *Dirección:* ${f.get("address")}%0A🏘️ *Barrio:* ${f.get("neighborhood")}%0A📌 *Referencia:* ${f.get("reference")||"No indicada"}%0A`;if(f.get("latitude"))msg+=`🛰️ *GPS:* https://www.google.com/maps?q=${f.get("latitude")},${f.get("longitude")}%0A`}msg+=`💳 *Pago:* ${f.get("payment")}%0A📝 *Observaciones:* ${f.get("notes")||"Sin observaciones"}%0A%0A💰 *TOTAL: ${money(total)}*`;window.open(`https://wa.me/${CONFIG.settings.phone}?text=${msg}`,"_blank")};
load();