// ===== Firebase =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, collection, doc, addDoc, getDocs, deleteDoc,
  updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ===== Firebase config =====
const firebaseConfig = {
  apiKey: "AIzaSy3...yourKey...",
  authDomain: "sellamo-app.firebaseapp.com",
  projectId: "sellamo-app",
  storageBucket: "sellamo-app.appspot.com",
  messagingSenderId: "568980662203",
  appId: "1:568980662203:web:2c8a7d14025c267e8bc69e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== DOM =====
const tablesGrid = document.getElementById('tablesGrid');
const drawer = document.getElementById('drawer');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const activeTableLabel = document.getElementById('activeTableLabel');
const categoriesEl = document.getElementById('categories');
const productsEl = document.getElementById('products');
const orderListEl = document.getElementById('orderList');
const orderTotalEl = document.getElementById('localOrderTotal');
const btnSubmit = document.getElementById('btnSubmit');
const btnPrint = document.getElementById('btnPrint');
const btnReset = document.getElementById('btnReset');
const btnTotalDay = document.getElementById('btnTotalDay');
const totalDayDisplay = document.getElementById('totalDayDisplay');
const toastEl = document.getElementById('toast');
const orderDetailEl = document.getElementById('orderDetail');
const printMeta = document.getElementById('printMeta');
const printItems = document.getElementById('printItems');
const printTotal = document.getElementById('printTotal');

// ===== State =====
let orders = {}; // الطلبات المحلية
let activeTable = null;
let activeCategory = 'Café';
const firebaseOrdersMap = {}; // tableNumber => orderData
const orderTableMap = {}; // docId => tableNumber

// ===== Data =====
const PRODUCTS = [
  {id:'p1', name:'Express', price:2.5, img:'assets/img/cafe/exp.avif', category:'Café'},
  {id:'p2', name:'Capucin', price:4.0, img:'assets/img/cafe/capss.jpg', category:'Café'},
  {id:'p3', name:'Direct',  price:4.3, img:'assets/img/cafe/dir.jpg',  category:'Café'},
  {id:'p4', name:'Glacé',   price:4.5, img:'assets/img/cafe/glacé.jpg',category:'Café'},
  {id:'p5', name:'Thé Vert', price:2.8, img:'assets/img/the/tea.jpg', category:'Thé'},
  {id:'p6', name:'Thé + Fruit sec', price:2.8, img:'assets/img/the/tea_fruit_sec.avif', category:'Thé'},
  {id:'p7', name:'Frappuchino Caramel', price:6.5, img:'assets/img/Frappuchino/caramel.jpeg', category:'Frappuchino'},
  {id:'p8', name:'Frappuchino Nutella', price:6.5, img:'assets/img/Frappuchino/nutella.jpeg', category:'Frappuchino'},
  {id:'p9',  name:'Glace 2 Boule', price:4.5, img:'assets/img/glace/2_boule.jpeg', category:'Glace'},
  {id:'p10', name:'Glace 3 Boule', price:4.5, img:'assets/img/glace/3_boule.jpeg', category:'Glace'},
  {id:'p11', name:'Eau', price:3.5, img:'assets/img/water.jpeg', category:'Boissons'},
  {id:'p12', name:'Boisson Gazeuse', price:4.7, img:'assets/img/jus/Boisson_gazeuse.jpeg', category:'Boissons'},
  {id:'p13', name:'Mojito Classique', price:7, img:'assets/img/mojito/classique.jpeg', category:'Mojito'},
  {id:'p14', name:'Mojito Fraise', price:7, img:'assets/img/mojito/FRAISE.jpeg', category:'Mojito'},
  {id:'p15', name:'Crépe Sallami', price:7, img:'assets/img/sale/sallami.jpeg', category:'Salé'},
  {id:'p16', name:'Panini Thon', price:7, img:'assets/img/sale/thon.jpeg', category:'Salé'},
  {id:'p17', name:'Crêpe Chocolat', price:7, img:'assets/img/sucree/crepe.jpg', category:'Sucré'},
  {id:'p18', name:'Gauffre Chocolat', price:7, img:'assets/img/sucree/gaufres_nutella.jpeg', category:'Sucré'}
];
const CATEGORIES = ['Café','Thé','Frappuchino','Glace','Boissons','Mojito','Salé','Sucré'];

// ===== Utils =====
const fmt = v => v.toFixed(3)+' DT';
function toast(msg, ms=1600){ 
  clearTimeout(toastEl._t); 
  toastEl.textContent = msg; 
  toastEl.classList.add('show'); 
  toastEl._t = setTimeout(()=>toastEl.classList.remove('show'), ms); 
}
function orderTotal(list){ return list.reduce((s,i)=> s+i.price,0); }

// ===== Tables =====
function renderTables(){
  tablesGrid.innerHTML='';
  for(let i=1;i<=100;i++){
    const btn=document.createElement('button');
    btn.className='table-card';
    btn.dataset.table=i;
    btn.innerHTML=`<div class="table-emoji">🍽️</div><div class="table-name">Table ${i}</div>`;
    btn.addEventListener('click',()=>openTable(i));
    tablesGrid.appendChild(btn);
  }
}
function updateTableColor(table, status){
  const btn = tablesGrid.querySelector(`button[data-table="${table}"]`);
  if(!btn) return;
  btn.classList.remove('pending','confirmed','refused');
  if(status) btn.classList.add(status);
}

// ===== Categories & Products =====
function renderCategories(){
  categoriesEl.innerHTML=CATEGORIES.map(c=>`<button class="tab ${c===activeCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');
  categoriesEl.querySelectorAll('.tab').forEach(btn=> btn.addEventListener('click',()=>{
    activeCategory = btn.dataset.cat;
    renderCategories();
    renderProducts();
  }));
}
function renderProducts(){
  const list = PRODUCTS.filter(p=>p.category===activeCategory);
  productsEl.innerHTML=list.map(p=>`
    <article class="prod">
      <img class="prod__img" src="${p.img}" alt="${p.name}" onerror="this.src='assets/img/placeholder.png'">
      <div class="prod__name">${p.name}</div>
      <div class="prod__price">${fmt(p.price)}</div>
      <button class="btn btn--primary" data-id="${p.id}">Ajouter</button>
    </article>
  `).join('');
  productsEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>addToOrder(b.dataset.id)));
}

// ===== Orders local =====
function getOrderForActive(){ if(!activeTable) return []; return orders[activeTable]||(orders[activeTable]=[]); }
function addToOrder(prodId){ 
  const p = PRODUCTS.find(x=>x.id===prodId); 
  if(!p || !activeTable) return; 
  getOrderForActive().push({id:p.id,name:p.name,price:p.price}); 
  renderOrder(); 
}
function renderOrder(){
  const list = getOrderForActive();
  if(!list.length){ 
    orderListEl.innerHTML=`<div class="muted">Commande vide.</div>`; 
    orderTotalEl.textContent=fmt(0); 
    btnSubmit.disabled=true; btnPrint.disabled=true; 
    return;
  }
  orderListEl.innerHTML=list.map((i,idx)=>`
    <div class="order-item">
      <div class="meta"><div class="name">${i.name}</div><div class="price">${fmt(i.price)}</div></div>
      <button class="remove" data-index="${idx}">Supprimer</button>
    </div>
  `).join('');
  orderListEl.querySelectorAll('.remove').forEach(b=> b.addEventListener('click',()=>{
    list.splice(parseInt(b.dataset.index,10),1); renderOrder();
  }));
  orderTotalEl.textContent=fmt(orderTotal(list));
  btnSubmit.disabled=false; btnPrint.disabled=false;
}

// ===== Actions local =====
btnSubmit.addEventListener('click', async()=>{
  if(!activeTable) return;
  const list = getOrderForActive();
  if(!list.length) return;

  const tableNum = activeTable;
  const total = orderTotal(list);
  const orderData = {
    table: Number(tableNum),
    items: list.map(i=>({...i, qty:1})),
    total: total,
    status:'pending',
    timestamp:Date.now()
  };

  updateTableColor(tableNum,'pending');
  await addDoc(collection(db,'orders'), orderData);
  toast(`Commande envoyée pour Table ${tableNum} ✅`);
});

// ===== Firebase listener (prevent duplicate & assign first empty table) =====
function findNextEmptyTable() {
  for(let i=1;i<=100;i++){
    if(!firebaseOrdersMap[i]) return i;
  }
  return null;
}

onSnapshot(collection(db, "orders"), snapshot => {
  snapshot.docChanges().forEach(change => {
    const data = change.doc.data();
    const id = change.doc.id;

    if(change.type === "added") {
      if(orderTableMap[id]) return; // منع الدوبلاج
      const table = findNextEmptyTable();
      if(!table) return;
      firebaseOrdersMap[table] = {...data, docId:id};
      orderTableMap[id] = table;
      updateTableColor(table,'pending');
      if(activeTable === String(table)) renderFirebaseOrder(table);
      createOrderEmoji(firebaseOrdersMap[table]);
    }
    else if(change.type === "modified") {
      const table = orderTableMap[id];
      if(table && firebaseOrdersMap[table]){
        firebaseOrdersMap[table] = {...data, docId:id};
        updateTableColor(table,data.status);
        if(activeTable === String(table)) renderFirebaseOrder(table);
      }
    }
    else if(change.type === "removed") {
      const table = orderTableMap[id];
      if(table){
        delete firebaseOrdersMap[table];
        delete orderTableMap[id];
        updateTableColor(table,'');
      }
    }
  });
});

// ===== Drawer & open table =====
function openTable(n){
  activeTable = String(n);
  activeTableLabel.textContent = activeTable;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  renderCategories();
  renderProducts();
  renderOrder();
  renderFirebaseOrder(activeTable);
}
btnCloseDrawer.addEventListener('click', ()=>{ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });

// ===== Firebase order display =====
function renderFirebaseOrder(table){
  const order = firebaseOrdersMap[table];
  if(!order || !order.items || !Array.isArray(order.items)){
    orderDetailEl.innerHTML='<div>Pas de commande</div>';
    return;
  }
  orderDetailEl.innerHTML=`
    <h3>Table: ${table}</h3>
    <div id="orderItems">
      ${order.items.map(i=>`<div class="row"><span>${i.name}</span> <span>${i.price.toFixed(3)} DT</span></div>`).join('')}
    </div>
    <div>Total: ${order.total.toFixed(3)} DT</div>
    <div class="actions">
      <button onclick="acceptOrder('${order.docId}')">✅ Accepter</button>
      <button onclick="cancelOrder('${order.docId}')">❌ Annuler</button>
    </div>
  `;
}

// ===== Accept / Cancel =====
async function acceptOrder(id){ 
  await updateDoc(doc(db,'orders',id), {status:'accepted'});
  toast("✅ Commande acceptée"); 
}
async function cancelOrder(id){ 
  await updateDoc(doc(db,'orders',id), {status:'cancelled'});
  toast("❌ Commande annulée"); 
}

// ===== Init =====
renderTables();
renderCategories();
renderProducts();
