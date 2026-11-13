class SoundEngine{
  constructor(){this.ctx=null;this.muted=false}
  init(){if(!this.ctx){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()}
  tone(type,freqs,dur,vol=0.3,step=0.1){
    if(this.muted)return;this.init();if(!this.ctx)return;
    const n=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freqs[0],n);
    freqs.slice(1).forEach((f,i)=>o.frequency.exponentialRampToValueAtTime(f,n+step*(i+1)));
    g.gain.setValueAtTime(vol,n);g.gain.exponentialRampToValueAtTime(0.01,n+dur);
    o.connect(g);g.connect(this.ctx.destination);o.start(n);o.stop(n+dur);
  }
  playCorrect(){this.tone('sine',[523.25,659.25,783.99],0.3)}
  playWrong(){this.tone('sawtooth',[220,110],0.25,0.3,0.2)}
  playCombo(){this.tone('triangle',[659.25,880,1046.5,1318.5],0.45,0.3,0.1)}
  playEnd(){this.tone('sine',[784,659,523,392],0.7,0.3,0.15)}
}
const sound=new SoundEngine();

const ITEMS=[
  ['เปลือกแอปเปิล','green'],['เปลือกกล้วย','green'],['เศษอาหาร','green'],['เศษผัก','green'],['เปลือกไข่','green'],['เปลือกแตงโม','green'],
  ['เปลือกส้ม','green'],['เปลือกมะม่วง','green'],['เปลือกสับปะรด','green'],['เปลือกมะพร้าว','green'],['ข้าวเหลือ','green'],['เส้นก๋วยเตี๋ยว','green'],
  ['ขนมปังเก่า','green'],['ก้างปลา','green'],['กระดูกหมู','green'],['กระดูกไก่','green'],['เปลือกกุ้ง','green'],['เปลือกปู','green'],
  ['ซังข้าวโพด','green'],['เปลือกข้าวโพด','green'],['เปลือกหัวหอม','green'],['เปลือกกระเทียม','green'],['เปลือกมันฝรั่ง','green'],['เปลือกแครอท','green'],
  ['เศษแตงกวา','green'],['เศษผักสลัด','green'],['เมล็ดผลไม้','green'],['ก้านองุ่น','green'],['แกนผลไม้','green'],['เปลือกอะโวคาโด','green'],
  ['กากกาแฟ','green'],['ใบชา','green'],['กากถั่วเหลือง','green'],['เศษเต้าหู้','green'],['ดอกไม้เหี่ยว','green'],['ใบไม้แห้ง','green'],
  ['เศษหญ้า','green'],['กิ่งไม้','green'],
  ['ขวดแก้ว','yellow'],['ขวดซอสแก้ว','yellow'],['โหลแก้ว','yellow'],['กระป๋องอะลูมิเนียม','yellow'],['กระป๋องเหล็ก','yellow'],['หนังสือพิมพ์','yellow'],
  ['กล่องกระดาษ','yellow'],['ขวดพลาสติก PET','yellow'],['ขวดน้ำ PET','yellow'],['ขวดแชมพู','yellow'],['ขวดน้ำยาซักผ้า','yellow'],['ขวดนมพลาสติก','yellow'],
  ['กล่องอาหารพลาสติก','yellow'],['ถาดพลาสติก','yellow'],['ลังพลาสติก','yellow'],['ถังพลาสติก','yellow'],['ฝาขวดพลาสติก','yellow'],['กระดาษสำนักงาน','yellow'],
  ['นิตยสาร','yellow'],['หนังสือเก่า','yellow'],['สมุดเก่า','yellow'],['ถุงกระดาษ','yellow'],['กล่องเครื่องดื่ม UHT','yellow'],['กล่องน้ำผลไม้','yellow'],
  ['แกนทิชชู่','yellow'],['กล่องไข่กระดาษ','yellow'],['ซองจดหมาย','yellow'],['แผ่นพับโฆษณา','yellow'],['กระป๋องกาแฟ','yellow'],['กระป๋องเครื่องดื่ม','yellow'],
  ['ฝาโลหะ','yellow'],['ช้อนโลหะ','yellow'],['ลวดโลหะ','yellow'],['หม้อโลหะเก่า','yellow'],['ถาดอะลูมิเนียม','yellow'],['ขวดน้ำมันพืช','yellow'],
  ['ขวดน้ำอัดลม PET','yellow'],['กล่องกระดาษลูกฟูก','yellow'],
  ['ถุงขนม','blue'],['ทิชชู่ใช้แล้ว','blue'],['กล่องโฟม','blue'],['แปรงสีฟัน','blue'],['ถุงเท้าเก่า','blue'],['ห่อลูกอม','blue'],
  ['หลอดพลาสติก','blue'],['แก้วพลาสติกใช้แล้ว','blue'],['จานพลาสติกใช้แล้ว','blue'],['ช้อนส้อมพลาสติก','blue'],['ถุงพลาสติก','blue'],['ซองเครื่องดื่ม','blue'],
  ['ซองบะหมี่','blue'],['ซองเครื่องปรุง','blue'],['ซองขนม','blue'],['ฟองน้ำเก่า','blue'],['ไม้กวาดเก่า','blue'],['มีดโกนพลาสติก','blue'],
  ['ไหมขัดฟันใช้แล้ว','blue'],['ซองเติมผลิตภัณฑ์','blue'],['พลาสติกห่อเปื้อน','blue'],['กล่องพิซซ่าเปื้อน','blue'],['กล่องอาหารเปื้อน','blue'],['แก้วกระดาษ','blue'],
  ['ฝาแก้วใช้แล้ว','blue'],['กระดาษเปื้อนอาหาร','blue'],['ซองสบู่เปล่า','blue'],['กระดาษห่อเคลือบ','blue'],['เศษกระจกแตก','blue'],['ถ้วยเซรามิกแตก','blue'],
  ['จานชามแตก','blue'],['กระถางแตก','blue'],['ตุ๊กตาเก่า','blue'],['รองเท้าเก่า','blue'],['กระเป๋าเก่า','blue'],['ปากกาหมึกหมด','blue'],
  ['แฟ้มพลาสติก','blue'],
  ['ถ่านไฟฉาย','red'],['หลอดไฟ','red'],['ยาหมดอายุ','red'],['โทรศัพท์เสีย','red'],['สารเคมี','red'],
  ['แบตเตอรี่ก้อน','red'],['แบตลิเธียม','red'],['แบตโน้ตบุ๊ก','red'],['สายชาร์จชำรุด','red'],['หูฟังเสีย','red'],['เมาส์เสีย','red'],
  ['คีย์บอร์ดเสีย','red'],['จอเสีย','red'],['เครื่องคิดเลขเสีย','red'],['กล้องเสีย','red'],['นาฬิกาดิจิทัลเสีย','red'],['ถังดับเพลิงเก่า','red'],
  ['กระป๋องสเปรย์','red'],['ภาชนะน้ำมันเครื่อง','red'],['ขวดน้ำยาทำความสะอาด','red'],['ขวดน้ำยาฆ่าเชื้อ','red'],['น้ำยาล้างห้องน้ำ','red'],['กระป๋องสี','red'],
  ['ทินเนอร์','red'],['น้ำมันเครื่องใช้แล้ว','red'],['น้ำยาฆ่าแมลง','red'],['กระป๋องยาฆ่าแมลง','red'],['ขวดน้ำยาฟอกขาว','red'],['ปรอทวัดไข้','red'],
  ['เข็มฉีดยาใช้แล้ว','red'],['กระบอกฉีดยาใช้แล้ว','red'],['ชุดตรวจใช้แล้ว','red'],['ขวดยาใช้แล้ว','red'],['ขวดน้ำยาล้างเล็บ','red'],['น้ำยาล้างเล็บ','red'],
  ['ถ่านกระดุม','red'],['พาวเวอร์แบงก์เก่า','red']
];
const WASTE_ART={
  apple:'<path fill="var(--a)" d="M60 28c-9-9-24-3-29 9-7 17 4 39 15 43 6 2 9-2 14-2s9 4 15 2c11-4 22-26 15-43-5-12-20-18-29-9-3 3-3 3-6 0Z"/><path fill="var(--b)" d="M61 25c-1-8 2-14 8-18 1 7-1 13-8 18Z"/><path fill="var(--c)" d="M62 23c7-8 15-8 21-4-7 6-14 7-21 4Z"/><path d="M54 43c-4 7-4 15-1 20" fill="none" stroke="#fff" stroke-width="4" opacity=".65"/>',
  banana:'<path fill="var(--a)" d="M25 23c9 20 20 34 36 42 13 6 25 4 36-4 2 12-4 20-17 23-23 4-48-13-60-42-5-12-7-21-3-24 2-2 5 0 8 5Z"/><path fill="var(--b)" d="m21 19 11-5 6 12-11 5Zm72 40 11 2-3 10-12-3Z"/><path d="M37 39c11 16 24 26 39 29" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>',
  orange:'<circle cx="58" cy="50" r="31" fill="var(--a)"/><path d="M57 18c1-8 7-12 15-12-2 8-7 12-15 12Z" fill="var(--b)"/><path d="M58 22v-6" fill="none" stroke="#4b5148" stroke-width="3"/><path d="M73 33c11 12 13 27 5 39" fill="none" stroke="#fff" stroke-width="4" opacity=".55"/>',
  mango:'<path fill="var(--a)" d="M59 18c18 2 33 18 29 39-4 19-20 33-37 29-18-4-26-22-18-42 5-13 13-22 26-26Z"/><path fill="var(--b)" d="M58 20c1-7 6-11 13-13-1 8-5 12-13 13Z"/><path d="M46 35c-7 12-8 24-2 33" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>',
  pineapple:'<path fill="var(--a)" d="M60 27c19 0 27 14 25 34-2 18-11 29-25 29S37 79 35 61c-2-20 6-34 25-34Z"/><path fill="var(--b)" d="M60 29 48 14l5 1-7-11 13 12 1-12 5 14 10-10-4 15Z"/><path d="m43 43 34 31M77 43 43 74M38 57h44M46 36l28 39" fill="none" stroke="var(--c)" stroke-width="3" opacity=".85"/>',
  avocado:'<path fill="var(--a)" d="M60 14c9 0 13 12 20 24 11 18 15 32 6 43-12 15-40 15-52 0-9-11-5-25 6-43 7-12 11-24 20-24Z"/><circle cx="60" cy="63" r="13" fill="var(--b)"/><circle cx="56" cy="59" r="4" fill="#fff" opacity=".55"/>',
  fruit:'<path fill="var(--a)" d="M60 20c17 0 29 13 28 31-1 19-13 33-28 33S32 70 32 51c0-18 11-31 28-31Z"/><path fill="var(--b)" d="M60 20c0-8 5-13 13-16-1 8-5 13-13 16Z"/><path fill="var(--c)" d="M62 18c7-7 15-7 20-3-7 5-13 6-20 3Z"/><path d="M45 37c-5 8-6 17-2 24" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>',
  watermelon:'<path fill="var(--b)" d="M22 38Q60 7 98 38L60 84Z"/><path fill="#f3e8c7" d="M27 39Q60 15 93 39L60 78Z"/><path fill="var(--a)" d="M32 40Q60 20 88 40L60 73Z"/><path fill="#303d32" d="M48 44c4-6 8-6 8 0s-4 8-8 0Zm17 2c4-6 8-6 8 0s-4 8-8 0Zm-9 14c4-6 8-6 8 0s-4 8-8 0Z"/>',
  coconut:'<circle cx="60" cy="55" r="34" fill="var(--a)"/><circle cx="60" cy="55" r="25" fill="var(--b)"/><path d="m48 39 5 5m11-7 2 5m-23 23 4 2m25 8 4 1" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="49" r="3" fill="var(--c)"/><circle cx="68" cy="48" r="3" fill="var(--c)"/>',
  grapes:'<g fill="var(--a)"><circle cx="51" cy="42" r="13"/><circle cx="69" cy="42" r="13"/><circle cx="42" cy="59" r="13"/><circle cx="60" cy="59" r="13"/><circle cx="78" cy="59" r="13"/><circle cx="51" cy="76" r="13"/><circle cx="69" cy="76" r="13"/></g><path d="M60 30c-1-10 4-16 13-20m-11 12c-8-7-16-7-23-3 5 8 13 10 23 3Z" fill="var(--b)"/>',
  seeds:'<path fill="var(--a)" d="M41 35c14-8 35-8 45 4l-6 34c-12 17-33 17-46 0Z"/><g fill="var(--b)"><ellipse cx="50" cy="47" rx="3" ry="5"/><ellipse cx="68" cy="45" rx="3" ry="5"/><ellipse cx="59" cy="58" rx="3" ry="5"/><ellipse cx="47" cy="67" rx="3" ry="5"/><ellipse cx="72" cy="68" rx="3" ry="5"/></g><path d="M44 40c8-6 23-8 33-2" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>',
  pear:'<path fill="var(--a)" d="M60 20c-10 0-12 13-15 23-8 9-17 18-14 31 3 14 15 21 29 21s26-7 29-21c3-13-6-22-14-31-3-10-5-23-15-23Z"/><path fill="var(--b)" d="M60 21c-1-8 3-13 11-17-1 8-5 13-11 17Z"/><path d="M45 48c-6 8-8 16-5 23" fill="none" stroke="#fff" stroke-width="4" opacity=".65"/>',
  potato:'<path fill="var(--a)" d="M32 52c0-18 15-30 34-28 18 2 28 13 25 30-2 17-15 30-34 28-17-1-25-12-25-30Z"/><g fill="var(--b)"><ellipse cx="47" cy="43" rx="3" ry="2"/><ellipse cx="72" cy="38" rx="3" ry="2"/><ellipse cx="58" cy="62" rx="3" ry="2"/><ellipse cx="78" cy="66" rx="3" ry="2"/></g>',
  beans:'<g fill="var(--a)"><ellipse cx="44" cy="43" rx="13" ry="8" transform="rotate(-35 44 43)"/><ellipse cx="67" cy="35" rx="13" ry="8" transform="rotate(25 67 35)"/><ellipse cx="76" cy="57" rx="13" ry="8" transform="rotate(-28 76 57)"/><ellipse cx="52" cy="66" rx="13" ry="8" transform="rotate(20 52 66)"/></g><path d="M38 43c5-4 9-5 13-4m10-6c5 0 9 2 12 5m-3 17c5-4 9-5 13-4m-37 11c5-4 9-5 13-4" fill="none" stroke="var(--b)" stroke-width="2.5"/>',
  straw:'<path d="M49 83V37h27V24" fill="none" stroke="var(--a)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M54 78V43h17V25" fill="none" stroke="#fff" stroke-width="3" opacity=".65"/>',
  pot:'<path fill="var(--a)" d="M35 42h50c-2 27-9 40-25 40S37 69 35 42Z"/><path fill="var(--b)" d="M30 34h60v11H30z"/><path d="M34 59h-9m61 0h9M48 51v23m24-23v23" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>',
  cleaner:'<path fill="var(--a)" d="M42 35h39v49c0 7-7 11-20 11s-19-4-19-11Z"/><path fill="var(--b)" d="M50 24h18v13H50Zm11-10h18v8H61z"/><path d="M69 17h17l6 8m-43 25h30v19H43z" fill="var(--c)"/><path d="M51 31h18" stroke="#fff" stroke-width="3"/>',
  extinguisher:'<path fill="var(--a)" d="M42 35h36v48c0 8-7 12-18 12S42 91 42 83Z"/><path fill="var(--b)" d="M51 25h18v12H51z"/><path d="M60 27c0-12 15-14 23-7l5 8M54 22h12m-5-5v12" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/><path fill="var(--c)" d="M47 48h26v22H47z"/><path d="M60 52v14m-7-7h14" stroke="#fff" stroke-width="3"/>',
  nailPolish:'<path fill="var(--a)" d="M43 40h34v42c0 8-7 12-17 12S43 90 43 82Z"/><path fill="var(--b)" d="M51 21h18v23H51z"/><path d="M48 56h24v17H48z" fill="var(--c)"/><path d="M56 26v14m8-14v14" stroke="#fff" stroke-width="2" opacity=".7"/>',
  razor:'<path fill="var(--a)" d="M37 24h46v18H37z"/><path fill="var(--b)" d="M53 41h14v43c0 8-14 8-14 0Z"/><path d="M44 29v8m10-8v8m12-8v8m10-8v8" stroke="var(--c)" stroke-width="3"/>',
  oil:'<path fill="var(--a)" d="M37 31h46v52c0 7-7 11-23 11s-23-4-23-11Z"/><path fill="var(--b)" d="M48 22h24v11H48z"/><path d="M41 48h38v22H41z" fill="var(--c)"/><path d="M50 27h20" stroke="#fff" stroke-width="3"/>',
  leafy:'<path fill="var(--a)" d="M24 78c1-32 19-52 49-58 6 27-7 49-38 62-4 2-8 1-11-4Z"/><path fill="var(--b)" d="M39 81c6-29 25-43 55-43 1 26-14 44-44 51-5 1-9-2-11-8Z"/><path d="M31 78c15-19 27-31 39-42M43 83c15-17 27-26 42-31" fill="none" stroke="#f4f2dc" stroke-width="3"/>',
  carrot:'<path fill="var(--a)" d="M37 29c13 7 28 12 44 14l-25 44c-3 6-10 6-11 0L31 42c-2-6 0-11 6-13Z"/><path fill="var(--b)" d="M45 30c-7-11-4-20 3-26 6 8 6 15 2 24 4-13 13-18 22-16-3 10-10 16-22 20Z"/><path d="m40 45 15 4m-10 8 10 3" fill="none" stroke="var(--c)" stroke-width="3"/>',
  corn:'<path fill="var(--a)" d="M48 23c17-7 31 7 30 31-1 19-10 34-21 34S36 70 36 52c0-14 3-24 12-29Z"/><path fill="var(--b)" d="M44 76c-18-8-21-26-15-42 7 4 13 14 15 27-3-23 4-37 18-44 3 19-4 40-18 59Zm26 4c18-11 20-28 13-44-8 7-11 17-11 30 1-22-4-34-17-41-5 19 1 39 15 55Z"/><path d="M47 36v39m9-43v45m9-42v38" fill="none" stroke="var(--c)" stroke-width="2.5"/>',
  onion:'<path fill="var(--a)" d="M60 17c7 12 25 20 25 39 0 19-11 33-25 33S35 75 35 56c0-19 18-27 25-39Z"/><path d="M60 19c-4-6-4-11-2-15m4 15c5-6 6-11 4-15M46 43c-5 9-5 20 1 28m13-37v43m13-34c5 9 5 19-1 27" fill="none" stroke="var(--b)" stroke-width="3"/>',
  egg:'<path fill="var(--a)" d="M60 15c15 0 29 25 29 46 0 18-12 29-29 29S31 79 31 61c0-21 14-46 29-46Z"/><path d="M44 45c-3 7-4 14-2 20" fill="none" stroke="#fff" stroke-width="4" opacity=".65"/>',
  rice:'<path fill="var(--a)" d="M31 51h58c-2 23-12 36-29 36S33 74 31 51Z"/><path fill="var(--b)" d="M28 49c2-12 14-18 31-18s29 6 31 18H28Z"/><path d="M40 43c5-4 8 4 13 0s8 4 13 0 8 4 13 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  noodles:'<path fill="var(--a)" d="M33 53h54c-2 20-11 32-27 32S35 73 33 53Z"/><path d="M40 52c-8-14 11-18 3-31m13 31c-8-13 11-20 2-34m11 34c-6-12 11-18 5-29m7 29c-4-9 5-14 3-21" fill="none" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/>',
  bread:'<path fill="var(--a)" d="M31 48c0-15 12-25 29-25s29 10 29 25v25c0 8-7 13-15 13H46c-8 0-15-5-15-13V48Z"/><path fill="var(--b)" d="M43 47c2-8 8-12 17-12s15 4 17 12Z"/><path d="M43 61h34" fill="none" stroke="var(--c)" stroke-width="3"/>',
  fishbone:'<path d="M30 50h53m-43 0-12-13m12 13-12 13m26-13-10-12m10 12-10 12m26-12-10-10m10 10-10 10" fill="none" stroke="var(--a)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="m81 50 12-12v24Z" fill="var(--b)"/><circle cx="31" cy="50" r="5" fill="var(--b)"/>',
  bone:'<path fill="var(--a)" d="M36 35c5 0 8 3 10 7l28 17c4-2 8-2 12 2 6 6 3 14-3 17-5 3-10 1-13-3L41 58c-4 3-9 3-13-1-6-5-4-13 2-17-3-6 0-13 6-15Z"/><path d="m46 44 28 17" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>',
  shell:'<path fill="var(--a)" d="M30 66c4-21 17-34 30-34s26 13 30 34c-13 12-47 12-60 0Z"/><path d="M60 34v38M45 39l10 34m20-34L65 73M34 57l21 14m35-14L65 71" fill="none" stroke="var(--b)" stroke-width="3"/>',
  branch:'<path d="M31 82c19-20 34-39 56-64M45 67 34 47m26 0 16 1m-4-13-2-19m-4 41 22-7" fill="none" stroke="var(--a)" stroke-width="7" stroke-linecap="round"/><path fill="var(--b)" d="M29 43c-1-11 7-18 19-18-2 12-8 18-19 18Zm43-13c-1-11 7-18 19-18-2 12-8 18-19 18Zm9 30c3-10 12-13 22-9-6 10-13 13-22 9Z"/>',
  flower:'<path d="M60 47v38m-1-13c-12-12-21-5-20 2 8 5 15 4 20-2" fill="none" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/><g fill="var(--a)"><ellipse cx="60" cy="25" rx="9" ry="15"/><ellipse cx="60" cy="25" rx="9" ry="15" transform="rotate(72 60 39)"/><ellipse cx="60" cy="25" rx="9" ry="15" transform="rotate(144 60 39)"/><ellipse cx="60" cy="25" rx="9" ry="15" transform="rotate(216 60 39)"/><ellipse cx="60" cy="25" rx="9" ry="15" transform="rotate(288 60 39)"/></g><circle cx="60" cy="39" r="7" fill="#f3c94c"/>',
  coffee:'<path fill="var(--a)" d="M34 40h48l-5 38c-1 7-7 11-19 11S40 85 39 78Z"/><path d="M82 48h7c12 0 12 20 0 20h-8" fill="none" stroke="var(--b)" stroke-width="6"/><path d="M40 51h36" stroke="var(--c)" stroke-width="5"/><path d="M50 30c-5-6 5-7 0-14m13 14c-5-6 5-7 0-14" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>',
  tea:'<path fill="var(--a)" d="M33 50h53c-2 23-11 35-26 35S36 73 33 50Z"/><path d="M86 56h6c11 0 11 17 0 17h-9M60 50V26m-8 1c0-9 16-9 16 0s-16 9-16 0Z" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/>',
  bottle:'<path fill="var(--a)" d="M51 15h18v13l7 7v43c0 7-5 11-11 11H55c-6 0-11-4-11-11V35l7-7Z"/><path fill="var(--b)" d="M50 13h20v10H50z"/><path d="M47 48h25v25H47z" fill="var(--c)" opacity=".8"/><path d="M51 38h18" stroke="#fff" stroke-width="3" opacity=".65"/>',
  glassBottle:'<path fill="var(--a)" d="M52 14h16v13l8 9v43c0 6-4 10-10 10H54c-6 0-10-4-10-10V36l8-9Z"/><path fill="var(--b)" d="M51 12h18v9H51z"/><path d="M49 42h22v28H49z" fill="var(--c)" opacity=".7"/><path d="M54 34v46" stroke="#fff" stroke-width="3" opacity=".7"/>',
  jar:'<path fill="var(--a)" d="M40 33h40l5 11v35c0 7-5 11-12 11H47c-7 0-12-4-12-11V44Z"/><path fill="var(--b)" d="M38 25h44v11H38z"/><path d="M43 47h34v27H43z" fill="var(--c)" opacity=".75"/><path d="M45 40h30" stroke="#fff" stroke-width="3"/>',
  can:'<path fill="var(--a)" d="M39 28c0-6 9-10 21-10s21 4 21 10v52c0 7-9 11-21 11S39 87 39 80Z"/><ellipse cx="60" cy="28" rx="21" ry="8" fill="var(--b)"/><path d="M40 38h40v29H40z" fill="var(--c)" opacity=".8"/><path d="M48 24h24m-23 60h22" stroke="#fff" stroke-width="3" opacity=".8"/>',
  paper:'<path fill="var(--a)" d="M34 30h43l12 12v41H34Z"/><path fill="var(--b)" d="M77 30v13h12"/><path d="M44 52h34m-34 9h34m-34 9h24" stroke="var(--c)" stroke-width="3"/>',
  newspaper:'<path fill="var(--a)" d="m32 33 48-8 9 48-48 9Z"/><path fill="var(--b)" d="m40 41 14-3 2 11-14 3Zm19-4 20-3 1 4-20 3Zm2 9 20-3 1 4-20 3Zm-16 10 30-5 1 4-30 5Zm2 9 31-5 1 4-31 5Z"/>',
  box:'<path fill="var(--a)" d="m31 42 29-16 29 16v37L60 94 31 79Z"/><path fill="var(--b)" d="m31 42 29 16 29-16-29-16Z"/><path d="M60 58v36M45 34l29 16" fill="none" stroke="var(--c)" stroke-width="4"/>',
  carton:'<path fill="var(--a)" d="m40 34 13-15h25l12 15v52H40Z"/><path fill="var(--b)" d="M53 19 48 34h42L78 19Z"/><path d="M49 48h32v24H49z" fill="var(--c)" opacity=".8"/><path d="M61 22v9" stroke="#fff" stroke-width="3"/>',
  container:'<path fill="var(--a)" d="M34 40h52l-5 42c-1 7-7 10-21 10S40 89 39 82Z"/><path fill="var(--b)" d="M31 32h58v12H31z"/><path d="M43 53h34v22H43z" fill="var(--c)" opacity=".8"/><path d="M45 47v30m30-30v30" stroke="#fff" stroke-width="3" opacity=".55"/>',
  bucket:'<path fill="var(--a)" d="M33 35h54l-7 51c-1 6-8 9-20 9s-19-3-20-9Z"/><path fill="var(--b)" d="M30 29h60v11H30z"/><path d="M40 37c0-25 40-25 40 0" fill="none" stroke="var(--c)" stroke-width="4"/>',
  cap:'<path fill="var(--a)" d="M39 42c0-12 8-20 21-20s21 8 21 20v17H39Z"/><path fill="var(--b)" d="M35 58h50v12H35z"/><path d="M46 28v13m14-19v19m14-13v13" stroke="var(--c)" stroke-width="3"/>',
  metal:'<path d="M39 25v27m-8-27v14c0 8 16 8 16 0V25m-8 27v33m27-60c-13 8-13 28 0 32v28m0-60v32" fill="none" stroke="var(--a)" stroke-width="6" stroke-linecap="round"/><path d="M33 29v11m43-7v15" stroke="#fff" stroke-width="2" opacity=".7"/>',
  soapSachet:'<path fill="var(--a)" d="M40 17h40l7 8-3 7 3 43-7 8H40l-7-8 3-43-3-7Z"/><path d="M38 29h44M38 75h44" fill="none" stroke="var(--b)" stroke-width="3"/><path d="M42 20v7m8-7v7m10-7v7m10-7v7m8-7v7m-36 49v7m8-7v7m10-7v7m10-7v7m8-7v7" fill="none" stroke="var(--b)" stroke-width="2" opacity=".8"/><path d="M60 38c-7 9-11 14-11 20a11 11 0 0 0 22 0c0-6-4-11-11-20Z" fill="var(--c)" stroke="var(--c)" stroke-width="2"/><path d="M56 59c0 3 2 5 5 6" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>',
  wrapper:'<path fill="var(--a)" d="M37 20h46l5 8-4 9 4 41-6 8H38l-6-8 4-41-4-9Z"/><path d="M37 29h46M37 78h46" fill="none" stroke="var(--b)" stroke-width="3"/><path fill="var(--c)" d="M47 41h26v27H47Z"/><path d="m53 59 5-10 5 10 5-7 4 10H51Zm-10-28v6m8-6v6m8-6v6m8-6v6m8-6v6m-32 35v6m8-6v6m8-6v6m8-6v6m8-6v6" fill="none" stroke="var(--b)" stroke-width="2" stroke-linecap="round"/>',
  tissue:'<path fill="var(--a)" d="M34 42c0-13 13-22 27-22s25 9 25 22v34c0 11-9 17-25 17S34 87 34 76Z"/><path fill="var(--b)" d="M47 47c2-12 9-18 18-18 8 0 13 6 13 14-11 4-19 11-26 21-5-4-7-10-5-17Z"/><path d="M45 70c9 5 20 5 31-1" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>',
  foam:'<path fill="var(--a)" d="M35 39h50v39c0 8-6 12-25 12S35 86 35 78Z"/><path fill="var(--b)" d="M30 32h60v12H30z"/><path d="M43 52h34v21H43z" fill="var(--c)" opacity=".65"/><circle cx="48" cy="82" r="2" fill="#fff"/><circle cx="72" cy="84" r="2" fill="#fff"/>',
  brush:'<path fill="var(--a)" d="M50 39h20v47c0 5-4 8-10 8s-10-3-10-8Z"/><path fill="var(--b)" d="M43 20h34v27H43z"/><path d="M48 22v12m9-12v12m9-12v12m9-12v12" stroke="var(--c)" stroke-width="3"/>',
  sock:'<path fill="var(--a)" d="M43 19h27v34c0 8-5 13-12 20l-8 8h30c7 0 10 10 2 14H33c-9 0-13-9-7-16l15-16c3-3 4-6 4-11V19Z"/><path fill="var(--b)" d="M43 19h27v11H43Z"/><path d="M43 26h27M50 73l-8 8m28 0h8" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><path fill="var(--c)" d="m36 88 8-7 8 7-7 5h-6Z"/>',
  cup:'<path fill="var(--a)" d="M38 36h41l-5 46c-1 7-6 10-16 10S43 89 42 82Z"/><path d="M79 46h8c12 0 12 19 0 19h-9" fill="none" stroke="var(--b)" stroke-width="6"/><path fill="var(--c)" d="M40 42h37v10H40z"/><path d="M51 28h17" stroke="#fff" stroke-width="3" opacity=".7"/>',
  plate:'<ellipse cx="60" cy="56" rx="36" ry="27" fill="var(--a)"/><ellipse cx="60" cy="55" rx="24" ry="16" fill="var(--b)"/><path d="m41 73 12-8m15 5 8-9" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>',
  cutlery:'<path d="M39 22v23m-8-23v12c0 9 16 9 16 0V22m-8 23v39m31-62v62m0-62c-13 9-13 28 0 32" fill="none" stroke="var(--a)" stroke-width="6" stroke-linecap="round"/><path d="M69 30v17" stroke="var(--b)" stroke-width="3"/>',
  bag:'<path fill="var(--a)" d="M35 36c0-8 8-12 25-12s25 4 25 12v43c0 8-8 13-25 13S35 87 35 79Z"/><path d="M46 38c0-20 28-20 28 0" fill="none" stroke="var(--b)" stroke-width="5"/><path d="M45 50c8 5 22 5 30 0" fill="none" stroke="var(--c)" stroke-width="3"/>',
  sponge:'<path fill="var(--a)" d="M34 38c0-7 6-12 13-12h29c7 0 12 5 12 12v38c0 8-5 13-13 13H47c-8 0-13-5-13-13Z"/><path d="M46 45h2m14-4h2m14 7h2M42 63h2m17 4h2m13-4h2M49 78h2m18 2h2" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/>',
  broom:'<path d="m69 23-26 52" stroke="var(--a)" stroke-width="8" stroke-linecap="round"/><path fill="var(--b)" d="m39 68 31 15-7 12-33-16Z"/><path d="m41 74-8 12m16-9-6 12m17-8-5 12" stroke="var(--c)" stroke-width="3"/>',
  shards:'<path fill="var(--a)" d="m30 73 11-41 19 23 12-32 18 49-25-10-14 23Z"/><path fill="var(--b)" d="m41 32 9 23 10 0Z"/><path d="m61 55 11-32 4 37" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>',
  ceramic:'<path fill="var(--a)" d="M31 47h58c-2 23-12 37-29 37S33 70 31 47Z"/><path d="M89 54h7c9 0 9 15 0 15h-9M60 51 49 69l14 3-8 9" fill="none" stroke="var(--b)" stroke-width="4" stroke-linejoin="round"/>',
  toy:'<circle cx="60" cy="35" r="21" fill="var(--a)"/><circle cx="42" cy="20" r="9" fill="var(--a)"/><circle cx="78" cy="20" r="9" fill="var(--a)"/><ellipse cx="60" cy="70" rx="26" ry="20" fill="var(--a)"/><circle cx="53" cy="34" r="2.5" fill="#313b34"/><circle cx="67" cy="34" r="2.5" fill="#313b34"/><ellipse cx="60" cy="42" rx="6" ry="4" fill="var(--b)"/>',
  shoe:'<path fill="var(--a)" d="M39 25h24c0 18 8 28 25 35 9 4 12 10 10 18H31c-8 0-11-10-5-16l17-16Z"/><path fill="var(--b)" d="M31 69h65v11H31z"/><path d="m52 48 17 5m-13-12 18 6" stroke="var(--c)" stroke-width="3"/>',
  suitcase:'<path fill="var(--a)" d="M34 32h52v53H34Z"/><path d="M47 32V24c0-9 26-9 26 0v8m-13 0v53" fill="none" stroke="var(--b)" stroke-width="5"/><path d="M34 46h8v13h-8m44-13h8v13h-8" fill="var(--c)"/>',
  pen:'<path fill="var(--a)" d="m43 76 9 9 38-41-9-9Z"/><path fill="var(--b)" d="m39 80 13 8-17 9Z"/><path d="m79 35 9-9 9 9-9 9" fill="var(--c)"/>',
  folder:'<path fill="var(--a)" d="M29 37h30l8 9h25v39H29Z"/><path fill="var(--b)" d="M29 45h63v40H29Z"/><path d="M39 54h43v23H39Z" fill="var(--c)" opacity=".65"/>',
  battery:'<rect x="34" y="34" width="52" height="46" rx="8" fill="var(--a)"/><path fill="var(--b)" d="M50 25h20v10H50z"/><path d="M60 42 49 59h10l-2 13 15-20H62Z" fill="var(--c)"/><path d="M43 37v39m36-39v39" stroke="#fff" stroke-width="3" opacity=".4"/>',
  bulb:'<path fill="var(--a)" d="M60 15c-18 0-28 13-25 29 2 10 10 15 12 25h26c2-10 10-15 12-25 3-16-7-29-25-29Z"/><path fill="var(--b)" d="M47 70h26v8H47zm4 9h18v7H51zm4 8h10v5H55z"/><path d="M60 28v23m-13-9 9 11m17-11-9 11" fill="none" stroke="var(--c)" stroke-width="3"/>',
  pill:'<g transform="rotate(-32 60 56)"><rect x="35" y="39" width="50" height="34" rx="17" fill="var(--a)"/><path d="M60 40v32" stroke="var(--b)" stroke-width="4"/><path d="M43 50c4-5 9-6 14-5" fill="none" stroke="#fff" stroke-width="3"/></g>',
  phone:'<rect x="39" y="15" width="42" height="72" rx="8" fill="var(--a)"/><rect x="44" y="23" width="32" height="49" rx="3" fill="var(--b)"/><path d="m53 36 9 9-8 10 13 8" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="79" r="3" fill="#fff"/>',
  device:'<rect x="29" y="28" width="62" height="49" rx="7" fill="var(--a)"/><rect x="36" y="35" width="48" height="34" rx="3" fill="var(--b)"/><path d="m49 48 7 7-7 7m13 0h8" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path d="M49 80h22" stroke="var(--a)" stroke-width="6" stroke-linecap="round"/>',
  cable:'<path d="M40 27v18c0 22 40 5 40 29v8" fill="none" stroke="var(--a)" stroke-width="8" stroke-linecap="round"/><path d="M33 19h14v12H33zm40 62h14v12H73z" fill="var(--b)"/><path d="M37 22v7m6-7v7m33 55v7m6-7v7" stroke="var(--c)" stroke-width="2"/>',
  aerosol:'<path fill="var(--a)" d="M43 31h34v53c0 6-6 10-17 10s-17-4-17-10Z"/><path fill="var(--b)" d="M50 21h20v11H50zm5-8h10v8H55Z"/><path d="M48 47h24v22H48z" fill="var(--c)" opacity=".8"/><path d="M70 18h10" stroke="var(--b)" stroke-width="3"/>',
  chemical:'<path fill="var(--a)" d="M51 16h18v17l15 13v36c0 7-6 11-19 11s-19-4-19-11V46l15-13Z"/><path fill="var(--b)" d="M49 12h22v9H49z"/><path d="M48 52h26v20H48z" fill="var(--c)"/><path d="m60 54-7 11h6l-2 6 10-12h-6Z" fill="#fff"/>',
  paint:'<path fill="var(--a)" d="M39 37h42v43c0 7-8 12-21 12s-21-5-21-12Z"/><path d="M42 37c0-25 36-25 36 0" fill="none" stroke="var(--b)" stroke-width="5"/><path fill="var(--c)" d="M41 49h38v17H41z"/><path d="M49 30h20" stroke="#fff" stroke-width="3"/>',
  syringe:'<g transform="rotate(-42 60 55)"><rect x="43" y="39" width="40" height="28" rx="3" fill="var(--a)"/><path fill="var(--c)" opacity=".55" d="M49 44h25v18H49Z"/><path d="M45 36h36M43 53H31m5-9v18m47-9h9m0 0h17m-54-9v18m8-18v18m8-18v18m8-18v18" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/><path d="M97 49v8" stroke="var(--c)" stroke-width="2"/></g>',
  thermometer:'<rect x="50" y="17" width="20" height="58" rx="10" fill="var(--a)"/><circle cx="60" cy="77" r="13" fill="var(--b)"/><path d="M60 34v40" stroke="var(--c)" stroke-width="5" stroke-linecap="round"/><path d="M70 32h8m-8 12h6m-6 12h8" stroke="#fff" stroke-width="3"/>',
  medical:'<rect x="34" y="29" width="52" height="59" rx="10" fill="var(--a)"/><path fill="var(--b)" d="M51 18h18v12H51z"/><path d="M60 42v25m-12-12h24" stroke="var(--c)" stroke-width="6" stroke-linecap="round"/><path d="M43 77h34" stroke="#fff" stroke-width="3" opacity=".65"/>',
  tofu:'<path fill="var(--b)" d="M31 43h58v34H31z"/><path fill="var(--a)" d="m37 31 45 4 7 11H31Z"/><path d="M39 49h39m-32 9h27m-26 9h20" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
  eggCarton:'<path fill="var(--a)" d="M28 52h64l-5 28c-1 7-7 11-27 11s-26-4-27-11Z"/><path fill="var(--b)" d="M31 50c2-16 12-25 29-25s27 9 29 25Z"/><g fill="var(--c)"><ellipse cx="43" cy="50" rx="7" ry="12"/><ellipse cx="60" cy="48" rx="7" ry="12"/><ellipse cx="77" cy="50" rx="7" ry="12"/></g><path d="M32 57h56" stroke="#fff" stroke-width="3" opacity=".7"/>',
  roll:'<path fill="var(--a)" d="M39 27h42v52H39Z"/><ellipse cx="60" cy="27" rx="21" ry="9" fill="var(--b)"/><ellipse cx="60" cy="27" rx="8" ry="4" fill="#fffdf5"/><path fill="var(--c)" d="M73 72c8 2 12 7 12 13-7 4-17 1-20-5l-4-7Z"/><path d="M40 78c4 6 14 9 20 8" fill="none" stroke="#fff" stroke-width="3"/>',
  book:'<path fill="var(--a)" d="M30 31c12-6 22-5 30 1v54c-10-6-20-7-30-2Zm60 0c-12-6-22-5-30 1v54c10-6 20-7 30-2Z"/><path d="M60 32v54M38 43c7-3 13-2 17 1m-17 8c7-3 13-2 17 1m30-10c-7-3-13-2-17 1m17 8c-7-3-13-2-17 1" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>',
  envelope:'<rect x="30" y="32" width="60" height="45" rx="5" fill="var(--a)"/><path d="m32 37 28 23 28-23M32 74l20-17m36 17L68 57" fill="none" stroke="var(--b)" stroke-width="4" stroke-linejoin="round"/><path d="M39 39h15" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  floss:'<path fill="var(--a)" d="M34 38c0-8 8-13 26-13s26 5 26 13v34c0 8-8 13-26 13s-26-5-26-13Z"/><path fill="var(--b)" d="M43 41c3-8 11-12 17-12s14 4 17 12Z"/><path d="M47 48h26m-26 8h26m-26 8h18" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
  testKit:'<rect x="27" y="39" width="66" height="34" rx="14" fill="var(--a)"/><rect x="43" y="47" width="28" height="17" rx="4" fill="var(--b)"/><path d="M52 51v9m8-9v9" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><circle cx="80" cy="56" r="3" fill="var(--c)"/><path d="M34 76h52" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>',
  headphones:'<path d="M34 57V48c0-18 11-29 26-29s26 11 26 29v9" fill="none" stroke="var(--a)" stroke-width="9" stroke-linecap="round"/><rect x="28" y="50" width="17" height="31" rx="8" fill="var(--b)"/><rect x="75" y="50" width="17" height="31" rx="8" fill="var(--b)"/><path d="M33 57v15m54-15v15" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
  mouse:'<path fill="var(--a)" d="M60 20c-18 0-27 12-27 31v18c0 16 11 25 27 25s27-9 27-25V51c0-19-9-31-27-31Z"/><path d="M60 21v24m0-16c-1-8 4-11 10-11" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/><path d="M60 27v10" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
  keyboard:'<path fill="var(--a)" d="m28 37 64 0 7 38c1 6-4 10-10 10H31c-6 0-11-4-10-10Z"/><g fill="var(--b)"><rect x="32" y="44" width="8" height="7" rx="2"/><rect x="43" y="44" width="8" height="7" rx="2"/><rect x="54" y="44" width="8" height="7" rx="2"/><rect x="65" y="44" width="8" height="7" rx="2"/><rect x="76" y="44" width="8" height="7" rx="2"/><rect x="87" y="44" width="5" height="7" rx="2"/><rect x="35" y="55" width="8" height="7" rx="2"/><rect x="46" y="55" width="8" height="7" rx="2"/><rect x="57" y="55" width="8" height="7" rx="2"/><rect x="68" y="55" width="8" height="7" rx="2"/><rect x="79" y="55" width="8" height="7" rx="2"/><rect x="42" y="66" width="38" height="6" rx="3"/></g>',
  calculator:'<rect x="38" y="15" width="44" height="75" rx="8" fill="var(--a)"/><rect x="45" y="23" width="30" height="18" rx="3" fill="var(--b)"/><g fill="var(--c)"><circle cx="49" cy="52" r="3"/><circle cx="60" cy="52" r="3"/><circle cx="71" cy="52" r="3"/><circle cx="49" cy="64" r="3"/><circle cx="60" cy="64" r="3"/><circle cx="71" cy="64" r="3"/><circle cx="49" cy="76" r="3"/><circle cx="60" cy="76" r="3"/><circle cx="71" cy="76" r="3"/></g>',
  camera:'<path fill="var(--a)" d="M29 36h17l6-10h18l6 10h15c5 0 8 4 8 9v35c0 5-3 8-8 8H29c-5 0-8-3-8-8V45c0-5 3-9 8-9Z"/><circle cx="60" cy="62" r="18" fill="var(--b)"/><circle cx="60" cy="62" r="10" fill="var(--c)"/><circle cx="87" cy="47" r="3" fill="#fff"/>',
  watch:'<path fill="var(--a)" d="M48 13h24l4 20v34l-4 20H48l-4-20V33Z"/><rect x="35" y="31" width="50" height="41" rx="12" fill="var(--b)"/><rect x="41" y="37" width="38" height="29" rx="7" fill="var(--a)"/><path d="M49 51h8l4-7 5 14 4-7h4" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  wire:'<ellipse cx="60" cy="56" rx="31" ry="25" fill="none" stroke="var(--a)" stroke-width="5"/><ellipse cx="60" cy="56" rx="22" ry="17" fill="none" stroke="var(--a)" stroke-width="5"/><ellipse cx="60" cy="56" rx="13" ry="9" fill="none" stroke="var(--a)" stroke-width="5"/><path d="m34 38-9-8m61 56 10 7" fill="none" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/>',
  tray:'<path fill="var(--a)" d="M27 39h66l-7 39c-1 7-7 11-26 11S35 85 34 78Z"/><path fill="var(--b)" d="M27 34h66v10H27z"/><path d="M38 51h44m-40 8h36m-32 8h28" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>',
  appleCore:'<path fill="var(--a)" d="M46 30c-10 4-15 16-9 29l8 23c3 9 8 12 15 3 7 9 12 6 15-3l8-23c6-13 1-25-9-29-7-3-10 2-14 2s-7-5-14-2Z"/><path d="M60 30v-9m-10 26 7 3m13-3-7 3m-12 18 7 3m13-3-7 3" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/><circle cx="52" cy="53" r="2" fill="var(--c)"/><circle cx="68" cy="53" r="2" fill="var(--c)"/>',
  grapeStem:'<path d="M37 30c14 8 31 9 46 2M57 35l-5 18m10-16 5 17M48 51l-7 14m28-12 8 13M42 65l9 9m26-8-9 9" fill="none" stroke="var(--a)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g fill="var(--b)"><circle cx="41" cy="65" r="5"/><circle cx="51" cy="75" r="5"/><circle cx="76" cy="64" r="5"/><circle cx="68" cy="75" r="5"/></g>'
};
const WASTE_ART_PALETTE={
  apple:['#ef6b62','#6baa50','#b84e3d'],banana:['#f4cb4d','#815337','#fff0a1'],orange:['#f39b45','#68a75d','#ffd18a'],watermelon:['#ed6e76','#438b5d','#303d32'],coconut:['#a5774c','#f5eee0','#66442f'],grapes:['#8f78bd','#527f52','#c0a9db'],seeds:['#e1ba62','#80563f','#f4dfa1'],pear:['#a9bd55','#5c8c48','#e4ed9a'],potato:['#c99a63','#815a3d','#ecd29c'],beans:['#b46e4c','#744932','#e0a36d'],straw:['#7fc4b7','#457c77','#c5eee0'],pot:['#889fa6','#5b7480','#d6e0d9'],cleaner:['#81bfae','#4b8979','#e8ca58'],extinguisher:['#e26860','#a33e3b','#f4cf58'],nailPolish:['#d981a4','#8f5c89','#f0bfd0'],razor:['#85a9bc','#526c7c','#e4cf78'],oil:['#657d86','#40545d','#e4bf53'],
  mango:['#f0a94e','#6b9c50','#f8d68b'],pineapple:['#eab64d','#5f9a58','#a47b36'],avocado:['#78a95d','#815a39','#b9ce7a'],fruit:['#d97881','#5b9b61','#f1b1a7'],leafy:['#72a85a','#3e8052','#d5e0a0'],carrot:['#ed8e44','#5d9c54','#f4bd6d'],corn:['#f3ca53','#68a65e','#d49c3b'],onion:['#bd8a68','#718f4a','#e4c69d'],egg:['#f4ead1','#d1b987','#fffaf0'],rice:['#eee7ce','#bf8d54','#fff9ec'],noodles:['#ebc35c','#c78d43','#f7e1a1'],bread:['#cf9559','#8e5a36','#f2d3a0'],fishbone:['#f1e5c4','#d58961','#fff8e4'],bone:['#f3e5c8','#c69b72','#fff8e6'],shell:['#eea987','#ba746a','#ffe0c5'],branch:['#815f3f','#68a65c','#b6ca71'],flower:['#de789a','#5f9b5b','#f3c94c'],coffee:['#d6a56c','#7a563c','#7eae65'],tea:['#e2bd83','#5d9b78','#f2e7ca'],bottle:['#8bc9c1','#4f9a8b','#d4f1e9'],glassBottle:['#9ccf9d','#4b9468','#e1f3dc'],jar:['#b5d8cf','#6f9c82','#e3edcc'],can:['#c9d0ce','#788d96','#f2c550'],paper:['#eee8d8','#ce9f51','#a5b7a5'],newspaper:['#ded9c8','#7d9a83','#a6a18f'],box:['#c69765','#b87d4d','#e4c08d'],carton:['#ddc69b','#6fa78d','#f2e5c4'],container:['#85b9c4','#4d91a2','#f1d178'],bucket:['#82adb9','#527c92','#e9c85d'],cap:['#7fb99e','#4c8f73','#d4e6a3'],metal:['#bcc5c4','#74898b','#e6eee8'],wrapper:['#ee7691','#5d9bd0','#f4ce58'],soapSachet:['#ed8aa3','#659abf','#fff1dc'],tissue:['#e8e4da','#b4c6cf','#fcfaf2'],foam:['#e7e8dc','#b7c8ba','#f4d680'],brush:['#77b9ac','#437f73','#ef9f72'],sock:['#8a83bf','#5d6394','#e8a4b4'],cup:['#86c3b8','#4b9484','#edbb54'],plate:['#e7e2d5','#d28b68','#c1b6d6'],cutlery:['#aebcbb','#738c8b','#d8e2d7'],bag:['#8bbcc2','#4e909c','#edbd56'],sponge:['#f1c954','#598b72','#e9956b'],broom:['#bd985c','#775d42','#8aaa60'],shards:['#99c9d1','#638f9a','#e8f4ec'],ceramic:['#d9d4c7','#719dbe','#d59478'],toy:['#e58d76','#6b9ec7','#efd05c'],shoe:['#648ab0','#4b5e78','#f1c862'],suitcase:['#9f7896','#745777','#e2b761'],pen:['#719dc5','#4a678b','#e4bd53'],folder:['#78a9bb','#537e96','#e8d282'],battery:['#e0c65e','#8d732d','#f36b53'],bulb:['#f5d875','#c19540','#fff3bd'],pill:['#e57c81','#9e5e9d','#fff4e3'],phone:['#7f98b5','#405467','#e98376'],device:['#91a7b0','#526773','#7cc6ad'],cable:['#4d6067','#263d43','#b4c8c0'],aerosol:['#de7585','#9d4d5e','#f0c35c'],chemical:['#87ae91','#4d7760','#e3c74e'],paint:['#d96f75','#9a4f5c','#65a5b5'],syringe:['#9eaea9','#4f6966','#bd5e61'],thermometer:['#d9e3de','#5a9ca0','#e67573'],  medical:['#e7e2d6','#6d9fc0','#d96f75'],tofu:['#f4eedb','#af9b74','#fffaf0'],eggCarton:['#b99b6f','#ddc9a6','#f3e7d0'],roll:['#eee6d4','#a17d58','#fffaf1'],book:['#a96e55','#e9dfcc','#668d73'],envelope:['#e8dec7','#bf9a69','#fff7e8'],floss:['#92bac1','#557f86','#e5ece5'],testKit:['#e6e9df','#6e9e91','#d87374'],headphones:['#718891','#40545c','#b7ced0'],mouse:['#88b6be','#527f89','#e3efed'],keyboard:['#aab8b6','#596f70','#e8efeb'],calculator:['#79989a','#455d60','#e0c765'],camera:['#80949b','#4a626b','#e6ba59'],watch:['#668d96','#405c65','#e6c45f'],wire:['#899b9e','#546b6d','#dce8e4'],tray:['#c3cecc','#71888a','#eaf1ed'],appleCore:['#d9b48c','#70543d','#f0d6b9'],grapeStem:['#83a45d','#684d37','#b8cc7f']
};
const WASTE_ART_RULES=[
  [/ซองสบู่เปล่า/,'soapSachet'],[/ก้านองุ่น/,'grapeStem'],[/แกนผลไม้/,'appleCore'],[/เศษเต้าหู้/,'tofu'],[/กล่องไข่กระดาษ/,'eggCarton'],[/แกนทิชชู่/,'roll'],[/หนังสือเก่า|สมุดเก่า|นิตยสาร/,'book'],[/ซองจดหมาย/,'envelope'],[/ไหมขัดฟัน/,'floss'],[/ฝาโลหะ/,'cap'],[/ช้อนโลหะ/,'cutlery'],[/หม้อโลหะ/,'pot'],[/ลวดโลหะ/,'wire'],[/ถาดอะลูมิเนียม/,'tray'],
  [/หูฟัง/,'headphones'],[/เมาส์/,'mouse'],[/คีย์บอร์ด/,'keyboard'],[/เครื่องคิดเลข/,'calculator'],[/กล้องเสีย/,'camera'],[/นาฬิกาดิจิทัล/,'watch'],[/จอเสีย/,'device'],[/ชุดตรวจใช้แล้ว/,'testKit'],
  [/ซังข้าวโพด|เปลือกข้าวโพด/,'corn'],[/เปลือกแอปเปิล/,'apple'],[/เปลือกกล้วย/,'banana'],[/เปลือกแตงโม/,'watermelon'],[/เปลือกส้ม/,'orange'],[/มะม่วง/,'mango'],[/สับปะรด/,'pineapple'],[/เปลือกมะพร้าว/,'coconut'],[/อะโวคาโด/,'avocado'],[/ก้านองุ่น/,'grapes'],[/เมล็ดผลไม้|แกนผลไม้/,'seeds'],[/กล่องน้ำผลไม้/,'carton'],[/ผลไม้/,'pear'],[/ก้างปลา/,'fishbone'],[/กระดูก/,'bone'],[/เปลือกกุ้ง|เปลือกปู/,'shell'],[/เปลือกไข่/,'egg'],[/ข้าวเหลือ|เศษอาหาร/,'rice'],[/เส้นก๋วยเตี๋ยว/,'noodles'],[/ขนมปัง/,'bread'],[/กากถั่วเหลือง/,'beans'],[/เปลือกมันฝรั่ง|มันฝรั่ง/,'potato'],[/เปลือกแครอท|แครอท/,'carrot'],[/เปลือกหัวหอม|หัวหอม|กระเทียม/,'onion'],[/เศษผัก|สลัด|แตงกวา|เต้าหู้/,'leafy'],[/กากกาแฟ/,'coffee'],[/ใบชา/,'tea'],[/ดอกไม้/,'flower'],[/ใบไม้|กิ่งไม้|หญ้า/,'branch'],
  [/กล่องน้ำผลไม้|กล่องเครื่องดื่ม/,'carton'],[/ถุงกระดาษ|ถุงพลาสติก/,'bag'],[/กระเป๋าเก่า/,'suitcase'],[/แฟ้มพลาสติก/,'folder'],[/กล่องไข่/,'box'],[/ขวดซอสแก้ว|โหลแก้ว/,'jar'],[/ขวดแก้ว/,'glassBottle'],[/ขวดน้ำยาล้างเล็บ|น้ำยาล้างเล็บ/,'nailPolish'],[/ขวดยาใช้แล้ว/,'medical'],[/ขวดน้ำมันพืช/,'bottle'],[/ขวดน้ำมันเครื่อง|ภาชนะน้ำมันเครื่อง|น้ำมันเครื่องใช้แล้ว/,'oil'],[/ขวดน้ำยาซักผ้า|ขวดน้ำยาทำความสะอาด|ขวดน้ำยาฆ่าเชื้อ|ขวดน้ำยาฟอกขาว|น้ำยาล้างห้องน้ำ|สารเคมี|น้ำยาฆ่าแมลง/,'cleaner'],[/ขวดน้ำอัดลม|ขวดน้ำ PET|ขวดพลาสติก|ขวดแชมพู|ขวดนม/,'bottle'],
  [/กระป๋องสเปรย์|กระป๋องยาฆ่าแมลง/,'aerosol'],[/ถังดับเพลิง/,'extinguisher'],[/กระป๋องสี/,'paint'],[/ช้อนโลหะ|หม้อโลหะ|ฝาโลหะ|ลวดโลหะ|ถาดอะลูมิเนียม/,'metal'],[/กระป๋อง/,'can'],[/หนังสือพิมพ์/,'newspaper'],[/แผ่นพับ|นิตยสาร|กระดาษสำนักงาน|หนังสือเก่า|สมุดเก่า|ซองจดหมาย|แกนทิชชู่/,'paper'],[/กล่องกระดาษลูกฟูก|กล่องกระดาษ|กล่องอาหารเปื้อน|กล่องพิซซ่า/,'box'],[/กล่องอาหารพลาสติก|ถาดพลาสติก|ลังพลาสติก/,'container'],[/ถังพลาสติก/,'bucket'],[/ฝาขวด/,'cap'],
  [/เส้นก๋วยเตี๋ยว/,'noodles'],  [/ทินเนอร์/,'chemical'],[/ถุงขนม|ห่อลูกอม|ซองเครื่องดื่ม|ซองบะหมี่|ซองเครื่องปรุง|ซองขนม|ซองเติม|พลาสติกห่อ|ซองสบู่|กระดาษห่อ/,'wrapper'],[/กระดาษเปื้อนอาหาร|ทิชชู่|ทิชชู/,'tissue'],[/กล่องโฟม/,'foam'],[/แปรงสีฟัน|ไหมขัดฟัน/,'brush'],[/ถุงเท้า/,'sock'],[/หลอดพลาสติก/,'straw'],[/ฝาแก้ว|แก้วกระดาษ|แก้วพลาสติก/,'cup'],[/จานชามแตก|ถ้วยเซรามิกแตก|กระถางแตก/,'ceramic'],[/จาน|ชาม/,'plate'],[/ช้อนส้อมพลาสติก/,'cutlery'],[/ฟองน้ำ/,'sponge'],[/ไม้กวาด/,'broom'],[/มีดโกน/,'razor'],[/แฟ้ม/,'folder'],[/ปากกา/,'pen'],[/เศษกระจก/,'shards'],[/ตุ๊กตา/,'toy'],[/รองเท้า/,'shoe'],[/กระเป๋า/,'suitcase'],[/กล่องพิซซ่า|กล่องอาหารเปื้อน/,'box'],
  [/ถ่าน|แบต|พาวเวอร์แบงก์/,'battery'],[/หลอดไฟ/,'bulb'],[/ยาหมดอายุ/,'pill'],[/โทรศัพท์/,'phone'],[/สายชาร์จ/,'cable'],[/หูฟัง|เมาส์|คีย์บอร์ด|จอเสีย|เครื่องคิดเลข|กล้องเสีย|นาฬิกาดิจิทัล/,'device'],[/เข็มฉีดยา|กระบอกฉีดยา/,'syringe'],[/ปรอทวัดไข้/,'thermometer'],[/ชุดตรวจใช้แล้ว/,'medical'],[/น้ำยาล้างเล็บ/,'nailPolish'],[/น้ำมันเครื่อง|น้ำมันพืช|น้ำยาฆ่าแมลง|น้ำยาล้างห้องน้ำ|น้ำยาฆ่าเชื้อ|น้ำยาทำความสะอาด|น้ำยาฟอกขาว|สารเคมี/,'chemical']
];
function wasteArtType(name){
  if(name==='ฝาขวดพลาสติก')return 'cap';
  for(const [pattern,type] of WASTE_ART_RULES)if(pattern.test(name))return type;
  return 'bag';
}
const WASTE_ART_OVERRIDES={
  'เศษอาหาร':{colors:['#d8a85f','#5b8f58','#f2d89a'],art:'<ellipse cx="60" cy="68" rx="33" ry="17" fill="var(--c)"/><ellipse cx="60" cy="65" rx="25" ry="11" fill="var(--a)"/><path d="M44 60c4-8 9-9 13-3m5 5c5-7 11-6 14 0m-29 12 7-5m18 4 5-6" fill="none" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/>'},
  'เศษแตงกวา':{colors:['#72a65b','#d7d98b','#f4e3a8'],art:'<path fill="var(--a)" d="M34 59c3-16 17-28 34-28s27 9 23 22-18 25-35 25S31 72 34 59Z"/><path fill="var(--b)" d="M41 57c3-10 14-18 26-18s17 6 14 13-14 17-26 17-17-5-14-12Z"/><circle cx="51" cy="53" r="2" fill="var(--c)"/><circle cx="65" cy="48" r="2" fill="var(--c)"/><circle cx="69" cy="60" r="2" fill="var(--c)"/>'},
  'เศษผักสลัด':{colors:['#78a95d','#5f8c50','#ead9a6'],art:'<path fill="var(--c)" d="M32 63h56c-2 17-12 25-28 25S34 80 32 63Z"/><path fill="var(--a)" d="M42 61c-8-12 3-22 13-12 0-16 17-16 17-1 12-10 22 3 12 14Z"/><path d="M53 56c-4-7-2-12 2-15m10 15c6-7 5-12 3-15m9 17 7-7" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>'},
  'กระดูกไก่':{colors:['#f0dfc3','#c79a70','#fff7e6'],art:'<path fill="var(--a)" d="M43 69c-7-7-4-16 4-18l20-20c-2-8 7-14 14-9 4 3 4 8 2 11 4 4 3 10-1 13-4 3-8 2-11-1L51 64c1 7-7 11-13 8Z"/><circle cx="41" cy="68" r="8" fill="var(--a)"/><path d="m51 59 17-17" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>'},
  'เปลือกปู':{colors:['#df7864','#a94e46','#ffd28b'],art:'<path fill="var(--a)" d="M39 54c0-15 9-24 21-24s21 9 21 24l-7 13H46Z"/><path d="M41 56 31 48m48 8 10-8M43 66l-8 10m42-10 8 10M48 69l-4 12m32-12 4 12M39 43c-8-4-11-11-6-15 5-4 12 0 14 7m34 8c8-4 11-11 6-15-5-4-12 0-14 7" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/>'},
  'เปลือกข้าวโพด':{colors:['#6d9c56','#c5a54c','#f0d47a'],art:'<path fill="var(--a)" d="M55 22c-15 3-23 18-20 38 2 15 11 24 24 25 13-1 22-10 24-25 3-20-5-35-20-38Z"/><path fill="var(--b)" d="M56 31c-5 7-8 20-7 35 1 9 4 14 10 16 6-2 9-7 10-16 1-15-2-28-7-35Z"/><path d="M38 52 24 74m58-22 14 22M42 66 31 86m47-20 11 20" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>'},
  'เปลือกกระเทียม':{colors:['#e8dfc7','#b39b74','#fff7e7'],art:'<path fill="var(--a)" d="M60 26c-4 8-11 9-17 16-10 12-7 30 3 39 7 6 21 6 28 0 10-9 13-27 3-39-6-7-13-8-17-16Z"/><path d="M60 31v50M48 43c-6 12-6 22 0 32m24-32c6 12 6 22 0 32M52 22c1-8 5-12 10-15 5 7 6 12 4 19" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>'},
  'ใบไม้แห้ง':{colors:['#bc8b52','#708b4a','#e6c982'],art:'<path fill="var(--a)" d="M34 74c2-29 20-49 53-51-1 31-20 49-53 51Z"/><path d="M37 72 77 35m-23 21-1-18m13 7 15-1m-28 23-2-13" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>'},
  'เศษหญ้า':{colors:['#73a75c','#4f8250','#c8d879'],art:'<path d="M60 83c-2-24-3-39-17-58m18 58c1-30 7-45 21-63M58 82c-10-19-20-28-31-34m34 34c9-22 18-30 32-37M60 82V25" fill="none" stroke="var(--a)" stroke-width="6" stroke-linecap="round"/><path d="M60 82h-24m24 0h25" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/>'},
  'ขวดซอสแก้ว':{colors:['#a4c9a1','#557e60','#e7c56e'],art:'<path fill="var(--a)" d="M50 18h20v14l9 9v43c0 6-5 9-19 9s-19-3-19-9V41l9-9Z"/><path fill="var(--b)" d="M47 48h26v27H47Z" opacity=".8"/><path d="M50 25h20m-20 57h20M54 52v18m8-18v18" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path fill="var(--c)" d="M51 18h18v7H51Z"/>'},
  'กระป๋องอะลูมิเนียม':{colors:['#c3d0ce','#80969b','#f3cc63'],art:'<path fill="var(--a)" d="M44 27h32l5 10v43l-5 10H44l-5-10V37Z"/><ellipse cx="60" cy="28" rx="16" ry="4" fill="var(--c)"/><path d="M42 41h36m-36 34h36M54 27c0-4 12-4 12 0l-2 5h-8Z" fill="none" stroke="var(--b)" stroke-width="3"/>'},
  'กระป๋องเหล็ก':{colors:['#b9c3c0','#6c8081','#e7d5a5'],art:'<path fill="var(--a)" d="M41 31h38v50l-5 8H46l-5-8Z"/><path d="M43 39h34m-34 7h34m-34 7h34m-34 7h34m-34 7h34m-34 7h34m-34 7h34" stroke="var(--b)" stroke-width="2"/><ellipse cx="60" cy="31" rx="19" ry="5" fill="var(--c)"/>'},
  'กระป๋องกาแฟ':{colors:['#98704e','#5b4538','#e8c776'],art:'<path fill="var(--a)" d="M38 34h44v49l-6 7H44l-6-7Z"/><ellipse cx="60" cy="34" rx="22" ry="6" fill="var(--c)"/><path fill="var(--b)" d="M44 49h32v21H44Z"/><path d="M49 55h22m-18 7h14" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>'},
  'กล่องกระดาษลูกฟูก':{colors:['#c59664','#a87548','#e4c08d'],art:'<path fill="var(--a)" d="m31 43 29-17 29 17v36L60 95 31 79Z"/><path fill="var(--b)" d="m31 43 29 16 29-16-29-17Z"/><path d="M60 59v35M38 48l19 11m25-11L63 59m-21 7 14 8m32-8-14 8" fill="none" stroke="var(--c)" stroke-width="3"/>'},
  'กล่องพิซซ่าเปื้อน':{colors:['#d5a66c','#a97443','#e5cb9a'],art:'<path fill="var(--a)" d="m29 54 31-21 31 21-6 31H35Z"/><path fill="var(--b)" d="m29 54 31 18 31-18v8L60 81 29 62Z"/><path fill="var(--c)" d="m46 53 14-9 14 9-14 22Z"/><circle cx="58" cy="55" r="3" fill="var(--a)"/><circle cx="66" cy="61" r="3" fill="var(--a)"/>'},
  'กล่องอาหารเปื้อน':{colors:['#c79b70','#9a704c','#ead3a8'],art:'<path fill="var(--a)" d="M33 42h54v36c0 10-10 15-27 15S33 88 33 78Z"/><path fill="var(--b)" d="M29 36h62v13H29Z"/><path d="M41 58h38m-32 8h26" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="77" r="3" fill="var(--b)"/><circle cx="69" cy="82" r="4" fill="var(--b)"/>'},
  'ขวดน้ำ PET':{colors:['#8bc9c1','#4f9a8b','#d4f1e9'],art:'<path fill="var(--a)" d="M53 18h14v12l9 8v44c0 7-7 10-16 10s-16-3-16-10V38l9-8Z"/><path fill="var(--b)" d="M47 53h26v16H47Z" opacity=".7"/><path d="M53 22h14m-14 6h14m-6 16v39" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path fill="var(--c)" d="M52 17h16v6H52Z"/>'},
  'ขวดแชมพู':{colors:['#da8ab0','#8c5880','#f4d47b'],art:'<path fill="var(--a)" d="M46 35c0-6 5-10 14-10s14 4 14 10v7c9 5 12 13 12 24v18c0 8-9 12-26 12S34 92 34 84V66c0-11 3-19 12-24Z"/><path fill="var(--b)" d="M48 58h24v17H48Z"/><path d="M52 25v-8h14v8m-14-8h19" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>'},
  'ขวดนมพลาสติก':{colors:['#f3efe0','#86b7ad','#d8c46b'],art:'<path fill="var(--a)" d="M52 17h16v12l8 9v45c0 8-7 11-16 11s-16-3-16-11V38l8-9Z"/><path d="M68 43c13-2 17 4 15 12-2 7-8 9-14 7" fill="none" stroke="var(--b)" stroke-width="5"/><path fill="var(--b)" d="M47 58h26v13H47Z"/><path d="M54 20h12m-12 6h12" stroke="var(--c)" stroke-width="3"/>'},
  'ฝาขวดพลาสติก':{colors:['#79b9a2','#458674','#d8ec9e'],art:'<path fill="var(--a)" d="M42 43h36v28H42Z"/><path fill="var(--b)" d="M38 36h44v12H38Z"/><path d="M45 39v7m8-7v7m8-7v7m8-7v7m8-7v7M47 53v16m9-16v16m9-16v16m9-16v16" stroke="var(--c)" stroke-width="2"/>'},
  'ขวดน้ำมันพืช':{colors:['#c8ad5a','#7f6d35','#f3dc88'],art:'<path fill="var(--a)" d="M49 18h20v11l9 9v45c0 7-8 10-18 10s-18-3-18-10V38l9-9Z"/><path fill="var(--b)" d="M47 54h26v20H47Z" opacity=".75"/><path d="M54 22h10m-9 6h11m-5 33v10" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path fill="var(--c)" d="M50 17h18v6H50Z"/>'},
  'ขวดน้ำอัดลม PET':{colors:['#78b6a4','#4e7f72','#e4c367'],art:'<path fill="var(--a)" d="M53 16h14v10l8 9 5 12-5 8 5 10-4 21c-1 6-8 9-16 9s-15-3-16-9l-4-21 5-10-5-8 5-12 8-9Z"/><path d="M44 50h32m-31 16h30m-20-40h12" stroke="var(--b)" stroke-width="4"/><path fill="var(--c)" d="M53 15h14v7H53Z"/>'},
  'สารเคมี':{colors:['#91b889','#527657','#ead66e'],art:'<path fill="var(--a)" d="M48 22h24v13l10 9v42c0 6-10 9-22 9s-22-3-22-9V44l10-9Z"/><path fill="var(--b)" d="M44 54h32v21H44Z"/><path d="M60 58v9m0 5v1m-8-35h16" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>'},
  'ขวดน้ำยาทำความสะอาด':{colors:['#75b9ad','#4c8178','#e5cc68'],art:'<path fill="var(--a)" d="M43 32h32v10l8 9v34c0 8-8 11-24 11S35 93 35 85V51l8-9Z"/><path d="M43 32h22v-8h13l6 7-5 8H65" fill="none" stroke="var(--b)" stroke-width="5" stroke-linejoin="round"/><path fill="var(--c)" d="M43 59h32v17H43Z"/>'},
  'ขวดน้ำยาฆ่าเชื้อ':{colors:['#8fc5ba','#477f72','#f2da79'],art:'<path fill="var(--a)" d="M50 34h20v10l8 7v36c0 7-7 10-18 10s-18-3-18-10V51l8-7Z"/><path d="M60 20v17m-8-10h18" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/><path fill="var(--c)" d="M48 59h24v16H48Z"/><path d="M60 62v10m-5-5h10" stroke="var(--b)" stroke-width="2"/>'},
  'น้ำยาล้างห้องน้ำ':{colors:['#76aebc','#426b8a','#e7d06d'],art:'<path fill="var(--a)" d="M42 31h29l8 10-3 10 7 33c1 7-7 12-22 12S39 91 40 84l7-33-5-10Z"/><path d="M44 31h22l-4-9 15-5 4 7-10 7" fill="none" stroke="var(--b)" stroke-width="5" stroke-linejoin="round"/><path fill="var(--c)" d="M47 61h27v15H47Z"/>'},
  'น้ำยาฆ่าแมลง':{colors:['#a0b66a','#547142','#e2c866'],art:'<path fill="var(--a)" d="M47 33h27v12l8 8v32c0 7-8 11-22 11s-22-4-22-11V53l9-8Z"/><path d="M49 33v-9h19l9 7-5 7H68" fill="none" stroke="var(--b)" stroke-width="5" stroke-linejoin="round"/><path fill="var(--c)" d="M47 58h27v18H47Z"/><path d="M55 66h10m-5-5v10" stroke="var(--b)" stroke-width="2"/>'},
  'ขวดน้ำยาฟอกขาว':{colors:['#f0eee3','#719c92','#e5d077'],art:'<path fill="var(--a)" d="M43 34h35v10l8 9v34c0 7-9 10-25 10S36 94 36 87V53l7-9Z"/><path fill="none" d="M70 45c16-2 17 7 8 13" stroke="var(--b)" stroke-width="5"/><path d="M48 34V22h19v12m-15-8h12" fill="none" stroke="var(--c)" stroke-width="4"/><path fill="var(--b)" d="M46 63h31v13H46Z"/>'},
  'ถาดพลาสติก':{colors:['#8bbcc6','#4f8795','#ead27b'],art:'<path fill="var(--a)" d="M28 42h64l-7 35c-2 10-10 14-25 14S37 87 35 77Z"/><path fill="var(--b)" d="M25 35h70v11H25Z"/><path d="M39 55h42m-38 8h34m-31 8h28" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>'},
  'ลังพลาสติก':{colors:['#76a9b5','#476d82','#d9c367'],art:'<path fill="var(--a)" d="M31 38h58v44H31Z"/><path d="M31 48h58M38 48v34m14-34v34m16-34v34m14-34v34M35 38v-7h50v7" fill="none" stroke="var(--b)" stroke-width="4"/><path d="M39 57h8m10 0h8m10 0h8" stroke="var(--c)" stroke-width="3"/>'},
  'แผ่นพับโฆษณา':{colors:['#e9dfc9','#6aa39a','#e38570'],art:'<path fill="var(--a)" d="M34 24h52v62H34Z"/><path fill="var(--b)" d="M39 30h42v22H39Z"/><path d="M40 59h39m-39 7h29m-29 7h34" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><circle cx="60" cy="41" r="7" fill="var(--c)"/>'},
  'นิตยสาร':{colors:['#bd7f65','#668e75','#edc36a'],art:'<path fill="var(--a)" d="M35 22h51v67H35Z"/><path fill="var(--b)" d="M40 29h41v36H40Z"/><path d="M43 73h34m-34 6h28" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path d="M48 55c4-13 19-17 26-3-4 10-16 15-26 3Z" fill="var(--c)"/>'},
  'สมุดเก่า':{colors:['#d5c7a2','#738f8a','#bf8165'],art:'<path fill="var(--a)" d="M39 23h43v65H39Z"/><path fill="var(--b)" d="M36 23h8v65h-8Z"/><path d="M40 31h4m-4 10h4m-4 10h4m-4 10h4m-4 10h4m-4 10h4M51 38h23m-23 8h23m-23 8h23m-23 8h16" stroke="var(--c)" stroke-width="2"/>'},
  'ถุงกระดาษ':{colors:['#c69a68','#956c49','#e4c88a'],art:'<path fill="var(--a)" d="M38 37h44l-4 50H42Z"/><path d="M48 39c0-22 24-22 24 0" fill="none" stroke="var(--b)" stroke-width="5"/><path d="M45 51h30m-29 8h28m-27 8h25" stroke="var(--c)" stroke-width="2"/><path d="M42 87h36" stroke="var(--b)" stroke-width="3"/>'},
  'กล่องน้ำผลไม้':{colors:['#e7c987','#6c9e6d','#e57f68'],art:'<path fill="var(--a)" d="m42 29 12-12h25l9 12v57H42Z"/><path fill="var(--b)" d="M54 17 50 30h38L79 17Z"/><path d="M69 19v-8h10v15m-27 24h30v22H52Z" fill="none" stroke="var(--c)" stroke-width="3"/><circle cx="66" cy="57" r="6" fill="var(--c)"/>'},
  'ช้อนส้อมพลาสติก':{colors:['#83b9b1','#4d817c','#e8bd68'],art:'<path d="M42 22v20m-7-20v9c0 7 14 7 14 0v-9m-7 20v40m28-40v40m0-69c-11 9-11 25 0 29" fill="none" stroke="var(--a)" stroke-width="6" stroke-linecap="round"/><path d="M42 52h28" stroke="var(--b)" stroke-width="2" stroke-dasharray="3 4"/>'},
  'ห่อลูกอม':{colors:['#e88391','#6c9ec4','#f4d17c'],art:'<path fill="var(--a)" d="M38 42 23 32l5 18-5 18 15-10h44l15 10-5-18 5-18-15 10Z"/><path d="M47 42c8 7 8 15 0 23m26-23c-8 7-8 15 0 23" fill="none" stroke="var(--b)" stroke-width="4"/><ellipse cx="60" cy="53" rx="7" ry="5" fill="var(--c)"/>'},
  'ซองเครื่องดื่ม':{colors:['#83bfc0','#4c8e97','#edc66a'],art:'<path fill="var(--a)" d="M39 28h42l5 9-4 42-7 8H44l-7-8-4-42Z"/><path d="M47 29v-8h13m-8 0h9" fill="none" stroke="var(--b)" stroke-width="4" stroke-linecap="round"/><path fill="var(--c)" d="M45 48h30v17H45Z"/><path d="M54 53h12m-6-5v14" stroke="var(--b)" stroke-width="2"/>'},
  'ซองบะหมี่':{colors:['#efc754','#bd7245','#e97c62'],art:'<path fill="var(--a)" d="M37 24h46l5 8-4 52H36l-4-52Z"/><path d="M39 34h42m-42 39h42" stroke="var(--b)" stroke-width="4"/><path fill="var(--c)" d="M46 44h28v18H46Z"/><path d="M50 57c3-8 6-8 9 0s6 8 10 0" fill="none" stroke="var(--b)" stroke-width="3"/>'},
  'ซองเครื่องปรุง':{colors:['#d9b866','#9b6b42','#f2df9d'],art:'<path fill="var(--a)" d="M48 21h24l7 8-4 57H45l-4-57Z"/><path d="M45 31h34m-35 46h34" stroke="var(--b)" stroke-width="3"/><path fill="var(--c)" d="M51 44c8-7 17 1 13 9-3 5-10 5-13 0-2-3-2-6 0-9Z"/><path d="M56 54c-5 5-6 10-5 14m11-14c5 5 6 10 5 14" stroke="var(--b)" stroke-width="2"/>'},
  'ซองขนม':{colors:['#ef8b67','#5e91b5','#f4d77e'],art:'<path fill="var(--a)" d="M39 24h42l6 9-4 49-7 7H44l-7-7-4-49Z"/><path fill="var(--b)" d="M40 31h40v11H40Z"/><path d="M45 54c4-7 8-7 12 0s8 7 12 0m-24 9c4-7 8-7 12 0s8 7 12 0" fill="none" stroke="var(--c)" stroke-width="3"/>'},
  'ซองเติมผลิตภัณฑ์':{colors:['#9cc7b1','#558a73','#e5cf77'],art:'<path fill="var(--a)" d="M41 29h40l6 9-4 45-7 7H44l-7-7-4-45Z"/><path fill="var(--b)" d="M61 18h17v12H61Z"/><path d="M45 48h32m-32 8h23m-23 8h28" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><path d="M65 19v-5h10v5" fill="none" stroke="var(--b)" stroke-width="3"/>'},
  'พลาสติกห่อเปื้อน':{colors:['#d4d7c8','#8ca99a','#d28a65'],art:'<path fill="var(--a)" d="M32 43c12-12 19 7 28-4s18 8 28-5v27c-12 13-18-5-28 5s-18-7-28 5Z"/><path d="M34 78c11-10 18 5 27-4 10-10 18 5 27-4" fill="none" stroke="var(--b)" stroke-width="5" stroke-linecap="round"/><circle cx="48" cy="53" r="4" fill="var(--c)"/><circle cx="74" cy="58" r="3" fill="var(--c)"/>'},
  'กระดาษห่อเคลือบ':{colors:['#e9dfc6','#c17b62','#6e9a8a'],art:'<path fill="var(--a)" d="m37 30 44 2 4 52-45-2Z"/><path fill="var(--b)" d="m37 30 27 19 21-17-4 52-25-20-13 18Z"/><path d="M51 45h27m-22 10h22" stroke="var(--c)" stroke-width="3"/>'},
  'กระดาษเปื้อนอาหาร':{colors:['#e8e1d1','#b58b5e','#cf8c68'],art:'<path fill="var(--a)" d="M35 25h50v63H35Z"/><circle cx="53" cy="48" r="11" fill="var(--b)" opacity=".7"/><circle cx="72" cy="67" r="8" fill="var(--c)" opacity=".75"/><path d="M42 37h35m-31 42h18" stroke="#fff" stroke-width="3" opacity=".7"/>'},
  'แก้วกระดาษ':{colors:['#e8ddc8','#9b765b','#d9bd82'],art:'<path fill="var(--a)" d="M42 35h36l-5 48c-1 7-5 10-13 10s-12-3-13-10Z"/><path fill="var(--b)" d="M39 29h42v10H39Z"/><path d="M48 45v35m8-35v39m8-39v39m8-39v35" stroke="var(--c)" stroke-width="2"/>'},
  'ฝาแก้วใช้แล้ว':{colors:['#8dbdc0','#547e82','#edc66e'],art:'<ellipse cx="60" cy="58" rx="31" ry="21" fill="var(--a)"/><ellipse cx="60" cy="57" rx="21" ry="12" fill="var(--b)"/><circle cx="60" cy="56" r="5" fill="var(--c)"/><path d="M39 64c10 9 32 9 42 0" fill="none" stroke="var(--c)" stroke-width="3"/>'},
  'จานชามแตก':{colors:['#d9d4c7','#719dbe','#d59478'],art:'<path fill="var(--a)" d="M59 25a32 31 0 1 0 5 61l-8-15 11-9-10-10 8-13Z"/><path fill="var(--a)" d="m71 32 22 20-18 8-8-11Z"/><path fill="var(--a)" d="m33 72 18-12 10 12-7 13a32 31 0 0 1-21-13Z"/><path d="m59 26 5 16-10 10 11 10-9 12m17-42-5 17 15 3m-50 20 18-12" fill="none" stroke="var(--b)" stroke-width="3"/>'},
  'กระถางแตก':{colors:['#c68b68','#815746','#d8ad78'],art:'<path fill="var(--a)" d="M38 35h44l-6 47c-1 7-7 10-16 10s-15-3-16-10Z"/><path fill="var(--b)" d="M34 28h52v12H34Z"/><path d="m55 41-7 15 9 8-6 17m14-38-4 14 8 5" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round"/>'},
  'แบตเตอรี่ก้อน':{colors:['#95a8a8','#4b6269','#e9c953'],art:'<rect x="38" y="34" width="44" height="48" rx="6" fill="var(--a)"/><path fill="var(--b)" d="M51 25h18v9H51Z"/><path d="M49 49h22v19H49Z" fill="none" stroke="var(--c)" stroke-width="3"/><path d="M60 52v13m-5-7h10" stroke="var(--c)" stroke-width="2"/>'},
  'แบตลิเธียม':{colors:['#9eabb0','#60747c','#e0bc66'],art:'<path fill="var(--a)" d="m34 40 48-8 6 39-48 8Z"/><path d="m43 43 3 29m8-31 3 29m8-31 3 29m8-31 3 29" stroke="var(--b)" stroke-width="2"/><path fill="var(--c)" d="m54 51 9-2-5 9 8-1-14 12 4-9-8 1Z"/>'},
  'แบตโน้ตบุ๊ก':{colors:['#899da4','#526871','#b7c8c5'],art:'<rect x="29" y="37" width="62" height="39" rx="6" fill="var(--a)"/><path fill="var(--b)" d="M34 42h14v28H34Zm19 0h14v28H53Zm19 0h14v28H72Z"/><path d="M42 81h36m-31-3v4m26-4v4" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>'},
  'ถ่านกระดุม':{colors:['#bdc9c4','#748986','#eee4b3'],art:'<ellipse cx="60" cy="62" rx="25" ry="18" fill="var(--a)"/><path fill="var(--b)" d="M35 60c0-10 11-18 25-18s25 8 25 18-11 18-25 18-25-8-25-18Z"/><ellipse cx="60" cy="57" rx="25" ry="16" fill="var(--a)"/><path d="M60 48v18m-6-9h12" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>'},
  'พาวเวอร์แบงก์เก่า':{colors:['#8199a0','#4d646b','#d9c875'],art:'<rect x="34" y="31" width="52" height="53" rx="10" fill="var(--a)"/><rect x="43" y="40" width="34" height="7" rx="3" fill="var(--b)"/><circle cx="60" cy="67" r="9" fill="var(--b)"/><path d="M55 67h10m-5-5v10m-14-28h28" stroke="var(--c)" stroke-width="2"/>'},
  'กระป๋องยาฆ่าแมลง':{colors:['#d8766d','#8c4c49','#e8c36c'],art:'<path fill="var(--a)" d="M44 30h32l5 11v41l-6 9H45l-6-9V41Z"/><path fill="var(--b)" d="M46 47h28v22H46Z"/><path d="M51 30v-9h18l7 6-4 7M54 55h12m-6-6v13" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/><circle cx="66" cy="76" r="4" fill="var(--c)"/>'},
  'น้ำมันเครื่องใช้แล้ว':{colors:['#6f7a58','#444d3b','#dbb857'],art:'<path fill="var(--a)" d="M45 25h30v13l8 8v39c0 7-9 10-23 10s-23-3-23-10V46l8-8Z"/><path fill="var(--b)" d="M44 57h32v18H44Z"/><path d="M59 44c-6 8-8 12-8 16a8 8 0 0 0 16 0c0-4-2-8-8-16Z" fill="var(--c)" stroke="var(--c)" stroke-width="2"/>'},
  'กระบอกฉีดยาใช้แล้ว':{colors:['#dbe6df','#71918c','#df8275'],art:'<rect x="38" y="39" width="47" height="30" rx="3" fill="var(--a)"/><path fill="var(--c)" opacity=".55" d="M45 44h29v20H45Z"/><path d="M43 44v20m9-14v8m8-8v8m8-8v8m8-8v8M38 35v38m-5-32h5m-5 26h5" fill="none" stroke="var(--b)" stroke-width="3" stroke-linecap="round"/>'},
  'น้ำยาล้างเล็บ':{colors:['#df8aa9','#a75b78','#f2d3dc'],art:'<path fill="var(--a)" d="M43 69c8-12 13-19 17-32 4 13 9 20 17 32 8 15-2 23-17 23s-25-8-17-23Z"/><path fill="var(--b)" d="M57 35h7V20h-7Z"/><path d="M55 21h11m-18 53c7 5 18 5 25 0" fill="none" stroke="var(--c)" stroke-width="3" stroke-linecap="round"/>'}
};
function renderWasteArt(name){
  const type=wasteArtType(name),override=WASTE_ART_OVERRIDES[name],colors=override?override.colors:(WASTE_ART_PALETTE[type]||WASTE_ART_PALETTE.bag),art=override?override.art:WASTE_ART[type];
  return `<svg viewBox="0 0 120 100" focusable="false" aria-hidden="true" style="--a:${colors[0]};--b:${colors[1]};--c:${colors[2]}"><defs><filter id="sticker" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="1.15" result="spread"/><feFlood flood-color="#fffdf5" result="paper"/><feComposite in="paper" in2="spread" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><ellipse cx="60" cy="91" rx="27" ry="4" fill="#1e293b" opacity=".12"/><g filter="url(#sticker)" stroke="#36433c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${art}</g></svg>`;
}
const BIN_TH={green:'ถังเขียว',yellow:'ถังเหลือง',blue:'ถังฟ้า',red:'ถังแดง'};
const $=id=>document.getElementById(id);
let st,cur,selected=false,timer,bag=[],recentBins=[];
let best=0;try{best=+localStorage.getItem('wsg_best')||0}catch(e){}

