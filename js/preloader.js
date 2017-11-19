"use strict";

let preloader = (function (){
  function utoa(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }
  function customBase64Encode (inputStr) {
    let
      bbLen               = 3,
      enCharLen           = 4,
      inpLen              = inputStr.length,
      inx                 = 0,
      jnx,
      keyStr              = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
      output              = "",
      paddingBytes        = 0;
    let
      bytebuffer          = new Array (bbLen),
      encodedCharIndexes  = new Array (enCharLen);

    while (inx < inpLen) {
      for (jnx = 0;  jnx < bbLen;  ++jnx) {
        if (inx < inpLen)
          bytebuffer[jnx] = inputStr.charCodeAt (inx++) & 0xff;
        else
          bytebuffer[jnx] = 0;
      }
      encodedCharIndexes[0] = bytebuffer[0] >> 2;
      encodedCharIndexes[1] = ( (bytebuffer[0] & 0x3) << 4)   |  (bytebuffer[1] >> 4);
      encodedCharIndexes[2] = ( (bytebuffer[1] & 0x0f) << 2)  |  (bytebuffer[2] >> 6);
      encodedCharIndexes[3] = bytebuffer[2] & 0x3f;

      paddingBytes          = inx - (inpLen - 1);
      switch (paddingBytes) {
        case 1:
          encodedCharIndexes[3] = 64;
          break;
        case 2:
          encodedCharIndexes[3] = 64;
          encodedCharIndexes[2] = 64;
          break;
        default:
          break; // No padding - proceed
      }
      for (jnx = 0;  jnx < enCharLen;  ++jnx)
        output += keyStr.charAt ( encodedCharIndexes[jnx] );
    }
    return output;
  }

  let _preloader = {
    progress  : [],
    sizes     : [],
    promises  : [],
    images    : [],
    locations : [],
    onupdate  : null,
    _onupdate : () => {
      let x = 0, y = 0; 
      for (let i = 0; i < _preloader.progress.length; i++){
        x += _preloader.progress[i];
        y += _preloader.sizes[i];
      }
      x = ~~(x / y * 100);
      if (_preloader.onupdate != null){
        _preloader.onupdate(x);
      }
    },
    add   : function(){
      for (let i = 0; i < arguments.length; i++) {
        _preloader.locations.push(arguments[i]);
      }
    },
    start : () => {
      for (let i=0; i<_preloader.locations.length; i++){
        _preloader.progress.push(0);
        _preloader.sizes.push(50000);
        _preloader.images.push(new Image());
        _preloader.promises.push(new Promise((resolve, reject)=>{
          let xhr = new XMLHttpRequest();
          let num = i;
          xhr.onloadstart = e => {_preloader.progress[num] = 2;};
          xhr.onprogress = e => {_preloader.progress[num] = e.loaded; _preloader.sizes[num] = e.total; _preloader._onupdate();};
          xhr.onloadend = e => {
            if ("png" == _preloader.locations[num].slice(-3)){
              let encodedSrc = customBase64Encode(xhr.responseText);
              _preloader.images[num].onload = () => resolve();
              _preloader.images[num].src = 'data:image/png;base64,' + encodedSrc;
            }
            else{
              _preloader.images[num] = null;
              resolve();
            }
          };
          xhr.open("GET", _preloader.locations[num], true);
          xhr.overrideMimeType('text/plain; charset=x-user-defined');
          xhr.send(null);
        }) );
      }
      return new Promise( (resolve, reject) => Promise.all(_preloader.promises).then(() => resolve()) );
    }
  }

  return _preloader;
}());