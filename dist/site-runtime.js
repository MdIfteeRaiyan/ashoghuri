(function(){
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/service-worker.js').catch(function(){});},{once:true});}
  var video=document.getElementById('heroMontage');
  if(!video)return;
  var connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var slow=function(){return !!(connection&&(connection.saveData||/^(slow-2g|2g)$/.test(connection.effectiveType||'')));};
  video.removeAttribute('autoplay');video.autoplay=false;video.preload='none';
  if(reduce||slow())return;
  var play=function(){if(document.hidden||slow())return;video.preload='metadata';var p=video.play();if(p&&p.catch)p.catch(function(){});};
  if('IntersectionObserver' in window){var observer=new IntersectionObserver(function(entries){if(entries.some(function(e){return e.isIntersecting})){play();observer.disconnect();}},{rootMargin:'160px'});observer.observe(video);}else play();
  document.addEventListener('visibilitychange',function(){if(document.hidden)video.pause();else if(!reduce&&!slow())play();});
  if(connection&&connection.addEventListener)connection.addEventListener('change',function(){if(slow())video.pause();});
})();
