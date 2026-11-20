import { useEffect, useState } from 'react';
import AppLock from './AppLock';
import { saveFile, getFiles, deleteFile, exportBackupFiles, restoreBackupFiles } from './fileStorage';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [search, setSearch] = useState('');
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem('mustafa-last-backup') || '');
  const [backupSize, setBackupSize] = useState(() => Number(localStorage.getItem('mustafa-backup-size') || 0));
  const [showTranslator, setShowTranslator] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [view, setView] = useState('home');
  const [openFolder, setOpenFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [items, setItems] = useState(() => {
    const initialItems = [
      { icon: '📁', title: 'معلومات مهمة', kind: 'مجلد', count: '12 عنصر' },
      { icon: '📝', title: 'ملاحظاتي', kind: 'مجلد', count: '8 عناصر' },
      { icon: '🖼️', title: 'الصور والذكريات', kind: 'مجلد', count: '5 عناصر' },
      { icon: '📄', title: 'المستندات', kind: 'مجلد', count: '3 عناصر' }
    ];
    try {
      const saved = localStorage.getItem('mustafa-items');
      return saved ? JSON.parse(saved) : initialItems;
    } catch {
      return initialItems;
    }
  });
  const [dialog, setDialog] = useState('');
  const [name, setName] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mustafa-favorites')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mustafa-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const [trash, setTrash] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mustafa-trash')) || [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem('mustafa-trash', JSON.stringify(trash));
  }, [trash]);
  useEffect(() => {
    try {
      localStorage.setItem('mustafa-items', JSON.stringify(items));
    } catch {}
  }, [items]);

  const [savedFiles, setSavedFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState({});

  useEffect(() => {
    const urls = {};
    savedFiles.forEach(file => {
      urls[file.id] = URL.createObjectURL(file.data);
    });
    setFileUrls(urls);

  return () => Object.values(urls).forEach(url => URL.revokeObjectURL(url));
  }, [savedFiles]);

  async function createBackup() {
    try {
      const backup = {
        app: "Lamostafa",
        version: 1,
        createdAt: new Date().toISOString(),
        data: {
          items,
          favorites,
          trash,
          files: await exportBackupFiles()
        }
      };
      const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "lamostafa-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      localStorage.setItem('mustafa-last-backup', backup.createdAt);
      setLastBackup(backup.createdAt);
      localStorage.setItem('mustafa-backup-size', String(blob.size));
      setBackupSize(blob.size);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      alert("تم إنشاء النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error(error);
      alert("تعذر إنشاء النسخة الاحتياطية");
    }
  }


  async function handleRestoreBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (
        backup.app !== "Lamostafa" ||
        backup.version !== 1 ||
        !backup.data ||
        !Array.isArray(backup.data.items) ||
        !Array.isArray(backup.data.favorites) ||
        !Array.isArray(backup.data.trash) ||
        !Array.isArray(backup.data.files)
      ) {
        throw new Error("ملف النسخة غير صالح أو غير مدعوم");
      }
      if (!window.confirm("سيتم استبدال البيانات الحالية ببيانات النسخة الاحتياطية. هل تريد المتابعة؟")) return;
      await restoreBackupFiles(backup.data.files);
      localStorage.setItem('mustafa-items', JSON.stringify(backup.data.items));
      localStorage.setItem('mustafa-favorites', JSON.stringify(backup.data.favorites));
      localStorage.setItem('mustafa-trash', JSON.stringify(backup.data.trash));
      setItems(backup.data.items);
      setFavorites(backup.data.favorites);
      setTrash(backup.data.trash);
      setSavedFiles(await getFiles());
      alert("تمت استعادة النسخة الاحتياطية بنجاح");
    } catch (error) {
      console.error(error);
      alert("تعذرت استعادة النسخة. لم يتم اعتمادها.");
    } finally {
      event.target.value = "";
    }
  }

  const [fileBusy, setFileBusy] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    getFiles().then(setSavedFiles).catch(() => {
      console.error('تعذر تحميل الملفات المحفوظة');
    });
  }, []);

  async function handleTranslate() {
    if (!sourceText.trim()) {
      alert("اكتب النص الذي تريد ترجمته أولاً");
      return;
    }
    if (sourceLang === targetLang) {
      alert("اختر لغتين مختلفتين");
      return;
    }
    try {
      setIsTranslating(true);
      setTranslatedText("");
      const pair = (sourceLang === "auto" ? "autodetect" : sourceLang) + "|" + targetLang;
      const url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(sourceText) + "&langpair=" + encodeURIComponent(pair);
      const response = await fetch(url);
      if (!response.ok) throw new Error("تعذر الاتصال بخدمة الترجمة");
      const data = await response.json();
      if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
        throw new Error(data.responseDetails || "لم تكتمل الترجمة");
      }
      setTranslatedText(data.responseData.translatedText);
    } catch (error) {
      alert("تعذر إتمام الترجمة. تأكد من الإنترنت وحاول مرة أخرى.");
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setFileBusy(true);
      const targetFolder = file.type.startsWith("image/") ? "الصور والذكريات" : "المستندات";
      await saveFile(file, targetFolder);
      setSavedFiles(await getFiles());
      alert(targetFolder ? 'تم حفظ الملف داخل مجلد: ' + targetFolder : 'تم حفظ الملف في الصفحة الرئيسية');
    } catch (error) {
      alert('تعذر حفظ الملف. قد تكون مساحة التخزين غير كافية.');
    } finally {
      setFileBusy(false);
      e.target.value = '';
    }
  }

  async function removeSavedFile(id) {
    try {
      await deleteFile(id);
      setSavedFiles(await getFiles());
    } catch {
      alert('تعذر حذف الملف');
    }
  }

  function openSavedFile(file) {
    const url = URL.createObjectURL(file.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.target = '_blank';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function addItem() {
    const clean = name.trim();
    if (!clean) return;
    setItems([{ icon: dialog === 'مجلد' ? '📁' : '📝', title: clean, kind: dialog, parent: openFolder, count: dialog === 'مجلد' ? 'مجلد جديد' : 'ملاحظة جديدة' }, ...items]);
    setName('');
    setDialog('');
  }

  const shown = view === 'favorites'
    ? favorites.map(f => items.find(item => item.title === f.title && item.kind === f.kind && item.parent === f.parent)).filter(Boolean).filter(item => item.title.includes(search))
    : items.filter(item => (item.parent ?? null) === openFolder && item.title.includes(search));

  const visibleFiles = view === 'favorites'
    ? []
    : savedFiles.filter(file => (file.folder ?? null) === openFolder);


  function toggleFavorite(item) {
    const exists = favorites.some(f => f.title === item.title && f.kind === item.kind && f.parent === item.parent);
    if (exists) {
      setFavorites(favorites.filter(f => !(f.title === item.title && f.kind === item.kind && f.parent === item.parent)));
    } else {
      setFavorites([...favorites, { ...item }]);
    }
  }

  function moveToTrash(index) {
    const item = items[index];
    if (!item) return;
    setTrash([ { ...item, deletedAt: new Date().toISOString() }, ...trash ]);
    setItems(items.filter((_, i) => i !== index));
  }

  function restoreFromTrash(index) {
    const item = trash[index];
    if (!item) return;
    const { deletedAt, ...restored } = item;
    setItems([restored, ...items]);
    setTrash(trash.filter((_, i) => i !== index));
  }

  function deleteForever(index) {
    setTrash(trash.filter((_, i) => i !== index));
  }

  function saveNote() {
    const clean = name.trim();
    if (!clean) return;
    if (editingNote !== null) {
      setItems(items.map((item, index) =>
        index === editingNote ? { ...item, title: clean, body: noteBody } : item
      ));
    } else {
      setItems([{ icon: '📝', title: clean, kind: 'ملاحظة', parent: openFolder, body: noteBody, count: 'ملاحظة محفوظة' }, ...items]);
    }
    setName('');
    setNoteBody('');
    setEditingNote(null);
  }

  if (!isUnlocked) return <AppLock onUnlock={() => setIsUnlocked(true)} />;

  return (
    <div className="app" dir="rtl">
      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#080808;font-family:Arial,sans-serif}
        .app{min-height:100vh;color:#f5e7b5;background:radial-gradient(ellipse at 50% -15%,#332708 0%,#15120a 38%,#080808 78%);padding:22px 16px 40px}
        .wrap{max-width:760px;margin:auto}
        .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #b58b20;padding:8px 2px 18px}
        .brand{font-size:13px;color:#ffe16b;letter-spacing:1px}
        .mark{border:1px solid #d6aa28;border-radius:14px;padding:9px 12px;color:#ffdf55;font-size:13px;background:#171307}
        .hero{text-align:center;padding:34px 8px 24px}
        .eyebrow{font-size:11px;letter-spacing:3px;color:#e8bd36;margin-bottom:10px}
        h1{font-size:42px;line-height:1.25;margin:0;color:#ffdf32;text-shadow:0 2px 24px #ffd70055}
        .sub{color:#d0c49d;font-size:14px;margin:9px 0 0}
        .search{width:100%;background:#15130d;border:1px solid #80651b;border-radius:15px;padding:15px 17px;color:#fff2bd;font-size:15px;outline:none;margin:8px 0 17px}
        .search:focus{border-color:#ffdf32;box-shadow:0 0 0 3px #ffd70020}
        .actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        button{font:inherit;cursor:pointer}
        .action{border:1px solid #ffe16b;border-radius:15px;padding:15px 10px;background:linear-gradient(145deg,#ffe45c,#c18b08);color:#171000;font-weight:bold;font-size:15px;box-shadow:0 7px 22px #0008}
        .action:active{transform:scale(.98)}
        .action.secondary{background:linear-gradient(145deg,#242014,#11100b);color:#ffdf55;border-color:#a98524}
        .section{display:flex;justify-content:space-between;align-items:center;margin:28px 2px 14px}
        .section h2{font-size:18px;margin:0;color:#ffdf55}
        .section span{font-size:12px;color:#c7b77e}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .grid>.tile:last-child:nth-child(odd){grid-column:1 / -1;width:calc(50% - 6px);justify-self:center}
        .tile{min-height:112px;border:1px solid #78601e;border-radius:18px;padding:15px;background:linear-gradient(145deg,#211c0e,#11100b);box-shadow:0 8px 22px #0007;transition:border-color .2s,transform .2s}
        
        .tile{min-height:155px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;gap:2px;padding:12px 10px}
        .tile .emoji{font-size:23px;margin-bottom:4px}
        .tile h3{min-height:30px;display:flex;align-items:center;justify-content:center;line-height:1.4}
        .tile .action{width:100%;max-width:170px;margin-top:6px!important;padding:6px 10px!important}
        .tile p{font-size:11px;margin:0}
        .tile{position:relative;overflow:hidden}
        .tile:before{content:"";position:absolute;top:0;right:0;width:42px;height:2px;background:#ffe45c;box-shadow:0 0 12px #ffd700}
        .tile:active{transform:scale(.98);border-color:#ffdf32;box-shadow:0 0 18px #ffd70035}
        .tile .emoji{filter:drop-shadow(0 2px 5px #ffd70030)}

        .emoji{font-size:27px;margin-bottom:9px}
        .tile h3{font-size:15px;margin:0 0 6px;color:#ffe9a0}
        .tile p{font-size:12px;color:#c2b58f;margin:0}
        .empty{text-align:center;color:#c9b77d;padding:25px}
        .foot{text-align:center;color:#8e7b48;font-size:11px;margin-top:30px}
        .overlay{position:fixed;inset:0;background:#000d;display:grid;place-items:center;padding:20px;z-index:10}
        .modal{width:100%;max-width:360px;background:linear-gradient(145deg,#211b0c,#100f0a);border:1px solid #d5a928;border-radius:20px;padding:22px;box-shadow:0 20px 60px #000c}
        .modal h3{margin:0 0 16px;color:#ffdf55}
        .modal input,.modal textarea{width:100%;padding:13px;border-radius:10px;border:1px solid #a17d20;background:#0b0a07;color:#fff2bd;font-size:16px}
        .modalbuttons{display:flex;gap:10px;margin-top:15px}
        .modalbuttons button{flex:1;border:1px solid #ffe16b;border-radius:10px;padding:12px;background:#e4bd35;color:#171000;font-weight:bold}
        .modalbuttons .cancel{background:#292316;color:#ffdf55;border-color:#80651b}
        @media(max-width:380px){h1{font-size:35px}.app{padding:16px 12px 30px}}
`}</style>
      <div className="wrap">
        <header className="top">
          <div className="brand">خزنتك الرقمية الخاصة</div>
          <div className="mark">✦ إصدار شخصي</div>
        </header>
        <section className="hero">
          <div className="eyebrow">YOUR PRIVATE DIGITAL VAULT</div>
          <h1>المصطفى</h1>
          <p className="sub">كل ما يهمك... محفوظ في مكان واحد</p>
          <p style={{fontSize:12,color:"#8fd694",marginTop:10}}>● الحفظ التلقائي مفعّل</p>
        </section>
        <button className="action" style={{width:"100%",marginBottom:14}} onClick={() => setShowTranslator(!showTranslator)}>🌐 الترجمة</button>
        {showTranslator && <section style={{padding:16,marginBottom:18,border:"1px solid #b89545",borderRadius:16,background:"#11100b"}}>
          <h2 style={{color:"#f0d58f",textAlign:"center"}}>مترجم المصطفى</h2>
          <label>من اللغة</label>
          <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} style={{width:"100%",padding:12,margin:"8px 0",background:"#201b10",color:"#f5e7b5",border:"1px solid #806738",borderRadius:10}}>
            <option value="auto">اكتشاف اللغة تلقائيًا</option><option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="fr">الفرنسية</option><option value="tr">التركية</option>
          </select>
          <label>إلى اللغة</label>
          <select value={targetLang} onChange={e => setTargetLang(e.target.value)} style={{width:"100%",padding:12,margin:"8px 0",background:"#201b10",color:"#f5e7b5",border:"1px solid #806738",borderRadius:10}}>
            <option value="en">الإنجليزية</option><option value="ar">العربية</option><option value="fr">الفرنسية</option><option value="tr">التركية</option>
          </select>
          <textarea value={sourceText} onChange={e => setSourceText(e.target.value)} placeholder="اكتب النص الذي تريد ترجمته هنا..." rows={5} style={{width:"100%",padding:12,marginTop:10,background:"#080808",color:"#fff",border:"1px solid #806738",borderRadius:10}} />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}><strong style={{color:"#f0d58f"}}>الترجمة</strong><button className="action secondary" onClick={() => setTranslatedText("")}>مسح النتيجة</button></div>
          <div style={{minHeight:90,padding:12,marginTop:8,background:"#080808",border:"1px solid #806738",borderRadius:10,whiteSpace:"pre-wrap"}}>{translatedText || "ستظهر الترجمة هنا"}</div>
          <button className="action" onClick={handleTranslate} disabled={isTranslating} style={{width:"100%",marginTop:14}}>{isTranslating ? "جاري الترجمة..." : "🌐 ترجم الآن"}</button>
          <p style={{fontSize:12,color:"#c8b98e",textAlign:"center"}}>واجهة الترجمة جاهزة، وهنربط خدمة الترجمة الفعلية في الخطوة التالية.</p>
        </section>}
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕  ابحث عن مجلد أو ملاحظة..." />
        <div className="actions">
          <button className="action" onClick={() => setDialog('مجلد')}>＋ إضافة مجلد</button>
          <button className="action secondary" onClick={() => setDialog('ملاحظة')}>✎ ملاحظة جديدة</button>
        </div>

        <div className="actions" style={{marginTop:12}}>
          <label className="action secondary" style={{textAlign:'center'}}>
            🖼️ اختيار صورة
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={fileBusy} style={{display:'none'}} />
          </label>
          <label className="action secondary" style={{textAlign:'center'}}>
            📄 اختيار مستند أو ملف
            <input type="file" onChange={handleFileChange} disabled={fileBusy} style={{display:'none'}} />
          </label>
        </div>
        <button className="action" style={{width:"100%",marginTop:14}} onClick={createBackup}>💾 إنشاء نسخة احتياطية</button>
        <p style={{textAlign:"center",color:"#d6b66b",fontSize:13,marginTop:8}}>{lastBackup ? "آخر نسخة احتياطية: " + new Date(lastBackup).toLocaleString("ar-EG") + (backupSize ? " • الحجم: " + (backupSize / 1024 / 1024).toFixed(2) + " ميجابايت" : "") : "لم يتم إنشاء نسخة احتياطية بعد"}</p>
        <label className="action secondary" style={{width:"100%",marginTop:10,textAlign:"center",display:"block"}}>
          📥 استعادة نسخة احتياطية
          <input type="file" accept="application/json,.json" onChange={handleRestoreBackup} style={{display:"none"}} />
        </label>
        <div className="actions" style={{marginTop:16,marginBottom:16}}> 
          <button className={view === 'home' ? 'action' : 'action secondary'} onClick={() => {setView('home');setOpenFolder(null);setFolderStack([]);}}>⌂ الرئيسية</button>
          <button className={view === 'favorites' ? 'action' : 'action secondary'} onClick={() => {setView('favorites');setOpenFolder(null);setFolderStack([]);}}>★ المفضلة ({favorites.length})</button>
        </div>
        <button className="action secondary" style={{width:'100%',marginTop:12}} onClick={() => setShowTrash(!showTrash)}>
          🗑️ سلة المهملات ({trash.length})
        </button>
        {showTrash && <section style={{marginTop:24,padding:16,border:'1px solid #806738',borderRadius:16,background:'#111a28'}}>
          <h2 style={{color:'#f0d58f'}}>سلة المهملات</h2>
          {trash.length === 0 && <p className="empty">سلة المهملات فارغة</p>}
          {trash.map((item,index) => <div key={index} style={{padding:12,marginTop:10,borderBottom:'1px solid #5d4b2c'}}>
            <strong>{item.icon} {item.title}</strong>
            <div className="modalbuttons">
              <button onClick={() => restoreFromTrash(index)}>استرجاع</button>
              <button className="cancel" onClick={() => deleteForever(index)}>حذف نهائي</button>
            </div>
          </div>)}
        </section>}
        {openFolder && <button className="action secondary" onClick={() => { setOpenFolder(folderStack.length ? folderStack[folderStack.length - 1] : null); setFolderStack(folderStack.slice(0, -1)); }}>← رجوع للمجلدات</button>}
        <div className="section"><h2>{view === "favorites" ? "المفضلة" : openFolder || "مساحتك الخاصة"}</h2><span>{shown.length} عناصر</span></div>
        <div className="grid">
          {shown.map((item, index) => <div className="tile" key={item.title + index} onClick={() => { if (item.kind === 'مجلد') { setFolderStack([...folderStack, openFolder]); setOpenFolder(item.title); } else { setEditingNote(items.indexOf(item)); setName(item.title); setNoteBody(item.body || ''); setDialog('تحرير'); } }} style={{cursor:'pointer'}}>
            <div className="emoji">{item.icon}</div>
            <h3>{item.title}</h3>
            <button
              className="action secondary"
              style={{marginTop:10,padding:'7px 12px',fontSize:13}}
              onClick={e => { e.stopPropagation(); toggleFavorite(item); }}
            >
              {favorites.some(f => f.title === item.title && f.kind === item.kind && f.parent === item.parent) ? '★ في المفضلة' : '☆ أضف للمفضلة'}
            </button>
            <p>{item.count}</p>
            <button className="action secondary" style={{marginTop:12,padding:'8px 12px',fontSize:12}} onClick={e => { e.stopPropagation(); moveToTrash(items.indexOf(item)); }}>🗑️ حذف</button>
          </div>)}
        </div>
        {visibleFiles.length > 0 && <>
          <div className="section">
            <h2>الصور والمستندات</h2>
            <span>{visibleFiles.length} ملفات</span>
          </div>
          <div className="grid">
            {visibleFiles.map(file => <div className="tile" key={file.id} onClick={() => setPreviewFile(file)}>
              {file.type?.startsWith('image/') && fileUrls[file.id] ?
                <img src={fileUrls[file.id]} alt={file.name} style={{width:'100%',height:130,objectFit:'cover',borderRadius:12,marginBottom:10}} />
                : <div className="emoji">{file.type?.startsWith('image/') ? '🖼️' : '📄'}</div>}
              <h3>{file.name}</h3>
              <p>{(file.size / 1024).toFixed(1)} KB</p>
              <button className="action secondary" style={{marginTop:12,padding:'8px 12px',fontSize:12}} onClick={e => {e.stopPropagation();removeSavedFile(file.id);}}>🗑️ حذف الملف</button>
            </div>)}
          </div>
        </>}

        {shown.length === 0 && <div className="empty">لا توجد نتائج مطابقة للبحث</div>}

        <div className="foot">المصطفى · خزنتك الخاصة</div>
      </div>
      {dialog && <div className="overlay" onClick={() => setDialog('')}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>{dialog === 'مجلد' ? 'إنشاء مجلد جديد' : editingNote !== null ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}</h3>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={dialog === 'مجلد' ? 'اكتب اسم المجلد' : 'اكتب عنوان الملاحظة'} />
          {dialog !== 'مجلد' && <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder='اكتب محتوى الملاحظة هنا...' style={{width:'100%',minHeight:180,marginTop:12,padding:13,borderRadius:10,border:'1px solid #8a7042',background:'#0c1421',color:'white',fontSize:16,resize:'vertical'}} />}
          <div className="modalbuttons">
            <button onClick={dialog === 'مجلد' ? addItem : saveNote}>حفظ</button>
            <button className="cancel" onClick={() => {setDialog('');setName('');}}>إلغاء</button>
          </div>
        </div>
      </div>}
      {previewFile && <div className="overlay" onClick={() => setPreviewFile(null)}><div className="modal" onClick={e => e.stopPropagation()}><h3>{previewFile.name}</h3>{previewFile.type?.startsWith("image/") ? <img src={fileUrls[previewFile.id]} alt={previewFile.name} style={{width:"100%",maxHeight:"65vh",objectFit:"contain"}} /> : previewFile.type === "application/pdf" ? <iframe title={previewFile.name} src={fileUrls[previewFile.id]} style={{width:"100%",height:"65vh",border:0,background:"white"}} /> : <p>معاينة هذا النوع من الملفات غير متاحة حاليًا.</p>}<button className="cancel" onClick={() => setPreviewFile(null)}>إغلاق</button></div></div>}
    </div>
  );
}
