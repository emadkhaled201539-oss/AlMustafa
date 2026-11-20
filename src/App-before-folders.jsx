import { useEffect, useState } from 'react';

export default function App() {
  const [search, setSearch] = useState('');
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
  useEffect(() => {
    try {
      localStorage.setItem('mustafa-items', JSON.stringify(items));
    } catch {}
  }, [items]);

  function addItem() {
    const clean = name.trim();
    if (!clean) return;
    setItems([{ icon: dialog === 'مجلد' ? '📁' : '📝', title: clean, kind: dialog, count: dialog === 'مجلد' ? 'مجلد جديد' : 'ملاحظة جديدة' }, ...items]);
    setName('');
    setDialog('');
  }

  const shown = items.filter(item => item.title.includes(search));

  return (
    <div className="app" dir="rtl">
      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#080d18;font-family:Arial,sans-serif}
        .app{min-height:100vh;color:#f7f1df;background:radial-gradient(ellipse at 50% -15%,#27344a 0%,#101827 48%,#080d18 100%);padding:22px 16px 40px}
        .wrap{max-width:760px;margin:auto}
        .top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #9b7b3c;padding:8px 2px 18px}
        .brand{font-size:13px;color:#c8b27d;letter-spacing:2px}
        .mark{border:1px solid #a98745;border-radius:14px;padding:9px 12px;color:#e8c875;font-size:13px}
        .hero{text-align:center;padding:34px 8px 24px}
        .eyebrow{font-size:11px;letter-spacing:3px;color:#c6a65c;margin-bottom:10px}
        h1{font-size:42px;line-height:1.25;margin:0;color:#f0cf78;text-shadow:0 2px 20px #bd914c55}
        .sub{color:#c6c2b7;font-size:14px;margin:9px 0 0}
        .search{width:100%;background:#141e2d;border:1px solid #665431;border-radius:15px;padding:15px 17px;color:#fff;font-size:15px;outline:none;margin:8px 0 17px}
        .search:focus{border-color:#e0bd68;box-shadow:0 0 0 3px #d6ae3a18}
        .actions{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        button{font:inherit;cursor:pointer}
        .action{border:1px solid #c09a4e;border-radius:15px;padding:15px 10px;background:linear-gradient(145deg,#d7b45d,#9b7432);color:#17130b;font-weight:bold;font-size:15px;box-shadow:0 7px 20px #0005}
        .action.secondary{background:linear-gradient(145deg,#202d40,#121b2a);color:#e8c875;border-color:#806738}
        .section{display:flex;justify-content:space-between;align-items:center;margin:28px 2px 14px}
        .section h2{font-size:18px;margin:0;color:#f0d58f}
        .section span{font-size:12px;color:#a9a18e}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .tile{min-height:112px;border:1px solid #5d4b2c;border-radius:16px;padding:15px;background:linear-gradient(145deg,#1b2839,#111a28);box-shadow:0 8px 20px #0003}
        .emoji{font-size:25px;margin-bottom:9px}
        .tile h3{font-size:15px;margin:0 0 6px;color:#f5e8c7}
        .tile p{font-size:12px;color:#aaa28e;margin:0}
        .empty{text-align:center;color:#b9ad91;padding:25px}
        .foot{text-align:center;color:#766d5a;font-size:11px;margin-top:30px}
        .overlay{position:fixed;inset:0;background:#000a;display:grid;place-items:center;padding:20px}
        .modal{width:100%;max-width:360px;background:#172235;border:1px solid #b18a43;border-radius:20px;padding:22px;box-shadow:0 20px 60px #000a}
        .modal h3{margin:0 0 16px;color:#f0d07a}
        .modal input{width:100%;padding:13px;border-radius:10px;border:1px solid #8a7042;background:#0c1421;color:white;font-size:16px}
        .modalbuttons{display:flex;gap:10px;margin-top:15px}
        .modalbuttons button{flex:1;border:0;border-radius:10px;padding:12px;background:#d9b65f;color:#16120a;font-weight:bold}
        .modalbuttons .cancel{background:#29364a;color:#eee}
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
        </section>
        <input className="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕  ابحث عن مجلد أو ملاحظة..." />
        <div className="actions">
          <button className="action" onClick={() => setDialog('مجلد')}>＋ إضافة مجلد</button>
          <button className="action secondary" onClick={() => setDialog('ملاحظة')}>✎ ملاحظة جديدة</button>
        </div>
        <div className="section"><h2>مساحتك الخاصة</h2><span>{items.length} عناصر</span></div>
        <div className="grid">
          {shown.map((item, index) => <div className="tile" key={item.title + index}>
            <div className="emoji">{item.icon}</div><h3>{item.title}</h3><p>{item.count}</p>
          </div>)}
        </div>
        {shown.length === 0 && <div className="empty">لا توجد نتائج مطابقة للبحث</div>}
        <div className="foot">المصطفى · خزنتك الخاصة</div>
      </div>
      {dialog && <div className="overlay" onClick={() => setDialog('')}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>{dialog === 'مجلد' ? 'إنشاء مجلد جديد' : 'إضافة ملاحظة جديدة'}</h3>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder={dialog === 'مجلد' ? 'اكتب اسم المجلد' : 'اكتب عنوان الملاحظة'} />
          <div className="modalbuttons">
            <button onClick={addItem}>حفظ</button>
            <button className="cancel" onClick={() => {setDialog('');setName('');}}>إلغاء</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