function show(id){document.body.classList.toggle('game-over',id==='end');['start','game','end'].forEach(x=>{const e=$(x);e.classList.add('hidden');e.classList.remove('flex')});$(id).classList.remove('hidden');if(id!=='start')$(id).classList.add('flex')}
function shuffleItems(items){
  for(let i=items.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
}
function refillBag(){
  const byBin={green:[],yellow:[],blue:[],red:[]};
  for(const item of ITEMS)byBin[item[1]].push(item);
  Object.values(byBin).forEach(shuffleItems);
  const order=[];
  const previous=recentBins.slice(-2);
  while(true){
    const activeBins=Object.keys(byBin).filter(bin=>byBin[bin].length);
    if(!activeBins.length)break;
    shuffleItems(activeBins);
    if(previous.length===2&&previous[0]===previous[1]&&activeBins[0]===previous[1]){
      const alternative=activeBins.findIndex(bin=>bin!==previous[1]);
      if(alternative<0)throw new Error('Cannot avoid three consecutive items from the same bin.');
      [activeBins[0],activeBins[alternative]]=[activeBins[alternative],activeBins[0]];
    }
    for(const bin of activeBins){
      if(previous.length===2&&previous[0]===previous[1]&&bin===previous[1]){
        throw new Error('Cannot avoid three consecutive items from the same bin.');
      }
      order.push(byBin[bin].pop());
      previous.push(bin);
      if(previous.length>2)previous.shift();
    }
  }
  bag=order;
}
function next(){
  if(!bag.length)refillBag();
  cur=bag.shift();recentBins.push(cur[1]);if(recentBins.length>2)recentBins.shift();selected=false;if(st)st.answering=false;$('game').classList.remove('armed');
  const el=$('item');el.classList.remove('pop','sel','shake');void el.offsetWidth;el.classList.add('pop');
  $('itemArt').innerHTML=renderWasteArt(cur[0]);$('name').textContent=cur[0];
}
const spinningCounters=new WeakMap();
const REEL_STEP=50*Math.PI/180,REEL_ENTER_MS=120,REEL_FADE_END=1.8,REEL_LAND_AT=.6,REEL_ARRIVE_AT=.29,REEL_CLEAR_MS=200;
function reelToken(name,fallback){const value=parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));return Number.isNaN(value)?fallback:value}
function reelLength(el,name,fallbackEm){
  const probe=document.createElement('span');probe.style.cssText='position:absolute;visibility:hidden;width:var('+name+')';el.appendChild(probe);
  const px=probe.getBoundingClientRect().width;probe.remove();
  return px||fallbackEm*(parseFloat(getComputedStyle(el).fontSize)||24);
}
function reelBezier([x1,y1,x2,y2]){
  const at=(a,b,t)=>3*a*t*(1-t)*(1-t)+3*b*t*t*(1-t)+t*t*t;
  return x=>{if(x<=0)return 0;if(x>=1)return 1;let lo=0,hi=1,t=x;for(let i=0;i<20;i++){if(at(x1,x2,t)<x)lo=t;else hi=t;t=(lo+hi)/2}return at(y1,y2,t)};
}
function readReelTokens(el){
  const css=getComputedStyle(document.documentElement),match=css.getPropertyValue('--reel-ease').match(/cubic-bezier\(([^)]+)\)/);
  return{
    stepDur:reelToken('--reel-step-dur',130),stagger:reelToken('--reel-stagger',90),
    ease:reelBezier(match?match[1].split(',').map(parseFloat):[.35,-.02,.43,1]),
    offset:reelLength(el,'--reel-side-offset',.52),sideScale:reelToken('--reel-side-scale',.7),
    sideBlur:reelLength(el,'--reel-side-blur',.083),sideOpacity:reelToken('--reel-side-opacity',.17),
    centerScale:reelToken('--reel-center-scale',.9),centerBlur:reelLength(el,'--reel-center-blur',.042),
    anticDur:reelToken('--reel-antic-dur',100),anticScale:reelToken('--reel-antic-scale',.94),
    anticLift:reelLength(el,'--reel-antic-lift',.125),landDur:reelToken('--reel-land-dur',740),
    landPeak:reelToken('--reel-land-peak',1.03)
  };
}
function reelSmooth(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
function reelWave(s){return s>=1?0:Math.exp(-3*s)*Math.cos(3*Math.PI*s)*(1-s)}
const REEL_WAVE_TROUGH=(()=>{let low=0;for(let i=1;i<400;i++)low=Math.min(low,reelWave(i/400));return-low})();
function buildReelColumns(el,value){
  el.replaceChildren();const columns=[];
  for(const char of value.toLocaleString('en-US')){
    if(char<'0'||char>'9'){const sep=document.createElement('span');sep.className='t-reel-sep';sep.textContent=char;el.appendChild(sep);continue}
    const col=document.createElement('span');col.className='t-reel-col';
    const sizer=document.createElement('span');sizer.className='t-reel-sizer';sizer.textContent='0';col.appendChild(sizer);
    const cells=[];
    for(let digit=0;digit<10;digit++){const cell=document.createElement('span');cell.className='t-reel-digit';cell.textContent=String(digit);col.appendChild(cell);cells.push(cell)}
    el.appendChild(col);columns.push({cells,digit:+char});
  }
  return columns;
}
function restReelColumn(col,digit){
  col.cells.forEach((cell,index)=>{cell.style.transform='none';cell.style.filter='none';cell.style.zIndex='';cell.style.opacity=index===digit?'1':'0'});
}
function reelLook(distance,middle,options){
  const angle=Math.min(distance*REEL_STEP,Math.PI/2),face=(Math.cos(angle)-Math.cos(REEL_STEP))/(1-Math.cos(REEL_STEP));
  return{angle,scale:options.sideScale+(middle-options.sideScale)*face,back:distance<=1?1+(options.sideOpacity-1)*distance:options.sideOpacity*(1-(distance-1)/(REEL_FADE_END-1))};
}
function placeReelColumn(col,position,spread,middle,options,land){
  const radius=options.offset/Math.sin(REEL_STEP);
  col.cells.forEach((cell,digit)=>{
    let relative=(((digit-position)%10)+10)%10;if(relative>5)relative-=10;
    const distance=Math.abs(relative);if(distance>=REEL_FADE_END){cell.style.opacity='0';return}
    const look=reelLook(distance,middle,options);
    let y=(relative<0?1:-1)*radius*Math.sin(look.angle);
    const blur=(options.centerBlur+(options.sideBlur-options.centerBlur)*Math.min(distance,1))*spread;
    const away=Math.max(0,Math.min(1,(distance-.3)/.5));
    let opacity=look.back*(1-(1-spread)*away),scale=look.scale,z=100-Math.round(distance*10);
    if(land&&digit===col.digit){y=y*land.arrive+land.lift;scale=land.scale;opacity=land.opacity;z=200}
    cell.style.transform='translateY('+y.toFixed(2)+'px) scale('+scale.toFixed(4)+')';
    cell.style.filter=blur>.01?'blur('+blur.toFixed(2)+'px)':'none';
    cell.style.opacity=opacity.toFixed(3);cell.style.zIndex=String(z);
  });
}
function rollReel(el,from,to){
  const label=to.toLocaleString('en-US');el.setAttribute('aria-label',label);
  const columns=buildReelColumns(el,label);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){columns.forEach(col=>restReelColumn(col,col.digit));return()=>{}}
  const options=readReelTokens(el),fromDigits=String(from).padStart(columns.length,'0').slice(-columns.length);
  columns.forEach((col,index)=>{col.from=+fromDigits[index];restReelColumn(col,col.from);if(col.from===col.digit)col.done=true});
  const started=performance.now();let frame=0;
  const tick=()=>{
    const elapsed=performance.now()-started;let running=false;
    columns.forEach((col,index)=>{
      if(col.done)return;
      const local=elapsed-index*options.stagger;if(local<=0){running=true;return}
      const total=(col.digit-col.from+10)%10,position=col.from+total*options.ease(local/(total*options.stepDur));
      const enter=Math.min(1,local/REEL_ENTER_MS);
      if(col.landAt===undefined&&col.from+total-position<REEL_LAND_AT)col.landAt=elapsed;
      const since=col.landAt===undefined?-1:elapsed-col.landAt;
      if(since>=options.anticDur+options.landDur){restReelColumn(col,col.digit);col.done=true;return}
      running=true;const middle=1+(options.centerScale-1)*enter;let spread=enter,land=null;
      if(since>=0){
        if(!col.landFrom)col.landFrom=reelLook(col.from+total-position,middle,options);
        const arrive=1-reelSmooth(since/(options.anticDur+options.landDur*REEL_ARRIVE_AT));
        if(since<options.anticDur){
          const anticipation=reelSmooth(since/options.anticDur);
          land={scale:col.landFrom.scale+(options.anticScale-col.landFrom.scale)*anticipation,lift:-options.anticLift*anticipation,opacity:col.landFrom.back+(1-col.landFrom.back)*anticipation,arrive};
        }else{
          const spring=since-options.anticDur,progress=spring/options.landDur,wave=reelWave(progress);
          land={scale:progress<1/6?1+(options.anticScale-1)*wave:1-((options.landPeak-1)*wave)/REEL_WAVE_TROUGH,lift:-options.anticLift*wave,opacity:1,arrive};
          spread=1-Math.min(1,spring/REEL_CLEAR_MS);
        }
      }
      placeReelColumn(col,position,spread,middle,options,land);
    });
    if(running)frame=requestAnimationFrame(tick);
  };
  tick();return()=>cancelAnimationFrame(frame);
}
function setSpinningCounter(el,value){
  const state=spinningCounters.get(el);
  if(state&&state.value===value)return;
  if(state&&state.cancel)state.cancel();
  if(!state){
    const label=value.toLocaleString('en-US');el.setAttribute('aria-label',label);
    buildReelColumns(el,label).forEach(col=>restReelColumn(col,col.digit));
    spinningCounters.set(el,{value,cancel:null});return;
  }
  spinningCounters.set(el,{value,cancel:rollReel(el,state.value,value)});
}
function hud(){setSpinningCounter($('score'),st.score);$('time').textContent=st.time;$('lives').innerHTML=[0,1,2].map(i=>'<svg class="life-heart'+(i>=st.lives?' lost':'')+(st.brokenLives.includes(i)?' cracked':'')+(i===st.lostLife?' breaking':'')+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/><path class="life-heart-crack" d="m13.5 7.5-2.2 4 2.2 1.2-2.5 4.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>').join('');st.lostLife=null;$('combo').textContent=st.combo>=2?'คอมโบ x'+st.combo:'';const b=$('bar');b.style.transform='scaleX('+Math.max(st.time,0)/60+')';b.style.backgroundColor=st.time<=10?'#dc2626':'#16a34a'}
function flash(bin,ok){const el=document.querySelector('.bin[data-bin="'+bin+'"]');if(!el)return;el.classList.remove('ok','no');void el.offsetWidth;el.classList.add(ok?'ok':'no');setTimeout(()=>el.classList.remove('ok','no'),500)}
function say(t,c){const m=$('msg');m.textContent=t;m.style.color=c}
function celebrate(options){if(typeof window.confetti==='function')window.confetti(options)}
function drop(bin){
  if(!st||st.over||st.answering)return;
  st.answering=true;
  flash(bin,bin===cur[1]);$('game').classList.remove('armed');if(bin===cur[1]){
    st.combo++;st.right++;st.maxCombo=Math.max(st.maxCombo,st.combo);
    st.score+=10+Math.min(st.combo-1,5)*2;
    if(st.combo>0&&st.combo%5===0){sound.playCombo();celebrate({disableForReducedMotion:true,particleCount:80,spread:70,origin:{y:.7}})}else sound.playCorrect();
    say('ถูกต้อง '+cur[0]+' ทิ้งใน'+BIN_TH[bin],'var(--ok)');
  }else{
    st.combo=0;st.lives--;st.brokenLives.push(st.lives);st.lostLife=st.lives;sound.playWrong();
    $('item').classList.add('shake');
    say('ผิดถัง '+cur[0]+' ต้องทิ้งใน'+BIN_TH[cur[1]],'var(--bad)');
  }
  hud();
  if(st.lives<=0){end();return}
  setTimeout(()=>{if(!st.over)next()},450);
}
function start(){
  sound.init();
  st={score:0,time:60,lives:3,combo:0,maxCombo:0,right:0,brokenLives:[],lostLife:null,over:false,answering:false};bag=[];recentBins=[];
  ['finalScore','finalRight','finalCombo','best'].forEach(id=>setSpinningCounter($(id),0));
  show('game');say('','');hud();next();
  clearInterval(timer);
  timer=setInterval(()=>{st.time--;hud();if(st.time<=0)end()},1000);
}
function end(){
  if(st.over)return;st.over=true;clearInterval(timer);sound.playEnd();
  if(st.score>best){best=st.score;try{localStorage.setItem('wsg_best',best)}catch(e){}}
  setSpinningCounter($('finalScore'),st.score);setSpinningCounter($('finalRight'),st.right);setSpinningCounter($('finalCombo'),st.maxCombo);setSpinningCounter($('best'),best);
  $('endTier').textContent=st.score>=200?'ยอดเยี่ยม':st.score>=100?'ฝีมือดี':'ยังพัฒนาได้อีก';
  if(st.score>=100)celebrate({disableForReducedMotion:true,particleCount:150,spread:90,origin:{y:.6}});
  show('end');if(window.lbReset)window.lbReset();
}

/* Velaris: animated simplex-noise gradient cover (WebGL) */
(function(){
  const cv=$('bgc'),gl=cv.getContext('webgl');if(!gl)return;
  const VS='attribute vec2 position;varying vec2 vUv;void main(){vUv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}';
  const FS=`precision highp float;varying vec2 vUv;uniform vec2 u_resolution;uniform float u_time;uniform float u_grain;uniform vec3 u_colors[4];uniform vec3 u_bg;
vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);
vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;
vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;
m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.0*dot(m,g);}
void main(){vec2 uv=vUv;float ratio=u_resolution.x/u_resolution.y;vec2 p=uv-0.5;p.x*=ratio;float t=u_time*0.1;
float n1=snoise(p*0.4+vec2(t*0.2,-t*0.3));float n2=snoise(p*0.55+vec2(-t*0.15,t*0.25)+n1*0.25);float n3=snoise(p*0.75+vec2(t*0.1,-t*0.2)+n2*0.2);
vec3 col=u_bg;float dist=length(p)*1.5;float vignette=1.0-smoothstep(0.3,1.2,dist);
col=mix(col,u_colors[0],smoothstep(-0.2,0.5,n1)*0.85);col=mix(col,u_colors[1],smoothstep(-0.1,0.6,n2)*0.7);
col=mix(col,u_colors[2],smoothstep(-0.3,0.4,n3)*0.6);col=mix(col,u_colors[3],smoothstep(0.0,0.7,n1*n2)*0.5);
float glow=smoothstep(0.8,0.0,dist)*0.3;col+=u_colors[1]*glow;col=mix(col*0.2,col,vignette);
float grain=fract(sin(dot(uv,vec2(12.9898,78.233))*1.0)*43758.5453+u_time);col+=(grain-0.5)*u_grain*0.1;gl_FragColor=vec4(col,1.0);}`;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
  const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pg);
  if(!gl.getProgramParameter(pg,gl.LINK_STATUS))return;
  gl.useProgram(pg);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(pg,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  const L=n=>gl.getUniformLocation(pg,n);
  const hex=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)};
  const COLORS=['#86efac','#4ade80','#059669','#000000'],SPEED=2.0,GRAIN=0.3;
  const flat=new Float32Array(COLORS.flatMap(hex));
  const resize=()=>{const d=Math.min(window.devicePixelRatio||1,2);cv.width=innerWidth*d;cv.height=innerHeight*d;gl.viewport(0,0,cv.width,cv.height)};
  resize();addEventListener('resize',resize);
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const draw=t=>{
    if(!$('start').classList.contains('hidden')){
      gl.uniform2f(L('u_resolution'),cv.width,cv.height);gl.uniform1f(L('u_time'),t*0.001*SPEED);
      gl.uniform1f(L('u_grain'),GRAIN);gl.uniform3f(L('u_bg'),0,0,0);gl.uniform3fv(L('u_colors'),flat);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    if(!still)requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

$('startBtn').onclick=start;$('again').onclick=start;$('home').onclick=()=>{show('start');$('start').scrollTop=0};
/* Orbital bin guide (vanilla port of the radial orbital timeline) */
(function(){
  const BINS=[
    {id:'green',n:1,title:'ถังเขียว',c:'#16a34a',t:'#052e16',info:'ขยะอินทรีย์ที่ย่อยสลายได้ตามธรรมชาติ เช่น เศษอาหาร เปลือกผลไม้ เศษผัก',rel:['blue']},
    {id:'yellow',n:2,title:'ถังเหลือง',c:'#facc15',t:'#422006',info:'วัสดุรีไซเคิลที่นำกลับมาใช้ใหม่ได้ เช่น ขวด กระป๋อง กระดาษ',rel:['blue']},
    {id:'blue',n:3,title:'ถังฟ้า',c:'#2563eb',t:'#fff',info:'ขยะทั่วไปที่ไม่อาจรีไซเคิลหรือย่อยสลายได้ เช่น ถุงขนม โฟม ทิชชู่ใช้แล้ว',rel:['green','yellow','red']},
    {id:'red',n:4,title:'ถังแดง',c:'#dc2626',t:'#fff',info:'ขยะอันตรายที่ต้องคัดแยกอย่างระมัดระวัง เช่น แบตเตอรี่ หลอดไฟ ยาหมดอายุ',rel:['blue']}
  ];
  const orb=$('orb'),info=$('orbInfo'),ring=$('orbRing'),core=orb.querySelector('.ocore');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let R=140,rot=0,target=null,active=null,last=0,lw=0,lh=0;
  const els={};
  BINS.forEach(b=>{
    const n=document.createElement('button');n.type='button';n.className='onode';n.setAttribute('aria-label',b.title);n.setAttribute('aria-pressed','false');
    n.innerHTML='<span class="obub" style="background:'+b.c+';color:'+b.t+'">'+b.n+'</span><span class="olab caption-4">'+b.title+'</span>';
    n.onclick=e=>{e.stopPropagation();select(b.id)};
    orb.append(n);els[b.id]=n;
  });
  function size(){R=Math.max(56,Math.min(150,orb.clientWidth/2-40,(window.innerHeight-304)/2));orb.style.height=(2*R+124)+'px';ring.style.width=ring.style.height=2*R+'px'}
  function place(){
    BINS.forEach((b,i)=>{
      const a=(i/BINS.length*360+rot)*Math.PI/180,el=els[b.id],on=active===b.id;
      el.style.transform='translate('+R*Math.cos(a)+'px,'+R*Math.sin(a)+'px)';
      el.style.zIndex=on?200:Math.round(100+50*Math.cos(a));
      el.style.opacity=active?(on?1:.7):.7;
    });
  }
  let swapT=0,box=null,oc=null;
  function build(){
    if(!active)return '';
    const b=BINS.find(x=>x.id===active),it=ITEMS.filter(x=>x[1]===b.id);
    return '<div class="flex items-center justify-between gap-3"><span class="obadge" style="background:'+b.c+';color:'+b.t+'">ถังที่ '+b.n+'</span></div>'
      +'<div class="title-3 mt-3">'+b.title+'</div>'
      +'<p class="body-6 text-white/80 mt-1">'+b.info+'</p>';
  }
  function render(){
    if(!box){info.innerHTML='<div class="oinfo hid"><div class="oc"></div></div>';box=info.firstChild;oc=box.firstChild}
    const cur=BINS.find(x=>x.id===active);
    box.style.borderColor=cur?cur.c:'';
    const wasHid=box.classList.contains('hid');box.classList.toggle('hid',!cur);
    const apply=()=>{
      oc.innerHTML=build();oc.classList.remove('out');
      const bar=oc.querySelector('.obar');
      if(bar)requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.transform='scaleX('+bar.dataset.w+')'}));
    };
    clearTimeout(swapT);
    if(!cur){oc.classList.add('out');oc.innerHTML='';return}
    if(reduce||wasHid||!oc.innerHTML){apply();return}
    oc.classList.add('out');swapT=setTimeout(apply,250);
  }
  function sync(){
    const cur=BINS.find(x=>x.id===active);
    BINS.forEach(b=>{els[b.id].classList.toggle('on',active===b.id);els[b.id].classList.toggle('rel',!!cur&&cur.rel.includes(b.id));els[b.id].setAttribute('aria-pressed',String(active===b.id))});
    core.classList.toggle('x',!!active);render();place();
  }
  function select(id){
    if(active===id){active=null;target=null}
    else{active=id;target=270-BINS.findIndex(x=>x.id===id)/BINS.length*360;if(reduce){rot=target;target=null}}
    sync();
  }
  orb.onclick=e=>{if(!e.target.closest('.onode')){active=null;target=null;sync()}};
  info.onclick=e=>{const r=e.target.closest('[data-id]');if(r)select(r.dataset.id)};
  function tick(t){
    const dt=Math.min(t-last,64);last=t;
    if(!$('start').classList.contains('hidden')){
      if(orb.clientWidth!==lw||window.innerHeight!==lh){lw=orb.clientWidth;lh=window.innerHeight;size()}
      if(target!==null){const d=(((target-rot+180)%360)+360)%360-180;rot+=d*Math.min(1,dt*.005);if(Math.abs(d)<.2){rot=target;target=null}}
      else if(!active&&!reduce)rot=(rot+dt*.006)%360;
      place();
    }
    requestAnimationFrame(tick);
  }
  size();sync();requestAnimationFrame(tick);
})();

/* Section reveal: rise 32px and fade in once */
(function(){
  const rv=[...document.querySelectorAll('.rv')];
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{root:$('start'),threshold:.15});
  rv.forEach(e=>io.observe(e));
})();

