import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { 
  getFirestore, collection, doc, addDoc, getDocs, deleteDoc,
  updateDoc, onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

  // ===== Firebase config =====
  const firebaseConfig = {
    apiKey: "AIzaSyBq3-98tHzE5H7mCUKhr4Ci2Lbqb45-tWo",
    authDomain: "sellamo-app.firebaseapp.com",
    projectId: "sellamo-app",
    storageBucket: "sellamo-app.firebasestorage.app",
    messagingSenderId: "568980662203",
    appId: "1:568980662203:web:2c8a7d14025c267e8bc69e",
    measurementId: "G-T6T9NGP3M8"
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
  const STORE_KEY = 'pos_orders_v1';
  let orders = {}; // local orders serveurs
  let activeTable = null;
  let activeCategory = 'Café';
  let firebaseOrdersMap = {};  // tableNumber => orderData

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
    {id:'p16', name:'Panini Thon',   price:7, img:'assets/img/sale/thon.jpeg',    category:'Salé'},
    {id:'p17', name:'Crêpe Chocolat', price:7, img:'assets/img/sucree/crepe.jpg', category:'Sucré'},
    {id:'p18', name:'Gauffre Chocolat', price:7, img:'assets/img/sucree/gaufres_nutella.jpeg', category:'Sucré'}
  ];
  const CATEGORIES = ['Café','Thé','Frappuchino','Glace','Boissons','Mojito','Salé','Sucré'];

  // ===== Utils =====
  const fmt = v => v.toFixed(3)+' DT';
  function toast(msg, ms=1600){ clearTimeout(toastEl._t); toastEl.textContent=msg; toastEl.classList.add('show'); toastEl._t=setTimeout(()=>toastEl.classList.remove('show'), ms); }
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
  function updateTableColor(table,status){
    const btn=tablesGrid.querySelector(`button[data-table="${table}"]`);
    if(!btn) return;

    // ننحي الكلاسات القديمة
    btn.classList.remove('pending','confirmed','refused');

    // نزيد الكلاس حسب الحالة
    if(status) btn.classList.add(status);
  }


  // ===== Categories & Products =====
  function renderCategories(){
    categoriesEl.innerHTML=CATEGORIES.map(c=>`<button class="tab ${c===activeCategory?'active':''}" data-cat="${c}">${c}</button>`).join('');
    categoriesEl.querySelectorAll('.tab').forEach(btn=> btn.addEventListener('click',()=>{ activeCategory=btn.dataset.cat; renderCategories(); renderProducts(); }));
  }
  function renderProducts(){
    const list=PRODUCTS.filter(p=>p.category===activeCategory);
    productsEl.innerHTML=list.map(p=>`
      <article class="prod">
        <img class="prod__img" src="${p.img}" alt="${p.name}" onerror="this.src='assets/img/placeholder.png'">
        <div class="prod__name">${p.name}</div>
        <div class="prod__price">${fmt(p.price)}</div>
        <button class="btn btn--primary" data-id="${p.id}">Ajouter</button>
      </article>
    `).join('');
    productsEl.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=> addToOrder(b.dataset.id)));
  }

  // ===== Orders local =====
  function getOrderForActive(){ if(!activeTable) return[]; return orders[activeTable]||(orders[activeTable]=[]); }
  function addToOrder(prodId){ const p=PRODUCTS.find(x=>x.id===prodId); if(!p||!activeTable) return; const list=getOrderForActive(); list.push({id:p.id,name:p.name,price:p.price}); renderOrder(); }
  function renderOrder(){
    const list=getOrderForActive();
    if(!list.length){ orderListEl.innerHTML=`<div class="muted">Commande vide.</div>`; orderTotalEl.textContent=fmt(0); btnSubmit.disabled=true; btnPrint.disabled=true; return;}
    orderListEl.innerHTML=list.map((i,idx)=>`<div class="order-item"><div class="meta"><div class="name">${i.name}</div><div class="price">${fmt(i.price)}</div></div><button class="remove" data-index="${idx}">Supprimer</button></div>`).join('');
    orderListEl.querySelectorAll('.remove').forEach(b=> b.addEventListener('click',()=> { const list=getOrderForActive(); list.splice(parseInt(b.dataset.index,10),1); renderOrder(); }));
    orderTotalEl.textContent=fmt(orderTotal(list));
    btnSubmit.disabled=false; btnPrint.disabled=false;
  }

  btnSubmit.addEventListener('click', async()=>{
    if(!activeTable) return;
    const list=getOrderForActive();
    if(!list.length) return;

    const tableNum = activeTable;
    const total = orderTotal(list);
    const orderData = {
      table: tableNum,
      items: list.map(i=>({...i, qty:1})),
      total: total,
      status:'pending',
      timestamp:Date.now()
    };

    // 🔴 خلي الطاولة تولي حمرا
    updateTableColor(tableNum,'pending');

    await addDoc(collection(db, 'orders'), orderData); 
    toast(`Commande envoyée pour Table ${tableNum} ✅`);
  });



  // Print
  btnPrint.addEventListener('click',()=>{
    const list=getOrderForActive();
    if(!activeTable || !list.length) return;
    printMeta.textContent = `Table ${activeTable} — ${new Date().toLocaleString()}`;
    printItems.innerHTML = list.map(i=>`<div class="row"><span>${i.name}</span><span>${fmt(i.price)}</span></div>`).join('');
    printTotal.textContent = fmt(orderTotal(list));
    window.print();
  });

  // ===== Reset Firebase =====
  btnReset.addEventListener('click', async()=>{
    // 1️⃣ تمسح كل الطلبات من Firebase
    const snap = await getDocs(collection(db,'orders'));
    snap.forEach(docSnap => deleteDoc(doc(db,'orders',docSnap.id)));

  // 1️⃣ مسح الطلبات المحلية
  orders = {};

  // 2️⃣ إعادة تهيئة كل الطاولات (لون أصلي)
  for(let i=1;i<=100;i++) updateTableColor(i,'');

  // 3️⃣ تحديث الـ drawer
  renderOrder(); // يظهر "Commande vide"

  // 4️⃣ إعادة حساب Total Day
  totalDayDisplay.textContent = `Total du jour: 0 DT`;

  toast('Toutes les commandes supprimées ✅');
});


