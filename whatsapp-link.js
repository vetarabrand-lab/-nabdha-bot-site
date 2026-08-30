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

    document.getElementById('resultLink').value = link;
    document.getElementById('openLink').href = link;
    box.classList.add('show');
  });

  document.getElementById('copyBtn').addEventListener('click', function(){
    const input = document.getElementById('resultLink');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(function(){
      const btn = document.getElementById('copyBtn');
      const original = btn.textContent;
      btn.textContent = '✓ تم النسخ';
      setTimeout(function(){ btn.textContent = original; }, 1500);
    });
  });
