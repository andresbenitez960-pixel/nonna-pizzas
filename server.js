const express = require("express");
const session = require("express-session");
const sqlite = require("sqlite-sync");
const path = require("path");

// Conectar a la base de datos de forma síncrona
const dbPath = path.join(__dirname, "nonna.db");
sqlite.connect(dbPath);

// Adaptador completo para simular "better-sqlite3" de forma síncrona
const db = {
    pragma: (command) => {
        // Ejecuta comandos internos como journal_mode, etc.
        return sqlite.run("PRAGMA " + command);
    },
    exec: (sql) => {
      return sqlite.run(sql)
    },
    transaction: (fn) => {
        // Simula el manejo de transacciones ejecutando la función directamente
        return function(...args) {
            sqlite.run("BEGIN TRANSACTION");
            try {
                const result = fn(...args);
                sqlite.run("COMMIT");
                return result;
            } catch (error) {
                sqlite.run("ROLLBACK");
                throw error;
            }
        };
    },
    prepare: (sql) => {
        return {
            run: (...params) => {
                const res = sqlite.run(sql, params);
                return { changes: typeof res === 'number' ? res : 1, lastID: null };
            },
            get: (...params) => {
                const res = sqlite.run(sql, params);
                return res && res.length > 0 ? res[0] : null; // Corregido: retorna el objeto de la fila directamente
            },
            all: (...params) => {
                return sqlite.run(sql, params) || [];
            }
        };
    }
};
// A partir de aquí continúa el resto de tu archivo original...
// (Por ejemplo: db.prepare("CREATE TABLE...").run() funcionará sin romperse)
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cambiar-esta-clave";

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "public", "uploads");
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`);

const defaults = {
  business_name: "NONNA PIZZAS",
  open: "true",
  schedule: "Lunes a Domingo · 19:00 a 00:00",
  phone: "5493755208648",
  instagram: "https://www.instagram.com/",
  latitude: "-27.292740",
  longitude: "-54.206261",
  delivery_price: "3000",
  cooked_extra: "3000",
  filled_edge_extra: "3000"
};

const setDefault = db.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)");
for (const [k,v] of Object.entries(defaults)) setDefault.run(k,v);

const initialProducts = [
  ["Muzzarella","pizzas","Salsa, muzzarella, aceitunas y orégano.",8000,"assets/muzzarella.jpeg",1,1,1],
  ["Jamón y Morrón","pizzas","Muzzarella, jamón y morrón.",10000,"",1,0,2],
  ["Choclo","pizzas","Muzzarella y choclo.",10000,"",1,0,3],
  ["Salame","pizzas","Muzzarella y salame.",10000,"",1,0,4],
  ["Calabresa","pizzas","Muzzarella, calabresa, aceitunas y orégano.",10000,"assets/calabresa.jpeg",1,1,5],
  ["Choclo y Salame","pizzas","Muzzarella, choclo y salame.",10000,"",1,0,6],
  ["Jamón y Choclo","pizzas","Muzzarella, jamón y choclo.",10000,"",1,0,7],
  ["Strogonoff de Pollo","especiales","Strogonoff de pollo con borde relleno incluido.",18000,"",1,0,8],
  ["Calabresa con Borde Relleno","especiales","Calabresa con borde relleno incluido.",15000,"",1,0,9],
  ["Choclo y Salame con Borde Relleno","especiales","Choclo y salame con borde relleno incluido.",15000,"",1,0,10],
  ["Strogonoff de Carne","especiales","Strogonoff de carne con borde relleno incluido.",18000,"",1,0,11]
];
if (db.prepare("SELECT COUNT(*) c FROM products").get().c === 0) {
  const ins = db.prepare(`INSERT INTO products
    (name,category,description,price,image,active,featured,sort_order)
    VALUES (?,?,?,?,?,?,?,?)`);
  const tx = db.transaction(rows => rows.forEach(r => ins.run(...r)));
  tx(initialProducts);
}

app.use(express.json({limit:"2mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "nonna-session-secret-change-me",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:8*60*60*1000}
}));
app.use(express.static(path.join(ROOT,"public")));

function setting(key){ return db.prepare("SELECT value FROM settings WHERE key=?").get(key)?.value ?? ""; }
function allSettings(){
  const rows=db.prepare("SELECT key,value FROM settings").all();
  return Object.fromEntries(rows.map(r=>[r.key,r.value]));
}
function adminOnly(req,res,next){
  if(req.session.admin) return next();
  return res.status(401).json({error:"No autorizado"});
}

const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOAD_DIR),
  filename:(req,file,cb)=>{
    const ext=path.extname(file.originalname).toLowerCase();
    const safe=Date.now()+"-"+Math.random().toString(36).slice(2,8)+ext;
    cb(null,safe);
  }
});
const upload=multer({
  storage,
  limits:{fileSize:4*1024*1024},
  fileFilter:(req,file,cb)=>{
    const ok=["image/jpeg","image/png","image/webp","image/jpg"].includes(file.mimetype);
    cb(ok?null:new Error("Solo JPG, PNG o WEBP"),ok);
  }
});

app.get("/api/public-config",(req,res)=>{
  // La configuración pública debe consultarse siempre desde SQLite, sin caché del navegador/proxy.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.json({
    settings:{
      businessName:setting("business_name"),
      open:setting("open")==="true",
      schedule:setting("schedule"),
      phone:setting("phone"),
      instagram:setting("instagram"),
      latitude:Number(setting("latitude")),
      longitude:Number(setting("longitude")),
      deliveryPrice:Number(setting("delivery_price")),
      cookedExtra:Number(setting("cooked_extra")),
      filledEdgeExtra:Number(setting("filled_edge_extra"))
    },
    products:db.prepare("SELECT id,name,category,description,price,image,active,featured,sort_order FROM products WHERE active=1 ORDER BY category,sort_order,id").all()
  });
});

app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body;
  if(username===ADMIN_USER && password===ADMIN_PASSWORD){
    req.session.admin=true;
    return res.json({ok:true});
  }
  res.status(401).json({error:"Usuario o contraseña incorrectos"});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({authenticated:!!req.session.admin}));

app.put("/api/admin/settings",adminOnly,(req,res)=>{
  const allowed=["business_name","open","schedule","phone","instagram","latitude","longitude","delivery_price","cooked_extra","filled_edge_extra"];

  // sqlite-sync no soporta correctamente UPSERT con ON CONFLICT.
  // Hacemos UPDATE si existe y INSERT si no existe.
  try {
    const update=db.prepare("UPDATE settings SET value=? WHERE key=?");
    const insert=db.prepare("INSERT INTO settings(key,value) VALUES(?,?)");

    for(const k of allowed){
      if(req.body[k]===undefined) continue;
      const value=String(req.body[k]);
      const result=update.run(value,k);
      if(!result || result.changes===0){
        insert.run(k,value);
      }
    }

    res.set("Cache-Control","no-store");
    return res.json({ok:true,settings:allSettings()});
  } catch(error) {
    console.error("Error guardando configuración:",error);
    return res.status(500).json({error:"No se pudo guardar la configuración"});
  }
});

app.post("/api/admin/products",adminOnly,(req,res)=>{
  const {name,category,description="",price=0,image="",active=1,featured=0}=req.body;
  if(!name || !category) return res.status(400).json({error:"Nombre y categoría son obligatorios"});
  const max=db.prepare("SELECT COALESCE(MAX(sort_order),0) m FROM products WHERE category=?").get(category).m;
  const info=db.prepare(`INSERT INTO products(name,category,description,price,image,active,featured,sort_order)
    VALUES(?,?,?,?,?,?,?,?)`).run(name,category,description,Number(price)||0,image,active?1:0,featured?1:0,max+1);
  res.json({ok:true,id:info.lastInsertRowid});
});

app.put("/api/admin/products/:id",adminOnly,(req,res)=>{
  const {name,category,description="",price=0,image="",active=1,featured=0}=req.body;
  db.prepare(`UPDATE products SET name=?,category=?,description=?,price=?,image=?,active=?,featured=? WHERE id=?`)
    .run(name,category,description,Number(price)||0,image,active?1:0,featured?1:0,req.params.id);
  res.json({ok:true});
});

app.delete("/api/admin/products/:id",adminOnly,(req,res)=>{
  const p=db.prepare("SELECT image FROM products WHERE id=?").get(req.params.id);
  if(p?.image?.startsWith("/uploads/")){
    const f=path.join(UPLOAD_DIR,path.basename(p.image));
    if(fs.existsSync(f)) fs.unlinkSync(f);
  }
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.post("/api/admin/upload",adminOnly,upload.single("image"),(req,res)=>{
  if(!req.file) return res.status(400).json({error:"No se recibió imagen"});
  res.json({ok:true,url:"/uploads/"+req.file.filename});
});

app.use((err,req,res,next)=>{
  if(err) return res.status(400).json({error:err.message||"Error"});
  next();
});

app.get("/admin",(req,res)=>res.sendFile(path.join(ROOT,"public","admin.html")));
app.get("*",(req,res)=>{
  if(req.path.startsWith("/api/")) return res.status(404).end();
  res.sendFile(path.join(ROOT,"public","index.html"));
});

app.listen(PORT,()=>console.log(`NONNA PIZZAS funcionando en http://localhost:${PORT}`));
const http = require('http');
//const fs = require('fs');