btnTotalDay.addEventListener('click', ()=>{
  let total = 0;

  Object.values(orders).forEach(orderList => {
    orderList.forEach(item => {
      if(item.price) total += item.price;
    });
  });

  totalDayDisplay.textContent = `Total du jour: ${total.toFixed(2)} DT`;
});

  // ===== Drawer open =====
  function openTable(n){ activeTable=String(n); activeTableLabel.textContent=activeTable; drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); renderCategories(); renderProducts(); renderOrder(); renderFirebaseOrder(activeTable); }
  btnCloseDrawer.addEventListener('click',()=>{ drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); });

  // ===== Firebase listener =====
  onSnapshot(collection(db,'orders'),snap=>{
    snap.docChanges().forEach(change=>{
      const data = change.doc.data();
      const table = data.table;
      firebaseOrdersMap[table] = {...data, docRef: change.doc.ref};

      // أي طلب جديد → الطاولة أحمر
      if(data.status==='pending') updateTableColor(table,'pending');

      // إذا الطاولة المفتوحة هي نفسها → عرض التفاصيل
      if(activeTable==table) renderFirebaseOrder(table);

      // Alert + print + confirmer
      if(data.status==='pending' && !data._alertShown){
        data._alertShown = true;
        alert(`🚨 Nouvelle commande pour Table ${table}`);
        printFirebaseOrder(data);
        updateDoc(doc(db,'orders',change.doc.id),{status:'confirmed'});
        updateTableColor(table,'confirmed');
      }
    });
  });

  function renderFirebaseOrder(table){
    const order = firebaseOrdersMap[table];
    if(!order || !order.items || !Array.isArray(order.items)){
      orderDetailEl.innerHTML = '<div>Pas de commande</div>';
      return;
    }
    orderDetailEl.innerHTML = `
      <h3>Table: ${table}</h3>
      <div id="orderItems">
        ${order.items.map(i=>`<div class="row"><span>${i.name}</span> <span>${fmt(i.price)}</span></div>`).join('')}
      </div>
      <div>Total: ${fmt(order.total)}</div>
    `;
  }

  function printFirebaseOrder(order){
    printMeta.textContent = `Table ${order.table} — ${new Date().toLocaleString()}`;
    printItems.innerHTML = order.items.map(i=>`<div class="row"><span>${i.name}</span> <span>${fmt(i.price)}</span></div>`).join('');
    printTotal.textContent = fmt(order.total);
    window.print();
  }

  // ===== Init =====
  renderTables();
  renderCategories();
  renderProducts();

// 🔴 Listener على collection orders
const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const data = change.doc.data();
      console.log("🆕 Nouveau order reçu:", data);

      // 🎨 لوّن الطاولة
      updateTableColor(data.table, 'pending');

      // 🖼️ عرض الطلب في واجهة السيرڤور
      const container = document.getElementById("firebaseOrderItems");
      container.innerHTML += `
        <div class="order-card">
          <h4>Table ${data.table}</h4>
          <ul>
            ${data.items.map(i=>`<li>${i.qty}× ${i.name} (${i.comment||''})</li>`).join('')}
          </ul>
          <strong>Total: ${data.total} DT</strong>
          <div class="actions">
            <button onclick="acceptOrder('${change.doc.id}')">✅ Accepter</button>
            <button onclick="cancelOrder('${change.doc.id}')">❌ Annuler</button>
          </div>
        </div>
      `;

      toast(`Nouvelle commande pour Table ${data.table} 🍽️`);
    }
  });
});

// 🔧 دوال باش تكمّل الخدمة (تنجم تطوّرهم كيف تحب)
async function acceptOrder(id) {
  await updateDoc(doc(db, "orders", id), { status: "accepted" });
  toast("✅ Commande acceptée");
}

async function cancelOrder(id) {
  await updateDoc(doc(db, "orders", id), { status: "cancelled" });
  toast("❌ Commande annulée");
}
  
