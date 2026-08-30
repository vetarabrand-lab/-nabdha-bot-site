(function(){
    var FUNCTIONS_BASE = 'https://anptuwcfvfcjqtqqnirt.supabase.co/functions/v1';
    var toggle = document.getElementById('nabdaChatToggle');
    var panel = document.getElementById('nabdaChatPanel');
    var closeBtn = document.getElementById('nabdaChatClose');
    var chatBody = document.getElementById('nabdaChatBody');
    var input = document.getElementById('nabdaChatInput');
    var sendBtn = document.getElementById('nabdaChatSend');
    var dot = document.getElementById('nabdaChatDot');
    var statusText = document.getElementById('nabdaChatStatusText');
    if(!toggle || !panel) return;

    var sessionId = null;
    try{ sessionId = localStorage.getItem('nabda_chat_session_id'); }catch(e){}
    var lastSeen = null;
    var pollTimer = null;
    var isOpen = false;
    var sending = false;
    var historyLoaded = false;

    function addMsg(text, cls){
      var div = document.createElement('div');
      div.className = 'nabda-chat-msg ' + cls;
      div.textContent = text;
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    }

    function applyStatus(status){
      if(status === 'escalated' || status === 'human_active'){
        statusText.textContent = 'تم تحويلك لفريق الدعم';
      } else {
        statusText.textContent = 'مساعدنا الذكي جاهز يجاوبك';
      }
    }

    function loadHistory(){
      if(!sessionId || historyLoaded) return;
      historyLoaded = true;
      fetch(FUNCTIONS_BASE + '/site-chat-poll?session_id=' + encodeURIComponent(sessionId) + '&after=1970-01-01T00:00:00Z')
        .then(function(r){ return r.json(); })
        .then(function(data){
          if(!data || !data.messages) return;
          chatBody.innerHTML = '';
          data.messages.forEach(function(m){
            addMsg(m.message, m.sender_type === 'visitor' ? 'out' : 'in');
            lastSeen = m.created_at;
          });
          applyStatus(data.status);
        })
        .catch(function(){});
    }

    function poll(){
      if(!sessionId || !isOpen) return;
      var after = lastSeen || '1970-01-01T00:00:00Z';
      fetch(FUNCTIONS_BASE + '/site-chat-poll?session_id=' + encodeURIComponent(sessionId) + '&after=' + encodeURIComponent(after))
        .then(function(r){ return r.json(); })
        .then(function(data){
          if(!data) return;
          (data.messages || []).forEach(function(m){
            if(m.sender_type !== 'visitor'){ addMsg(m.message, 'in'); }
            lastSeen = m.created_at;
          });
          applyStatus(data.status);
        })
        .catch(function(){});
    }

    function startPolling(){
      stopPolling();
      pollTimer = setInterval(poll, 4000);
    }
    function stopPolling(){
      if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
    }

    function sendMessage(){
      var text = input.value.trim();
      if(!text || sending) return;
      sending = true;
      sendBtn.disabled = true;
      addMsg(text, 'out');
      input.value = '';
      fetch(FUNCTIONS_BASE + '/site-chat-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text })
      })
        .then(function(r){ return r.json(); })
        .then(function(data){
          sending = false;
          sendBtn.disabled = false;
          if(!data || data.error){
            addMsg('تعذّر إرسال رسالتك، حاول مرة ثانية.', 'sys');
            return;
          }
          if(data.session_id && data.session_id !== sessionId){
            sessionId = data.session_id;
            historyLoaded = true;
            try{ localStorage.setItem('nabda_chat_session_id', sessionId); }catch(e){}
          }
          (data.messages || []).forEach(function(m){
            addMsg(m.message, 'in');
            lastSeen = m.created_at;
          });
          if(!pollTimer && isOpen){ startPolling(); }
        })
        .catch(function(){
          sending = false;
          sendBtn.disabled = false;
          addMsg('تعذّر الاتصال، تأكد من الإنترنت وحاول مرة ثانية.', 'sys');
        });
    }

    toggle.addEventListener('click', function(e){
      e.stopPropagation();
      var opening = !panel.classList.contains('open');
      panel.classList.toggle('open');
      isOpen = opening;
      dot.style.display = 'none';
      if(opening){
        loadHistory();
        startPolling();
        input.focus();
      } else {
        stopPolling();
      }
    });
    if(closeBtn){
      closeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        panel.classList.remove('open');
        isOpen = false;
        stopPolling();
      });
    }
    document.addEventListener('click', function(e){
      if(!panel.contains(e.target) && !toggle.contains(e.target) && panel.classList.contains('open')){
        panel.classList.remove('open');
        isOpen = false;
        stopPolling();
      }
    });
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); sendMessage(); }
    });
  })();
