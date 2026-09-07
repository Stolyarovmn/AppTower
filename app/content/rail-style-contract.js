(() => {
  if (window !== window.top) return;
  const SETTINGS='<svg class="tool-icon-svg settings-svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="7.1"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/></svg>';
  function patch(){
    const host=document.getElementById("app-tower-next-host");
    const root=host?.shadowRoot;
    if(!root)return false;
    const footer=root.querySelector(".rail-footer");
    const button=[...footer?.querySelectorAll("button")||[]].find(item=>/Настройки/.test(item.title||item.getAttribute("aria-label")||""));
    if(button && button.dataset.atnUnifiedSettings!=="1"){
      button.dataset.atnUnifiedSettings="1";
      button.innerHTML=SETTINGS;
    }
    return true;
  }
  if(!patch()){
    const observer=new MutationObserver(()=>{if(patch())observer.disconnect();});
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
  setInterval(patch,1000);
})();
