function digitsOnly(v){ return v.replace(/[^0-9]/g, ''); }

  document.getElementById('genBtn').addEventListener('click', function(){
    const phone = digitsOnly(document.getElementById('phoneInput').value.trim());
    const msg = document.getElementById('msgInput').value.trim();
    const box = document.getElementById('resultBox');

    if(!phone || phone.length < 8){
      alert('الرجاء إدخال رقم واتساب صحيح مع رمز الدولة.');
      return;
    }

    let link = 'https://wa.me/' + phone;
    if(msg){ link += '?text=' + encodeURIComponent(msg); }

    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=' + encodeURIComponent(link);
    document.getElementById('qrImg').src = qrUrl;
    document.getElementById('dlBtn').href = qrUrl;
    box.classList.add('show');
  });
