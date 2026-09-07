(() => {
  if (window !== window.top || globalThis.__atnRailShadowPrelude) return;
  globalThis.__atnRailShadowPrelude = true;
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init){
    if (this?.id === "app-tower-next-host") return original.call(this,{...init,mode:"open"});
    return original.call(this,init);
  };
})();
