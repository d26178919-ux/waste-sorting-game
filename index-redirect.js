(async () => {
  const candidates = ['Game-System/HTML/game-page.html'];
  for (const path of candidates) {
    try {
      const response = await fetch(path, { method: 'HEAD', cache: 'no-store' });
      if (response.ok) {
        location.replace(path + location.search + location.hash);
        return;
      }
    } catch (error) {  }
  }
  const status = document.querySelector('#status');
  if (status) status.textContent = 'ไม่พบไฟล์หน้าเกม ตรวจว่าอัปโหลดโฟลเดอร์ Game-System มาครบแล้ว';
})();
