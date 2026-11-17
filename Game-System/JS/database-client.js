(function(){
  window.supabaseReady=(async function(){
    const config=window.SUPABASE_CONFIG||{};
    if(!window.supabase||typeof window.supabase.createClient!=='function'){
      throw new Error('โหลด Supabase client ไม่สำเร็จ');
    }
    if(!config.url||config.url.includes('YOUR_PROJECT_REF')||!/^https:\/\//.test(config.url)||!config.publishableKey||config.publishableKey.includes('YOUR_SUPABASE')){
      throw new Error('กรุณาใส่ Project URL (https) และ publishable key ใน database-config.js');
    }
    const key=String(config.publishableKey);
    if(/service_role|sb_secret/i.test(key)){
      throw new Error('ห้ามใช้ service_role key ในฝั่ง client');
    }
    if(key.startsWith('eyJ')){
      try{
        const payload=JSON.parse(atob(key.split('.')[1]||''));
        if(payload && payload.role==='service_role') throw new Error('service_role');
      }catch(e){
        if(String(e && e.message)==='service_role') throw new Error('ห้ามใช้ service_role key ในฝั่ง client');
      }
    }
    const client=window.supabase.createClient(config.url,config.publishableKey);
    let {data:{session},error}=await client.auth.getSession();
    if(error)throw error;
    if(!session){
      const result=await client.auth.signInAnonymously();
      if(result.error)throw result.error;
      session=result.data.session;
    }
    if(!session||!session.user)throw new Error('สร้างบัญชีผู้เล่นไม่สำเร็จ');
    return{client,user:session.user};
  })().catch(error=>({client:null,user:null,error}));
})();
 
