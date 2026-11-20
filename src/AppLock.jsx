import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, AndroidBiometryStrength } from '@aparajita/capacitor-biometric-auth';

async function hashPin(pin, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    key,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

export default function AppLock({ onUnlock }) {
  const [mode, setMode] = useState(() =>
    localStorage.getItem('mustafa-pin-hash') ? 'unlock' : 'setup'
  );
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  async function authenticateBiometric() {
    setError('');
    try {
      const result = await BiometricAuth.checkBiometry();
      if (!result.isAvailable) {
        setError(result.reason || 'البصمة غير متاحة أو غير مسجلة في الهاتف');
        return;
      }
      await BiometricAuth.authenticate({
        reason: 'تحقق من هويتك لفتح خزنة المصطفى',
        allowDeviceCredential: false,
        androidTitle: 'فتح خزنة المصطفى',
        androidSubtitle: 'استخدم وسيلة التحقق البيومتري',
        androidBiometryStrength: AndroidBiometryStrength.weak
      });
      onUnlock();
    } catch (error) {
      setError(error?.message || 'تعذر التحقق من البصمة، استخدم الرقم السري');
    }
  }

  async function submitPin() {
    setError('');
    if (!/^\d{6}$/.test(pin)) {
      setError('اكتب رقمًا سريًا من 6 أرقام');
      return;
    }

    try {
      if (mode === 'setup') {
        if (pin !== confirmPin) {
          setError('الرقمان غير متطابقين');
          return;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const hash = await hashPin(pin, salt);
        localStorage.setItem('mustafa-pin-salt', btoa(String.fromCharCode(...salt)));
        localStorage.setItem('mustafa-pin-hash', hash);
        onUnlock();
      } else {
        const saltText = localStorage.getItem('mustafa-pin-salt');
        const savedHash = localStorage.getItem('mustafa-pin-hash');
        if (!saltText || !savedHash) {
          setError('تعذر قراءة بيانات القفل');
          return;
        }
        const salt = Uint8Array.from(atob(saltText), c => c.charCodeAt(0));
        const hash = await hashPin(pin, salt);
        if (hash === savedHash) onUnlock();
        else setError('الرقم السري غير صحيح');
      }
      setPin('');
      setConfirmPin('');
    } catch {
      setError('المتصفح لا يدعم طريقة الحماية المطلوبة');
    }
  }

  return (
    <div dir="rtl" style={{minHeight:'100vh',background:'#080808',color:'#ffdf55',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Arial'}}>
      <div style={{width:'100%',maxWidth:380,background:'#171307',border:'1px solid #b58b20',borderRadius:22,padding:25,textAlign:'center',boxShadow:'0 10px 35px #000'}}>
        <div style={{fontSize:42,marginBottom:12}}>🔐</div>
        <h2 style={{margin:'0 0 10px'}}>المصطفى</h2>
        <p style={{color:'#d0c49d',fontSize:14}}>{mode === 'setup' ? 'أنشئ رقمك السري لحماية الدخول' : 'أدخل رقمك السري لفتح خزنتك'}</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,6))}
          placeholder="الرقم السري - 6 أرقام"
          style={{width:'100%',padding:15,marginTop:12,borderRadius:12,border:'1px solid #b58b20',background:'#080808',color:'white',fontSize:20,textAlign:'center',letterSpacing:8}}
        />
        {mode === 'setup' && (
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,6))}
            placeholder="أكد الرقم السري"
            style={{width:'100%',padding:15,marginTop:12,borderRadius:12,border:'1px solid #b58b20',background:'#080808',color:'white',fontSize:20,textAlign:'center',letterSpacing:8}}
          />
        )}
        {mode === 'unlock' && Capacitor.isNativePlatform() && <button onClick={authenticateBiometric} style={{width:'100%',padding:14,marginTop:12,border:'1px solid #b58b20',borderRadius:12,background:'#171307',color:'#ffdf55',fontWeight:'bold'}}>🔐 فتح بالبصمة</button>}
        {error && <p style={{color:'#ff8a8a',fontSize:13}}>{error}</p>}
        <button onClick={submitPin} style={{width:'100%',padding:15,marginTop:18,border:0,borderRadius:12,background:'linear-gradient(145deg,#ffe45c,#c18b08)',color:'#171000',fontWeight:'bold',fontSize:16}}>
          {mode === 'setup' ? 'حفظ الرقم وفتح التطبيق' : 'فتح الخزنة'}
        </button>
        <p style={{color:'#a99b75',fontSize:11,marginTop:18}}>تنبيه: قفل الدخول لا يعني تشفير الملفات المخزنة على الجهاز</p>
      </div>
    </div>
  );
}