/* Tagline reveal: words fade in one at a time while scrolling */
(function(){
  const tag=$('tag'),txt=tag.dataset.t;
  const segs=('Segmenter' in Intl)?[...new Intl.Segmenter('th',{granularity:'word'}).segment(txt)].map(x=>x.segment):txt.split(/(\s+)/);
  tag.textContent='';
  let pos=0,wordIndex=0;const hl=tag.dataset.hl||'',hs=hl?txt.indexOf(hl):-1,he=hs+hl.length;segs.forEach(x=>{const p=pos;pos+=x.length;if(x.includes('\n')){tag.append(document.createElement('br'));return}if(!x.trim()){tag.append(x);return}const w=document.createElement('span');w.className='w'+(hs>=0&&p>=hs&&p+x.length<=he?' hl':'');w.textContent=x;const side=wordIndex%2===0?-1:1;w.style.setProperty('--word-x',(side*(22+(wordIndex*13)%24))+'px');w.style.setProperty('--word-y',((wordIndex%2===0?1:-1)*(14+(wordIndex*7)%16))+'px');w.style.setProperty('--word-rotate',(side*(3+wordIndex%4))+'deg');w.style.transitionDelay=Math.min(wordIndex*42,700)+'ms';wordIndex++;tag.append(w)});
  const ws=[...tag.querySelectorAll('.w')];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ws.forEach(w=>w.classList.add('on'));return}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){ws.forEach(w=>w.classList.add('on'));io.unobserve(tag)}}),{root:$('start'),rootMargin:'0px 0px -35% 0px'});
  io.observe(tag);
})();
/* Shared Supabase leaderboard */
(function(){
  const box=$('lb'),list=$('lbList'),form=$('lbForm'),nameEntry=$('lbNameEntry'),nameIn=$('lbName'),nameHint=$('lbNameHint'),save=$('lbSave'),msg=$('lbMsg');
  const confirmDialog=$('lbConfirm'),confirmName=$('lbConfirmName'),confirmScore=$('lbConfirmScore'),cancel=$('lbCancel'),confirm=$('lbConfirmSubmit');
  const homeList=$('homeLbList');
  const againButton=$('again');
  const moreButton=$('homeLbMore'),moreDialog=$('lbMoreDialog'),moreClose=$('lbMoreClose'),moreList=$('lbMoreList'),myRank=$('lbMyRank');
  let db=null,uid=null,ready=false,busy=false,nameLocked=false,scoreSent=false,pendingName='',latestRows=[],moreClosing=false,connectionMessage='กำลังเชื่อม Supabase',leaderboardRequest=0;
  const defaultNameHint=nameHint.textContent;
  try{nameIn.value=localStorage.getItem('wsg_name')||''}catch(e){}
  function say2(t){msg.textContent=t}
  function clearDuplicateName(){nameIn.classList.remove('is-duplicate');nameHint.classList.remove('is-duplicate');nameIn.setAttribute('aria-invalid','false');nameHint.textContent=defaultNameHint}
  nameIn.addEventListener('input',clearDuplicateName);
  function lockName(name){
    if(!name)return;
    nameLocked=true;nameIn.value=name;nameIn.readOnly=true;nameEntry.classList.add('is-hidden');
  }
  function updateSave(){
    save.disabled=busy||scoreSent||!ready||!st||st.score<=0;
    againButton.disabled=busy;
    save.textContent=scoreSent?'ส่งแล้ว':st&&st.score>0?'ส่งคะแนน '+st.score:'ยังไม่มีคะแนนให้ส่ง';
  }
  function renderHome(rows){
    homeList.textContent='';
    const rankColors=['home-rank-gold','home-rank-silver','home-rank-bronze','home-rank-muted','home-rank-muted'];
    for(let i=0;i<5;i++){
      const v=rows[i],li=document.createElement('li');
      li.className=('home-rank-row '+rankColors[i]+' flex items-center gap-3 border-b border-white/15 py-2 last:border-b-0').trim();
      const rk=document.createElement('span');rk.className=(i<3?'caption-1 tnum w-5':'caption-1 text-white/60 tnum w-5');rk.textContent=String(i+1);
      const nm=document.createElement('span');nm.className='title-4 flex-1 truncate';nm.textContent=v?String(v.name||'').slice(0,16)||'---':'---';
      const sc=document.createElement('span');sc.className='title-4 tnum w-10 text-right';sc.textContent=v&&typeof v.score==='number'?v.score:'--';
      li.append(rk,nm,sc);homeList.append(li);
    }
  }
  function render(rows){
    renderHome(rows);
    list.textContent='';
    if(!rows.length){const li=document.createElement('li');li.className='caption-1 muted py-2 text-center';li.textContent='ยังไม่มีคะแนน เป็นคนแรกเลย';list.append(li);return}
    rows.slice(0,10).forEach((v,i)=>{
      const li=document.createElement('li');
      li.className='flex items-center gap-3 px-2 py-2 rounded-lg';
      if(v.is_you===true)li.style.background='rgba(253,211,77,.2)';
      const rk=document.createElement('span');rk.className='tnum caption-1 muted';rk.style.width='28px';rk.textContent=['🥇','🥈','🥉'][i]||String(i+1);
      const nm=document.createElement('span');nm.className='title-4 flex-1 truncate';nm.textContent=String(v.name||'').slice(0,16)||'ไม่ระบุชื่อ';
      const sc=document.createElement('span');sc.className='heading-6 tnum';sc.textContent=typeof v.score==='number'?v.score:0;
      li.append(rk,nm,sc);list.append(li);
    });
  }
  async function refreshLeaderboard(){
    const request=++leaderboardRequest;
    const {data,error}=await db.rpc('get_leaderboard');
    if(error)throw error;
    if(request!==leaderboardRequest)return;
    latestRows=data||[];render(latestRows);
    if(moreDialog.open)renderMore(latestRows);
  }
  function renderMore(rows){
    moreList.textContent='';
    if(!rows.length){const li=document.createElement('li');li.className='caption-1 muted py-3 text-center';li.textContent='ยังไม่มีคะแนน';moreList.append(li);return}
    rows.forEach((v,i)=>{
      const li=document.createElement('li');li.className='lb-more-row'+(v.is_you===true?' is-you':'');
      const rank=document.createElement('span');rank.className='tnum';rank.textContent=String(i+1);
      const player=document.createElement('span');player.className='lb-more-player';player.textContent=String(v.name||'ไม่ระบุชื่อ').slice(0,16);
      const score=document.createElement('strong');score.className='tnum';score.textContent=String(v.score??0);
      li.append(rank,player,score);moreList.append(li);
    });
  }
  moreButton.onclick=async function(){
    if(!ready||!db)return;
    renderMore(latestRows);myRank.textContent='';myRank.hidden=true;moreDialog.classList.remove('is-closing');moreDialog.showModal();moreClose.focus();
    try{
      const {data,error}=await db.rpc('get_player_rank');
      if(error)throw error;
      myRank.textContent=data===null?'คุณยังไม่มีอันดับ':`คุณอยู่อันดับที่ ${data}`;myRank.hidden=false;
    }catch(e){myRank.textContent='';myRank.hidden=true}
    try{await refreshLeaderboard()}catch(e){console.warn('Leaderboard refresh failed',e)}
  };
  function closeMoreDialog(){
    if(!moreDialog.open||moreClosing)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){moreDialog.close();return}
    moreClosing=true;moreDialog.classList.add('is-closing');
    window.setTimeout(()=>{if(moreDialog.open)moreDialog.close();moreDialog.classList.remove('is-closing');moreClosing=false},240);
  }
  moreClose.onclick=closeMoreDialog;
  moreDialog.addEventListener('cancel',event=>{event.preventDefault();closeMoreDialog()});
  moreDialog.addEventListener('click',event=>{if(event.target===moreDialog)closeMoreDialog()});
  window.lbReset=function(){busy=false;scoreSent=false;say2(ready&&nameLocked?'ใช้ชื่อเดิมส่งคะแนนได้ตามปกติ':connectionMessage);updateSave()};
  save.onclick=async function(){
    if(busy||!ready||!uid||!st)return;
    if(nameLocked){submitScore(nameIn.value);return}
    const name=nameIn.value.trim().slice(0,16);
    if(!name){say2('ใส่ชื่อเล่นก่อนส่งคะแนน');nameIn.focus();return}
    pendingName=name;confirmName.textContent=name;confirmScore.textContent=String(st.score);confirmDialog.showModal();confirm.focus();
  };
  cancel.onclick=function(){pendingName='';confirmDialog.close();save.focus()};
  confirmDialog.addEventListener('cancel',()=>{pendingName=''});
  async function submitScore(name){
    if(busy||scoreSent||!name)return;
    busy=true;updateSave();confirm.disabled=true;
    try{
      const {data,error}=await db.rpc('submit_score',{p_name:name,p_score:st.score,p_right_count:st.right,p_max_combo:st.maxCombo});
      if(error)throw error;
      const saved=Array.isArray(data)?data[0]:data;
      if(!saved)throw new Error('Supabase ไม่ส่งข้อมูลคะแนนกลับมา');
      const hadName=nameLocked;lockName(saved.name);scoreSent=true;
      try{localStorage.setItem('wsg_name',saved.name)}catch(e){}
      say2(saved.score>st.score?'คะแนนสูงสุดเดิมของคุณคือ '+saved.score+' เก็บไว้ตามเดิม':hadName?'อัปเดตคะแนนแล้ว ใช้ชื่อเดิม':'บันทึกคะแนนแล้ว รอบต่อไปใช้ชื่อเดิมส่งคะแนนได้');
      try{await refreshLeaderboard()}catch(e){console.warn('Leaderboard refresh failed',e)}
    }catch(e){
      if(e&&e.code==='invalid_argument'){form.classList.add('hidden');say2('บัญชีนี้ยังส่งคะแนนไม่ได้ ดูอันดับได้อย่างเดียว')}
      else if(e&&e.code==='23505'){
        nameIn.classList.add('is-duplicate');nameHint.classList.add('is-duplicate');nameIn.setAttribute('aria-invalid','true');nameHint.textContent='ชื่อซ้ำ';say2('ชื่อซ้ำ');
        window.setTimeout(()=>nameIn.focus(),0);
      }
      else if(e&&e.code==='22023'){say2('ข้อมูลคะแนนไม่ตรงกับรูปแบบเกม ลองเล่นใหม่')}
      else{say2('ส่งคะแนนไม่สำเร็จ ตรวจการตั้งค่า Supabase แล้วลองใหม่')}
    }finally{
      busy=false;confirm.disabled=false;pendingName='';if(confirmDialog.open)confirmDialog.close();updateSave();
    }
  }
  confirm.onclick=()=>{if(!pendingName)return;submitScore(pendingName)};
  (async function(){
    try{
      const connection=await window.supabaseReady;
      db=connection&&connection.client;uid=connection&&connection.user&&connection.user.id;
      if(!db||!uid){
        connectionMessage=connection&&connection.error?connection.error.message:'เชื่อม Supabase ไม่สำเร็จ';
        form.classList.add('hidden');list.textContent='';const li=document.createElement('li');li.className='caption-1 muted py-2 text-center';li.textContent=connectionMessage;list.append(li);renderHome([]);box.classList.remove('hidden');say2(connectionMessage);return;
      }
      const {data:own,error:ownError}=await db.from('scores').select('name').eq('user_id',uid).maybeSingle();
      if(ownError)throw ownError;
      if(own&&own.name)lockName(own.name);
      await refreshLeaderboard();
      ready=true;connectionMessage='';moreButton.hidden=false;box.classList.remove('hidden');updateSave();
      db.channel('leaderboard').on('postgres_changes',{event:'*',schema:'public',table:'scores'},()=>{refreshLeaderboard().catch(e=>console.warn('Leaderboard refresh failed',e))}).subscribe();
      window.setInterval(()=>{if(document.visibilityState==='visible')refreshLeaderboard().catch(e=>console.warn('Leaderboard refresh failed',e))},15000);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshLeaderboard().catch(e=>console.warn('Leaderboard refresh failed',e))});
    }catch(e){
      connectionMessage='เชื่อม Supabase ไม่สำเร็จ ตรวจ URL, key และไฟล์ setup.sql';
      form.classList.add('hidden');list.textContent='';const li=document.createElement('li');li.className='caption-1 muted py-2 text-center';li.textContent=connectionMessage;list.append(li);renderHome([]);box.classList.remove('hidden');say2(connectionMessage);
    }
  })();
})();

