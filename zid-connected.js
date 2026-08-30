const params = new URLSearchParams(window.location.search);
  const store = params.get('store');
  const email = params.get('email');
  if(store){ document.getElementById('storeNameEl').textContent = store; }
  if(email){
    document.getElementById('emailEl').textContent = email;
    document.getElementById('emailBox').style.display = 'block';
  }
