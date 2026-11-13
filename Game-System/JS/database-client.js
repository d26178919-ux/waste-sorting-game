(function(){
  window.supabaseReady=(async function(){
    const config=window.SUPABASE_CONFIG||{};
    if(!window.supabase||typeof window.supabase.createClient!=='function'){
      throw new Error('โหลด Supabase client ไม่สำเร็จ');
    }
    if(!config.url||config.url.includes('YOUR_PROJECT_REF')||!config.publishableKey||config.publishableKey.includes('YOUR_SUPABASE')){
      throw new Error('กรุณาใส่ Project URL และ publishable key ใน database-config.js');
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