/* Smooth inertia scrolling for the start screen (mouse wheel / trackpad) */
(function(){
  const el=$('start');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let target=0,cur=0,anim=false,last=0;
  const max=()=>el.scrollHeight-el.clientHeight;
  function loop(t){
    const dt=Math.min(t-last,50);last=t;
    const d=target-cur;
    if(Math.abs(d)<.3){cur=target;el.scrollTop=cur;anim=false;return}
    cur+=d*(1-Math.exp(-dt/140));
    el.scrollTop=cur;
    requestAnimationFrame(loop);
  }
  el.addEventListener('wheel',e=>{
    if(e.ctrlKey)return;
    e.preventDefault();
    if(!anim){cur=el.scrollTop;target=cur}
    let dy=e.deltaY;
    if(e.deltaMode===1)dy*=32;else if(e.deltaMode===2)dy*=el.clientHeight;
    target=Math.max(0,Math.min(max(),target+dy));
    if(!anim){anim=true;last=performance.now();requestAnimationFrame(loop)}
  },{passive:false});
  el.addEventListener('scroll',()=>{if(!anim){cur=el.scrollTop;target=cur}});
})();

/* Scroll cue line: stretch down to just above the tagline */
(function(){
  const cue=document.querySelector('.scrollcue'),tag=$('tag');
  if(!cue||!tag)return;
  function fit(){
    if($('start').classList.contains('hidden'))return;
    const h=tag.getBoundingClientRect().top-cue.getBoundingClientRect().top-72;
    cue.style.height=Math.max(0,h)+'px';
  }
  fit();addEventListener('resize',fit);addEventListener('load',fit);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
  if('ResizeObserver' in window)new ResizeObserver(fit).observe(tag);
})();
$('mute').onclick=()=>{sound.muted=!sound.muted;$('mute').setAttribute('aria-pressed',String(!sound.muted));$('mute').setAttribute('aria-label',sound.muted?'เปิดเสียง':'ปิดเสียง')};
$('item').addEventListener('click',()=>{selected=!selected;$('item').classList.toggle('sel',selected);$('game').classList.toggle('armed',selected)});
$('item').addEventListener('dragstart',()=>$('game').classList.add('armed'));
$('item').addEventListener('dragend',()=>$('game').classList.remove('armed'));
document.addEventListener('keydown',e=>{const m={'1':'green','2':'yellow','3':'blue','4':'red'};if(m[e.key]&&st&&!st.over&&!$('game').classList.contains('hidden'))drop(m[e.key])});
$('item').addEventListener('animationend',e=>e.target.classList.remove('shake'));
$('item').addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain','item');e.dataTransfer.effectAllowed='move'});
document.querySelectorAll('.bin').forEach(b=>{
  b.addEventListener('click',()=>{if(selected)drop(b.dataset.bin);else say('แตะเลือกขยะก่อน แล้วจึงเลือกถัง','var(--muted)')});
  b.addEventListener('dragover',e=>{e.preventDefault();b.classList.add('over')});
  b.addEventListener('dragleave',()=>b.classList.remove('over'));
  b.addEventListener('drop',e=>{e.preventDefault();b.classList.remove('over');drop(b.dataset.bin)});
});
// Touch drag support
let ghost=null;
$('item').addEventListener('touchstart',e=>{
  const t=e.touches[0];ghost=$('item').cloneNode(true);ghost.removeAttribute('id');
  ghost.style.cssText='position:fixed;z-index:50;pointer-events:none;opacity:.85;width:110px;height:110px;left:'+(t.clientX-55)+'px;top:'+(t.clientY-55)+'px';
  document.body.appendChild(ghost);
},{passive:true});
$('item').addEventListener('touchmove',e=>{
  if(!ghost)return;const t=e.touches[0];e.preventDefault();
  ghost.style.left=(t.clientX-55)+'px';ghost.style.top=(t.clientY-55)+'px';
  const el=document.elementFromPoint(t.clientX,t.clientY),b=el&&el.closest('.bin');
  document.querySelectorAll('.bin').forEach(x=>x.classList.toggle('over',x===b));
},{passive:false});
$('item').addEventListener('touchend',e=>{
  if(!ghost)return;const t=e.changedTouches[0];ghost.remove();ghost=null;
  document.querySelectorAll('.bin').forEach(x=>x.classList.remove('over'));
  const el=document.elementFromPoint(t.clientX,t.clientY),b=el&&el.closest('.bin');
  if(b){e.preventDefault();drop(b.dataset.bin)}
});
document.querySelectorAll('.glow-card').forEach(card=>{
  card.addEventListener('pointermove',event=>{
    const bounds=card.getBoundingClientRect();
    card.style.setProperty('--glow-x',`${event.clientX-bounds.left}px`);
    card.style.setProperty('--glow-y',`${event.clientY-bounds.top}px`);
    card.classList.add('is-glowing');
  });
  card.addEventListener('pointerleave',()=>card.classList.remove('is-glowing'));
});
const intro=$('intro'),introVideo=$('introVideo'),introStatus=$('introStatus'),introPlay=$('introPlay');
const introReduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let introClosing=false,introFallbackTimer=null;
function showIntroFallback(message){
  intro.classList.remove('has-video');
  introStatus.textContent=message;
  introPlay.hidden=false;
}
function returnToHomepage(message){
  showIntroFallback(message);
  clearTimeout(introFallbackTimer);
  introFallbackTimer=setTimeout(finishIntro,2500);
}
function finishIntro(){
  if(introClosing)return;
  introClosing=true;intro.classList.add('is-exiting');
  clearTimeout(introFallbackTimer);
  const removeIntro=()=>{introVideo.pause();intro.remove()};
  intro.addEventListener('transitionend',removeIntro,{once:true});
  setTimeout(removeIntro,introReduceMotion?0:1500);
}
introVideo.addEventListener('ended',finishIntro);
introVideo.addEventListener('error',()=>{
  returnToHomepage('วิดีโอเล่นไม่ได้ กำลังเข้าสู่เว็บไซต์');
});
introVideo.addEventListener('playing',()=>{
  clearTimeout(introFallbackTimer);
  intro.classList.add('has-video');
  introStatus.textContent='';
  introPlay.hidden=true;
});
introPlay.addEventListener('click',()=>{
  clearTimeout(introFallbackTimer);
  introStatus.textContent='';
  introVideo.play().then(()=>{introPlay.hidden=true}).catch(()=>{
    returnToHomepage('เล่นวิดีโอไม่สำเร็จ กำลังเข้าสู่เว็บไซต์');
  });
});
if(introReduceMotion){
  finishIntro();
}else{
  introVideo.play().catch(()=>{
    returnToHomepage('กดเล่นวิดีโอ หรือรอสักครู่เพื่อเข้าสู่เว็บไซต์');
  });
}
setTimeout(()=>{
  if(!introClosing&&!intro.classList.contains('has-video')&&introVideo.readyState<2){
    returnToHomepage('โหลดวิดีโอไม่สำเร็จ กำลังเข้าสู่เว็บไซต์');
  }
},5000);
