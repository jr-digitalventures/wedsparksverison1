import { supabase } from './supabase-client.js';
import { requireUser, loadAccount, siteUrl, onSessionChange } from './auth.js';

const root = document.querySelector('#messages-root');
const loading = document.querySelector('#messages-loading');
const supplier = root.dataset.messageRole === 'supplier';

const style = document.createElement('style');
style.textContent = [
  '#messages-root{font:15px/1.5 var(--sans);color:var(--ink)}',
  '#messages-root [hidden]{display:none!important}',
  '#messages-root button{font:600 14px/1.4 var(--sans);cursor:pointer}',
  '#messages-root button:disabled{opacity:.5;cursor:default}',
  '#messages-root button:focus-visible,#messages-root input:focus-visible,#messages-root textarea:focus-visible{outline:3px solid #ad7542;outline-offset:3px}',
  '#messages-root .msg-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px;background:#213e34;color:white;border-radius:14px;margin-bottom:22px}',
  '#messages-root .msg-heading h2{font:normal 28px/1.2 Georgia,serif;margin:0 0 6px;color:white}',
  '#messages-root .msg-heading p{margin:0;color:white}',
  '#messages-root .msg-heading button{background:#fffaf0;color:#213e34;border:0;border-radius:8px;padding:13px 17px;white-space:nowrap}',
  '#messages-root .msg-workspace{display:grid;grid-template-columns:minmax(220px,30%) minmax(0,1fr);background:white;border:1px solid #dedbd6;border-radius:14px;overflow:hidden;min-height:500px}',
  '#messages-root .msg-inbox{padding:16px;border-right:1px solid #dedbd6;min-width:0}',
  '#messages-root .msg-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px}',
  '#messages-root h3{font:normal 23px/1.3 Georgia,serif;margin:0}',
  '#messages-root .msg-plain{background:none;border:0;color:#213e34;padding:8px}',
  '#messages-root ul,#messages-root ol{list-style:none;padding:0;margin:0}',
  '#messages-root #msg-inbox-list{margin-top:12px;max-height:540px;overflow-y:auto}',
  '#messages-root .msg-conversation{display:block;text-align:left;width:100%;border:0;border-bottom:1px solid #eee9e2;background:white;color:#213e34;padding:15px 12px;border-radius:7px}',
  '#messages-root .msg-conversation[aria-pressed=true]{background:#f8f4eb;box-shadow:inset 3px 0 #213e34}',
  '#messages-root .msg-conversation strong,#messages-root .msg-conversation span{display:block}',
  '#messages-root .msg-conversation span{font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;margin-top:5px}',
  '#messages-root .msg-pager{display:flex;justify-content:space-between;gap:12px;margin-top:12px}',
  '#messages-root .msg-thread{padding:22px;min-width:0}',
  '#messages-root #msg-thread-meta{font-size:13px;margin:5px 0 12px;color:#59645d}',
  '#messages-root #msg-scroll{height:clamp(260px,45vh,480px);overflow:auto;padding:12px 5px}',
  '#messages-root .msg-message{display:flex;flex-direction:column;align-items:flex-start;margin:0 0 18px}',
  '#messages-root .msg-message.mine{align-items:flex-end}',
  '#messages-root .msg-bubble{white-space:pre-wrap;overflow-wrap:anywhere;background:#f8f4eb;color:#213e34;padding:12px 15px;border-radius:12px;max-width:85%;margin:0}',
  '#messages-root .mine .msg-bubble{background:#213e34;color:white}',
  '#messages-root .msg-message small{font-size:11px;margin:5px 3px;color:#59645d}',
  '#messages-root textarea,#messages-root input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #bdc8be;border-radius:8px;background:white;color:#172a24;font:16px/1.5 var(--sans)}',
  '#messages-root textarea{resize:vertical;min-height:100px}',
  '#messages-root .msg-compose-label{display:block;margin:12px 0 6px}',
  '#messages-root .msg-send-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:10px}',
  '#messages-root .msg-primary{background:#213e34;color:white;border:0;border-radius:8px;padding:12px 20px}',
  '#messages-root .msg-primary:hover{background:#305547;color:white}',
  '#messages-root .msg-notice{font-size:13px;margin:10px 0;min-height:20px}',
  '#messages-root .msg-error{color:#9c322c}',
  '#messages-root .msg-empty{padding:35px 10px;color:#59645d}',
  '#messages-root #msg-new-dialog{position:relative;width:min(560px,92vw);max-height:85svh;overflow:auto;box-sizing:border-box;padding:30px;background:#faf8f4;color:#213e34;border:1px solid #d8ded7;border-radius:14px}',
  '#messages-root #msg-new-dialog::backdrop{background:#0c211c99}',
  '#messages-root #msg-new-dialog h2{font:normal 28px/1.3 Georgia,serif;margin:0 45px 22px 0}',
  '#messages-root .msg-contact{display:block;width:100%;text-align:left;padding:14px 8px;background:transparent;border:0;border-bottom:1px solid #ddd;color:#213e34}',
  '#messages-root .msg-contact small{display:block;font-weight:400;margin-top:4px}',
  '#messages-root .ws-popup-cross{position:absolute;right:12px;top:10px;width:44px;height:44px;background:transparent;border:0;color:#213e34;font-size:30px}',
  '#messages-root #msg-contacts{margin-top:12px}',
  'body[data-page=messages] main.auth-content{max-width:1250px}',
  '@media(max-width:850px){#messages-root .msg-workspace{grid-template-columns:1fr}#messages-root .msg-inbox{border-right:0;border-bottom:1px solid #dedbd6}#messages-root #msg-inbox-list{max-height:220px}#messages-root .msg-heading{align-items:flex-start;flex-wrap:wrap}#messages-root .msg-thread{padding:16px}#messages-root .msg-bubble{max-width:94%}}'
].join('\n');
document.head.append(style);

root.innerHTML = [
  '<div class="msg-heading"><div><h2>Every conversation, together</h2><p>Keep your wedding plans in touch.</p></div><button id="msg-new" type="button">New conversation</button></div>',
  '<div class="msg-workspace"><aside class="msg-inbox" aria-label="Conversations"><div class="msg-toolbar"><h3>Conversations</h3></div>',
  '<p id="msg-inbox-status" class="msg-notice" role="status"></p><ul id="msg-inbox-list"></ul><div class="msg-pager"><button id="msg-prev" class="msg-plain" type="button">Previous</button><button id="msg-next" class="msg-plain" type="button">Next</button></div></aside>',
  '<section class="msg-thread" aria-label="Selected conversation"><p id="msg-welcome" class="msg-empty">Choose a conversation to read and reply.</p><div id="msg-detail" hidden><h3 id="msg-thread-title"></h3><p id="msg-thread-meta"></p>',
  '<button id="msg-earlier" class="msg-plain" type="button" hidden>Earlier messages</button><p id="msg-thread-status" class="msg-notice" role="status"></p>',
  '<div id="msg-scroll" tabindex="0" aria-label="Message history"><ol id="msg-history"></ol></div>',
  '<form id="msg-form"><label class="msg-compose-label" for="msg-body">Your message</label><textarea id="msg-body" maxlength="4000" rows="3" required></textarea><div class="msg-send-row"><small id="msg-count">0 / 4,000</small><button id="msg-send" class="msg-primary" type="submit">Send message</button></div><p id="msg-send-status" class="msg-notice" role="status"></p></form></div></section></div>',
  '<dialog id="msg-new-dialog" aria-labelledby="msg-new-title"><button id="msg-close" class="ws-popup-cross" type="button" aria-label="Close new conversation">&times;</button><h2 id="msg-new-title">Start a conversation</h2><label for="msg-contact-search">Find a business</label><input id="msg-contact-search" type="search" placeholder="Business name" autocomplete="off" maxlength="120"><p id="msg-contact-status" class="msg-notice" role="status"></p><ul id="msg-contacts"></ul><div class="msg-pager"><button id="msg-contact-prev" class="msg-plain" type="button">Previous</button><button id="msg-contact-next" class="msg-plain" type="button">Next</button></div></dialog>'
].join('');

const $ = id => root.querySelector('#' + id);
const dialog = $('msg-new-dialog');
const editor = $('msg-body');
// Guide couples to their wedding team when the inbox is empty.
const conversationWorkspace = root.querySelector('.msg-workspace');
const conversationStart = node('section',null,'msg-start-state');
conversationStart.hidden = true;

const startIcon = node('span',null,'msg-start-icon');
startIcon.setAttribute('aria-hidden','true');
startIcon.innerHTML = '<svg viewBox="0 0 48 48" width="54" height="54" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10h30v23H22l-9 7v-7H9z"/><path d="M24 28l-7-7a4.3 4.3 0 0 1 7-5 4.3 4.3 0 0 1 7 5z" stroke="#ac7d43"/></svg>';

conversationStart.append(
  startIcon,
  node('h3',supplier
    ? 'Your next enquiry starts here'
    : 'Your wedding team starts here'),
  node('p',supplier
    ? 'Enquiries from couples will appear here, ready for you to reply.'
    : 'Find suppliers you love, ask a question and start planning together.')
);

if (!supplier) {
  const explore = node('a','Explore suppliers','msg-explore');
  explore.href = siteUrl('supplier-category/');
  conversationStart.append(explore);
}

const conversationProgress = node(
  'p','Loading conversations...','msg-notice'
);
conversationProgress.setAttribute('role','status');

conversationWorkspace.before(conversationStart,conversationProgress);
conversationWorkspace.hidden = true;

const startStyle = document.createElement('style');
startStyle.textContent = [
  '#messages-root .msg-start-state{display:flex;flex-direction:column;align-items:center;text-align:center;padding:44px 24px;background:white;border:1px solid #dedbd6;border-radius:14px}',
  '#messages-root .msg-start-icon{display:grid;place-items:center;width:88px;height:88px;border-radius:50%;background:#faf6ed;color:#213e34;margin-bottom:20px}',
  '#messages-root .msg-start-state h3{font:normal clamp(25px,3vw,32px)/1.2 Georgia,serif;margin:0 0 12px}',
  '#messages-root .msg-start-state p{max-width:440px;margin:0 0 24px;color:#59645d;line-height:1.7}',
  '#messages-root .msg-explore{display:inline-flex;align-items:center;justify-content:center;background:#213e34;color:white;border-radius:8px;padding:13px 22px;font-weight:600;text-decoration:none}',
  '#messages-root .msg-explore:hover{background:#305547;color:white}',
  '#messages-root .msg-explore:focus-visible{outline:3px solid #ad7542;outline-offset:3px}'
].join('\n');
document.head.append(startStyle);

function syncConversationEmptyState() {
  const empty = Number(inboxMeta.all_total) === 0 && !selected &&
    statusFilter.value === 'open' && !categoryFilter.value;
  conversationStart.hidden = !empty;
  conversationWorkspace.hidden = empty;
  conversationProgress.hidden = true;
  $('msg-new').hidden = supplier || empty;
  $('msg-prev').parentElement.hidden =
    inboxPage === 0 && $('msg-next').disabled;
}

async function openRequestedSupplier() {
  const url = new URL(location.href);
  const vendorId = url.searchParams.get('vendor');

  if (!vendorId || supplier) return;

  url.searchParams.delete('vendor');
  history.replaceState(
    history.state,'',url.pathname + url.search + url.hash
  );

  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(vendorId)) return;

  conversationStart.hidden = true;
  conversationProgress.hidden = false;
  conversationProgress.textContent = 'Opening your conversation...';

  try {
    const vendor = await supabase.from('Vendor Public Profiles')
      .select('vendor_id,"Name of Wedding Vendor","Wedding Vendor Type"')
      .eq('vendor_id',vendorId).maybeSingle();

    if (revoked) return;
    if (vendor.error || !vendor.data) throw new Error();

    const {data,error} = await supabase.rpc(
      'start_supplier_conversation',{p_vendor_id:vendorId}
    );

    if (revoked) return;
    if (error || typeof data !== 'string') throw new Error();

    selectConversation({
      id:data,
      vendor_id:vendorId,
      business_name:vendor.data['Name of Wedding Vendor'],
      business_category:vendor.data['Wedding Vendor Type'],
      subject:'Wedding enquiry',
      enquiry_status:'new'
    });

    syncConversationEmptyState();
    inboxPage = 0;
    void loadInbox();
  } catch {
    if (!revoked) {
      syncConversationEmptyState();
      conversationProgress.hidden = false;
      conversationProgress.textContent =
        'We could not open this conversation. Please try again from the supplier list.';
    }
  }
}
const drafts = new Map(), attempts = new Map(), notices = new Map(), sending = new Set();

let owner = null, revoked = false, selected = null, rows = [], messages = [];
let inboxPage = 0, contactPage = 0, inboxBusy = false, threadBusy = false;
let inboxVersion = 0, threadVersion = 0, contactVersion = 0;
let hasEarlier = false, ready = false, contactTimer, inboxSignature = '', historySignature = '';

const labels = {
  new:'New enquiry',
  in_discussion:'In discussion',
  booked:'Booked',
  closed:'Closed'
};
const visible = () => !revoked && !root.hidden &&
  !root.closest('main')?.hidden && document.visibilityState === 'visible';
const nameOf = row => supplier
  ? row.couple_name || 'Couple'
  : row.business_name || 'Supplier';
const stamp = value => value ? new Date(value).toLocaleString('en-AU',
  {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '';

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text != null) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function notice(id, text, error = false) {
  const el = $(id);
  el.textContent = text;
  if (id === 'msg-send-status') el.hidden = !text;
  el.classList.toggle('msg-error',error);
}

function syncComposer() {
  editor.disabled = !selected || !ready || isClosed(selected) || sending.has(selected.id);
  $('msg-form').hidden = isClosed(selected);
  syncClosedChatActions();
  $('msg-send').disabled = editor.disabled || !editor.value.trim();
  $('msg-send').textContent = selected && sending.has(selected.id)
    ? 'Sending...' : 'Send message';
  $('msg-count').textContent =
    editor.value.length.toLocaleString('en-AU') + ' / 4,000';

  const current = selected && notices.get(selected.id);
  notice('msg-send-status',current?.text || '',!!current?.error);
}

function renderInbox() {
  const signature = JSON.stringify([rows,selected?.id]);
  if (signature === inboxSignature) return;
  inboxSignature = signature;

  const items = rows.map(row => {
    const button = node('button',null,'msg-conversation');
    button.type = 'button';
    button.setAttribute('aria-pressed',String(row.id === selected?.id));
    if (!supplier) button.append(supplierAvatar(row));
    const summary = node('div',null,'msg-conversation-copy');
    button.append(summary);
    summary.append(
      node('strong',nameOf(row) + (Number(row.unread_count) > 0 ? ' · ' + row.unread_count + ' unread' : '')),
      node('span',row.last_message || 'Start your conversation'),
      node('span',stamp(row.last_message_at || row.created_at))
    );
    button.addEventListener('click',() => selectConversation(row));

    const item = node('li');
    item.append(button);
    return item;
  });

  $('msg-inbox-list').replaceChildren(...items);
}

function renderHistory(earlier = false, forceBottom = false) {
  const signature = JSON.stringify([messages,isClosed(selected)]);
  if (signature === historySignature) return;
  historySignature = signature;

  const scroll = $('msg-scroll');
  const oldHeight = scroll.scrollHeight, oldTop = scroll.scrollTop;
  const nearBottom = oldHeight - oldTop - scroll.clientHeight < 100;

  // Consecutive messages from one sender form a group, timestamped at its end.
  const items = messages.map((message,index) => {
    const mine = message.sender_user_id === owner;
    const next = messages[index + 1];
    const continues = sameMessageGroup(message,next);
    const item = node('li',null,'msg-message' + (mine ? ' mine' : '') +
      (continues ? ' msg-group-continues' : ' msg-group-end'));
    const bubbleRow = node('div',null,'msg-bubble-row');
    bubbleRow.append(node('p',message.body,'msg-bubble'));
    if (canEditMessage(message)) {
      const edit = node('button',null,'msg-edit');
      edit.type = 'button';
      edit.dataset.expires = String(Date.parse(message.created_at) + 300000);
      edit.setAttribute('aria-label','Edit message');
      edit.title = 'Edit message';
      edit.innerHTML = penIcon;
      edit.addEventListener('click',() => openMessageEdit(message));
      bubbleRow.append(edit);
    }
    item.append(bubbleRow);
    if (message.edited_at) item.append(node('small','Edited','msg-edited'));
    if (!continues) item.append(node('small',stamp(message.created_at),'msg-timestamp'));
    return item;
  });
  $('msg-history').replaceChildren(...items);

  if (earlier) scroll.scrollTop = oldTop + scroll.scrollHeight - oldHeight;
  else if (nearBottom || forceBottom) scroll.scrollTop = scroll.scrollHeight;
}

async function loadInbox() {
  if (!owner || revoked || inboxBusy) return;
  inboxBusy = true;
  const version = ++inboxVersion, page = inboxPage;
  const status = statusFilter.value, category = categoryFilter.value;
  $('msg-prev').disabled = $('msg-next').disabled = true;
  try {
    const {data,error} = await supabase.rpc('get_message_inbox',{
      p_status:status,p_category:category,p_limit:51,p_offset:page * 50
    });
    if (revoked || version !== inboxVersion) return;
    if (error || !data || !Array.isArray(data.rows)) throw new Error();
    inboxMeta = data;
    rows = data.rows.slice(0,50);
    updateCategoryOptions(data.categories || []);
    if (!supplier) await Promise.all(rows.map(loadSupplierDetails));
    if (revoked || version !== inboxVersion) return;
    if (selected) {
      const fresh = rows.find(row => row.id === selected.id);
      if (fresh) {selected = fresh;renderThreadHeading();syncComposer();}
    }
    renderInbox();
    $('msg-prev').disabled = page === 0;
    $('msg-next').disabled = data.rows.length <= 50;
    notice('msg-inbox-status',rows.length ? '' : 'No conversations match these filters.');
    syncConversationEmptyState();
    if (!selected && rows.length && !openingRequestedThread) selectConversation(rows[0]);
  } catch {
    if (!revoked && version === inboxVersion) {
      notice('msg-inbox-status','Connection interrupted. Conversations will reconnect automatically.',true);
      $('msg-prev').disabled = page === 0;
      if (!conversationProgress.hidden) conversationProgress.textContent =
        'Connection interrupted. We will reconnect automatically.';
    }
  } finally {
    if (version === inboxVersion) inboxBusy = false;
  }
}

function renderThreadHeading() {
  if (!selected) return;
  syncSupplierHeading();
  syncClosedChatActions();
  $('msg-thread-title').textContent = nameOf(selected);
  $('msg-thread-meta').textContent = [
    selected.subject || 'Wedding enquiry',
    labels[selected.enquiry_status],
    supplier ? selected.business_name : selected.business_category
  ].filter(Boolean).join(' · ');
}

function selectConversation(row) {
  if (revoked || selected?.id === row.id) return;
  closeFeatureDialogs();
  if (selected) drafts.set(selected.id,editor.value);

  threadVersion++;
  threadBusy = false;
  selected = row;
  syncConversationEmptyState();
  messages = [];
  hasEarlier = false;
  ready = false;
  historySignature = '';

  $('msg-history').replaceChildren();
  editor.value = drafts.get(row.id) || '';
  $('msg-welcome').hidden = true;
  $('msg-detail').hidden = false;
  $('msg-earlier').hidden = true;

  renderThreadHeading();
  renderInbox();
  syncComposer();
  notice('msg-thread-status','Loading messages...');
  void loadMessages();
}

async function loadMessages(earlier = false, forceBottom = false) {
  if (!selected || revoked || threadBusy) return;

  const id = selected.id, version = ++threadVersion;
  threadBusy = true;
  $('msg-earlier').disabled = true;

  const previousLast = messages.at(-1)?.id;
  const initial = messages.length === 0;

  let query = supabase.from('supplier_messages')
    .select('id,conversation_id,sender_user_id,body,created_at,edited_at')
    .eq('conversation_id',id)
    .order('created_at',{ascending:false})
    .order('id',{ascending:false})
    .range(0,50);

  if (earlier && messages.length) {
    const first = messages[0];
    query = query.or(
      'created_at.lt.' + first.created_at +
      ',and(created_at.eq.' + first.created_at + ',id.lt.' + first.id + ')'
    );
  }

  try {
    const [access,result] = await Promise.all([
      supabase.from('supplier_conversations')
        .select('id,enquiry_status').eq('id',id).maybeSingle(),
      query
    ]);

    if (revoked || version !== threadVersion || selected?.id !== id) return;
    if (access.error) throw new Error();

    if (!access.data) {
      ready = false;
      messages = [];
      historySignature = '';
      $('msg-history').replaceChildren();
      $('msg-earlier').hidden = true;
      notice('msg-thread-status',
        'This conversation is no longer available.',true);
      return;
    }

    if (result.error || !Array.isArray(result.data)) throw new Error();
    if (selected.enquiry_status !== access.data.enquiry_status) {
      selected.enquiry_status = access.data.enquiry_status;
      renderThreadHeading();
    }

    const incoming = result.data.slice(0,50);
    const gap = !earlier && previousLast && result.data.length > 50 &&
      !incoming.some(message => message.id === previousLast);

    if (gap) messages = [];

    const merged = new Map(messages.map(message => [message.id,message]));
    incoming.forEach(message => {
      const previous = merged.get(message.id);
      if (!previous?.edited_at || !message.edited_at ||
          Date.parse(message.edited_at) >= Date.parse(previous.edited_at)) {
        if (!previous?.edited_at || message.edited_at) merged.set(message.id,message);
      }
    });

    messages = [...merged.values()].sort((a,b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 :
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

    if (initial || earlier || gap) hasEarlier = result.data.length > 50;

    ready = true;
    $('msg-earlier').hidden = !hasEarlier;
    notice('msg-thread-status',messages.length
      ? '' : 'Say hello to start the conversation.');
    renderHistory(earlier,initial || forceBottom);
  } catch {
    if (!revoked && version === threadVersion) {
      notice('msg-thread-status',
        'Connection interrupted. Messages will reconnect automatically.',true);
    }
  } finally {
    if (version === threadVersion) {
      threadBusy = false;
      $('msg-earlier').disabled = false;
      syncComposer();
      void markReadIfVisible();
    }
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (!selected || !ready || revoked || isClosed(selected) || sending.has(selected.id)) return;

  const id = selected.id, raw = editor.value, body = raw.trim();
  if (!body || body.length > 4000 || !owner) return;

  const existing = attempts.get(id);
  const attempt = existing?.body === body
    ? existing : {id:crypto.randomUUID(),body};

  attempts.set(id,attempt);
  drafts.set(id,raw);
  sending.add(id);
  notices.set(id,{text:''});
  syncComposer();

  try {
    const {data,error} = await supabase.rpc('send_supplier_message',{
      p_conversation_id:id,
      p_body:body,
      p_message_id:attempt.id
    });

    if (revoked) return;
    if (error || data !== attempt.id) throw new Error();

    attempts.delete(id);
    drafts.delete(id);
    notices.delete(id);

    if (selected?.id === id) {
      editor.value = '';
      await loadMessages(false,true);
    }

    void loadInbox();
  } catch {
    if (!revoked) {
      notices.set(id,{
        text:'Could not confirm sending. Your message is still here. Try again.',
        error:true
      });
    }
  } finally {
    sending.delete(id);
    if (!revoked) syncComposer();
  }
}

async function loadContacts() {
  if (revoked || !dialog.open) return;

  const version = ++contactVersion;
  const search = $('msg-contact-search').value.trim();
  const page = contactPage;

  $('msg-contacts').replaceChildren();
  $('msg-contact-prev').disabled = $('msg-contact-next').disabled = true;
  notice('msg-contact-status','Finding businesses...');

  try {
    const {data,error} = await supabase.rpc('get_message_suppliers',{
      p_search:search,p_limit:26,p_offset:page * 25
    });

    if (revoked || version !== contactVersion || !dialog.open) return;
    if (error || !Array.isArray(data)) throw new Error();

    const items = data.slice(0,25).map(row => {
      const button = node('button',null,'msg-contact');
      button.type = 'button';
      button.append(
        node('strong',row.business_name),
        node('small',row.business_category || '')
      );
      button.addEventListener('click',() =>
        void startConversation(row,button));

      const item = node('li');
      item.append(button);
      return item;
    });

    $('msg-contacts').replaceChildren(...items);
    notice('msg-contact-status',items.length ? '' : search
      ? 'No businesses match that name.'
      : 'No businesses are available to message yet.');

    $('msg-contact-prev').disabled = page === 0;
    $('msg-contact-next').disabled = data.length <= 25;
  } catch {
    if (!revoked && version === contactVersion && dialog.open) {
      notice('msg-contact-status',
        'Could not find businesses. Please try again.',true);
    }
  }
}

async function startConversation(row,button) {
  if (revoked || button.disabled) return;

  const version = ++contactVersion;
  $('msg-contacts').querySelectorAll('button').forEach(item => {
    item.disabled = true;
  });
  notice('msg-contact-status','Opening conversation...');

  try {
    const {data,error} = await supabase.rpc(
      'start_supplier_conversation',{p_vendor_id:row.vendor_id}
    );

    if (revoked || version !== contactVersion || !dialog.open) return;
    if (error || typeof data !== 'string') throw new Error();

    dialog.close();
    selectConversation({
      id:data,...row,subject:'Wedding enquiry',enquiry_status:'new'
    });
    inboxPage = 0;
    void loadInbox();
    editor.focus();
  } catch {
    if (!revoked && version === contactVersion && dialog.open) {
      notice('msg-contact-status',
        'Could not open this conversation. Please try again.',true);
      $('msg-contacts').querySelectorAll('button').forEach(item => {
        item.disabled = false;
      });
    }
  }
}

async function refresh() {
  if (!visible()) return;
  await Promise.all([loadInbox(),loadMessages()]);
}

$('msg-form').addEventListener('submit',event => void sendMessage(event));

editor.addEventListener('input',() => {
  if (selected) drafts.set(selected.id,editor.value);
  syncComposer();
});

editor.addEventListener('keydown',event => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    $('msg-form').requestSubmit();
  }
});


$('msg-earlier').addEventListener('click',() => void loadMessages(true));

$('msg-prev').addEventListener('click',() => {
  if (!inboxBusy && inboxPage > 0) {
    inboxPage--;
    void loadInbox();
  }
});
$('msg-next').addEventListener('click',() => {
  if (!inboxBusy) {
    inboxPage++;
    void loadInbox();
  }
});

$('msg-new').hidden = supplier;
$('msg-new').addEventListener('click',() => {
  contactPage = 0;
  dialog.showModal();
  $('msg-contact-search').focus();
  void loadContacts();
});

$('msg-close').addEventListener('click',() => dialog.close());
dialog.addEventListener('close',() => {
  contactVersion++;
  clearTimeout(contactTimer);
});

let backdrop = false;
const outside = event => {
  const r = dialog.getBoundingClientRect();
  return event.clientX < r.left || event.clientX > r.right ||
    event.clientY < r.top || event.clientY > r.bottom;
};

dialog.addEventListener('pointerdown',event => {
  backdrop = event.button === 0 &&
    event.target === dialog && outside(event);
});
dialog.addEventListener('pointercancel',() => {backdrop = false;});
dialog.addEventListener('click',event => {
  if (backdrop && event.target === dialog && outside(event)) dialog.close();
  backdrop = false;
});

$('msg-contact-search').addEventListener('input',() => {
  contactVersion++;
  contactPage = 0;
  clearTimeout(contactTimer);
  contactTimer = setTimeout(() => void loadContacts(),300);
});
$('msg-contact-prev').addEventListener('click',() => {
  if (contactPage > 0) {
    contactPage--;
    void loadContacts();
  }
});
$('msg-contact-next').addEventListener('click',() => {
  contactPage++;
  void loadContacts();
});

window.addEventListener('wedsparks:section-open',event => {
  if (event.detail === 'messages') {
    if (pendingConversationId) void openRequestedConversation();
    else void refresh();
    void markReadIfVisible();
  }
  else {
    if (dialog.open) dialog.close();
    closeFeatureDialogs();
  }
});

document.addEventListener('visibilitychange',() => {
  if (visible()) void refresh();
});

onSessionChange(({user}) => {
  if (owner && user?.id !== owner) {
    stopLiveMessages();
    closeFeatureDialogs();
    supplierDetails.clear();
    readWatermarks.clear();
    reopeningChats.clear();
    clearTimeout(readTimer);
    revoked = true;
    inboxVersion++;
    threadVersion++;
    contactVersion++;
    owner = null;
    selected = null;
    rows = [];
    messages = [];
    drafts.clear();
    attempts.clear();
    notices.clear();
    sending.clear();

    if (dialog.open) dialog.close();
    root.replaceChildren();
    root.hidden = true;
    loading.hidden = false;
    loading.textContent = 'Please log in to continue.';
    location.replace(siteUrl('login/'));
  }
});

async function start() {
  try {
    const user = await requireUser(location.pathname + location.search);
    if (!user || revoked) return;

    owner = user.id;
    const account = await loadAccount(user);
    if (revoked) return;

    if (!account.roles.includes(supplier ? 'supplier' : 'couple')) {
      location.replace(siteUrl(supplier
        ? 'dashboard/messages/' : 'supplier-account/messages/'));
      return;
    }

    root.hidden = false;
    loading.hidden = true;
    startLiveMessages();
    await loadInbox();
    await openRequestedSupplier();
    await openRequestedConversation();
    openingRequestedThread = false;
    if (!selected && rows.length) selectConversation(rows[0]);
  } catch {
    if (!revoked) {
      root.hidden = true;
      loading.hidden = false;
      loading.textContent =
        'Could not open Messages. Refresh the page to try again.';
    }
  }
}

setInterval(() => {
  if (visible()) void refresh();
},12000);

// Automatic live supplier messages
let liveChannel = null, liveTimer = null;

function queueLiveMessageUpdate() {
  if (!owner || revoked || !visible() || liveTimer !== null) return;

  liveTimer = setTimeout(async () => {
    liveTimer = null;
    if (!owner || revoked || !visible()) return;

    if (inboxBusy || threadBusy) {
      queueLiveMessageUpdate();
      return;
    }

    await refresh();
  },150);
}

function stopLiveMessages() {
  if (liveTimer !== null) clearTimeout(liveTimer);
  liveTimer = null;

  const previous = liveChannel;
  liveChannel = null;

  if (previous) {
    try {
      void supabase.removeChannel(previous).catch(() => {});
    } catch {}
  }
}

function startLiveMessages() {
  if (!owner || revoked || liveChannel) return;

  const liveOwner = owner;

  try {
    const changed = payload => {
      if (!revoked && owner === liveOwner) {
        if (payload.eventType === 'UPDATE' &&
            payload.table === 'supplier_messages') applyMessageEdit(payload.new);
        queueLiveMessageUpdate();
      }
    };

    const channel = supabase.channel('supplier-messages:' + liveOwner)
      .on('postgres_changes', {
        event:'*',
        schema:'public',
        table:'supplier_conversations'
      },changed)
      .on('postgres_changes', {
        event:'*',
        schema:'public',
        table:'supplier_messages'
      },changed)
      .on('postgres_changes', {
        event:'*',schema:'public',table:'supplier_conversation_reads'
      },changed);

    liveChannel = channel;

    channel.subscribe(status => {
      if (liveChannel === channel && owner === liveOwner &&
          !revoked && status === 'SUBSCRIBED') {
        queueLiveMessageUpdate();
      }
    });
  } catch {
    stopLiveMessages();
  }
}

window.addEventListener('pagehide',stopLiveMessages);

window.addEventListener('pageshow',() => {
  if (!revoked && owner) {
    startLiveMessages();
    queueLiveMessageUpdate();
  }
});

window.addEventListener('online',queueLiveMessageUpdate);

// Supplier photos, quote requests and five-minute message editing.
const supplierDetails = new Map();
const penIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/></svg>';
const featureStyle = document.createElement('style');
featureStyle.textContent = [
  '#messages-root .msg-conversation{display:flex;align-items:flex-start;gap:12px}',
  '#messages-root .msg-conversation-copy{min-width:0;flex:1}',
  '#messages-root .msg-avatar{display:inline-flex;flex:0 0 46px;align-items:center;justify-content:center;width:46px;height:46px;overflow:hidden;border-radius:50%;background:#f2ecdf;color:#213e34;font-weight:600}',
  '#messages-root .msg-avatar img{display:block;width:100%;height:100%;object-fit:cover}',
  '#messages-root .msg-thread-heading{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}',
  '#messages-root .msg-heading-copy{flex:1;min-width:150px}',
  '#messages-root .msg-thread-actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap}',
  '#messages-root .msg-thread-actions a{color:#213e34;font-weight:600}',
  '#messages-root .msg-message{margin:0 0 18px}',
  '#messages-root .msg-message.msg-group-continues{margin-bottom:4px}',
  '#messages-root .msg-bubble-row{display:flex;align-items:center;gap:7px;max-width:90%;min-width:0}',
  '#messages-root .msg-bubble-row .msg-bubble{max-width:100%;min-width:0}',
  '#messages-root .mine .msg-bubble-row{flex-direction:row-reverse}',
  '#messages-root button.msg-edit{display:inline-flex;flex:none;align-items:center;justify-content:center;width:30px;height:30px;padding:4px;border:0;background:transparent;color:#59645d;box-shadow:none;border-radius:0}',
  '#messages-root button.msg-edit:hover{color:#213e34}',
  '#messages-root .msg-edited{font-size:10px;margin-top:1px}',
  '#messages-root dialog.msg-feature-dialog{position:relative;width:min(640px,94vw);max-height:88svh;overflow:auto;box-sizing:border-box;padding:30px;background:#faf8f4;color:#213e34;border:1px solid #d8ded7;border-radius:14px}',
  '#messages-root dialog.msg-feature-dialog::backdrop{background:#0c211c99}',
  '#messages-root dialog.msg-feature-dialog h2{font:normal 28px/1.3 Georgia,serif;margin:0 45px 20px 0}',
  '#messages-root .msg-quote-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px}',
  '#messages-root .msg-feature-dialog label{display:block;margin-bottom:5px}',
  '#messages-root .msg-feature-dialog textarea{min-height:150px}',
  '#messages-root .msg-feature-footer{display:flex;justify-content:flex-end;gap:12px;margin-top:18px}',
  '#messages-root .msg-feature-footer button{width:auto}',
  '@media(max-width:520px){#messages-root .msg-quote-fields{grid-template-columns:1fr}#messages-root .msg-thread-actions{width:100%}#messages-root dialog.msg-feature-dialog{padding:24px 18px}}'
].join('\n');
document.head.append(featureStyle);

const threadHeading = node('div',null,'msg-thread-heading');
const headingCopy = node('div',null,'msg-heading-copy');
$('msg-thread-title').before(threadHeading);
headingCopy.append($('msg-thread-title'),$('msg-thread-meta'));
threadHeading.append(headingCopy);
const threadAvatar = node('div');
threadAvatar.hidden = supplier;
threadHeading.prepend(threadAvatar);
const threadActions = node('div',null,'msg-thread-actions');
const profileLink = node('a','View profile');
profileLink.hidden = true;
profileLink.target = '_blank';
profileLink.rel = 'noopener';
const quoteButton = node('button','Get a quote','msg-primary');
quoteButton.type = 'button';
quoteButton.hidden = supplier;
threadActions.append(profileLink,quoteButton);
threadHeading.append(threadActions);

function safeSupplierUrl(value) {
  if (!value || typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value,siteUrl(''));
    if(url.origin==='https://jr-digitalventures.github.io'&&url.pathname==='/wedsparksverison1/supplier/')return siteUrl('supplier/'+url.search);
    return ['http:','https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
async function loadSupplierDetails(row) {
  if (!row?.vendor_id || revoked) return;
  if (supplierDetails.has(row.vendor_id)) return supplierDetails.get(row.vendor_id).pending;
  const entry = {image:row.business_image || '',profile:''};
  supplierDetails.set(row.vendor_id,entry);
  entry.pending = (async () => {
    const {data,error} = await supabase.from('Vendor Public Profiles')
      .select('vendor_id,"Image #1","Destination URL"')
      .eq('vendor_id',row.vendor_id).maybeSingle();
    if (revoked) return;
    if (error) { supplierDetails.delete(row.vendor_id); return; }
    if (data) {
      entry.image = data['Image #1'] || entry.image;
      entry.profile = data['Destination URL'] || '';
    }
  })().catch(() => supplierDetails.delete(row.vendor_id));
  return entry.pending;
}
function supplierAvatar(row) {
  const avatar = node('span',null,'msg-avatar');
  avatar.setAttribute('aria-hidden','true');
  const initials = String(row.business_name || 'Supplier').trim()
    .split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
  avatar.textContent = initials;
  const imageUrl = safeSupplierUrl(supplierDetails.get(row.vendor_id)?.image || row.business_image);
  if (imageUrl) {
    const img = node('img');
    img.alt = '';
    img.src = imageUrl;
    img.loading = 'lazy';
    img.addEventListener('error',() => avatar.replaceChildren(document.createTextNode(initials)));
    avatar.replaceChildren(img);
  }
  return avatar;
}
function syncSupplierHeading() {
  if (supplier || !selected) return;
  const row = selected;
  threadAvatar.replaceChildren(supplierAvatar(row));
  const target = safeSupplierUrl(supplierDetails.get(row.vendor_id)?.profile);
  profileLink.hidden = !target;
  if (target) profileLink.href = target;
  else profileLink.removeAttribute('href');
  if (!supplierDetails.has(row.vendor_id)) {
    void loadSupplierDetails(row).then(() => {
      if (!revoked && selected?.id === row.id && supplierDetails.has(row.vendor_id)) {
        syncSupplierHeading();
        inboxSignature = '';
        renderInbox();
      }
    });
  }
}

function sameMessageGroup(message,next) {
  if (!message || !next || message.sender_user_id !== next.sender_user_id) return false;
  const gap = Date.parse(next.created_at) - Date.parse(message.created_at);
  return Number.isFinite(gap) && gap >= 0 && gap <= 300000;
}
function canEditMessage(message,now = Date.now()) {
  const age = now - Date.parse(message.created_at);
  return !revoked && !isClosed(selected) && message.sender_user_id === owner &&
    Number.isFinite(age) && age >= 0 && age < 300000;
}
function applyMessageEdit(updated) {
  if (!updated || updated.conversation_id !== selected?.id || !updated.edited_at) return;
  let changed = false;
  messages = messages.map(message => {
    if (message.id !== updated.id || message.sender_user_id !== updated.sender_user_id ||
        (message.edited_at && Date.parse(message.edited_at) > Date.parse(updated.edited_at))) return message;
    changed = true;
    return {...message,body:updated.body,edited_at:updated.edited_at};
  });
  if (changed) renderHistory();
}
function makeFeatureDialog(id,title,content) {
  const modal = node('dialog',null,'msg-feature-dialog');
  modal.id = id;
  modal.setAttribute('aria-labelledby',id + '-title');
  const cross = node('button','×','ws-popup-cross');
  cross.type = 'button';
  cross.setAttribute('aria-label','Close ' + title.toLowerCase());
  const heading = node('h2',title);
  heading.id = id + '-title';
  modal.append(cross,heading);
  modal.insertAdjacentHTML('beforeend',content);
  root.append(modal);
  cross.addEventListener('click',() => {if (modal.dataset.busy !== 'true') modal.close();});
  modal.addEventListener('cancel',event => {if (modal.dataset.busy === 'true') event.preventDefault();});
  let startedOutside = false;
  const outside = event => {
    const r = modal.getBoundingClientRect();
    return event.clientX < r.left || event.clientX > r.right ||
      event.clientY < r.top || event.clientY > r.bottom;
  };
  modal.addEventListener('pointerdown',event => {
    startedOutside = event.button === 0 && event.target === modal && outside(event);
  });
  modal.addEventListener('pointercancel',() => {startedOutside = false;});
  modal.addEventListener('click',event => {
    if (startedOutside && event.target === modal && outside(event) &&
        modal.dataset.busy !== 'true') modal.close();
    startedOutside = false;
  });
  return modal;
}
const editDialog = makeFeatureDialog('msg-edit-dialog','Edit message',
  '<form id="msg-edit-form"><label for="msg-edit-body">Your message</label><textarea id="msg-edit-body" maxlength="4000" required></textarea><p id="msg-edit-status" class="msg-notice" role="status"></p><div class="msg-feature-footer"><button class="msg-primary" id="msg-edit-save" type="submit">Save changes</button></div></form>');
let editingMessage = null;
function openMessageEdit(message) {
  if (!canEditMessage(message) || editDialog.dataset.busy === 'true') return;
  editingMessage = {...message};
  $('msg-edit-body').value = message.body;
  notice('msg-edit-status','You can edit this message for five minutes after sending.');
  $('msg-edit-save').disabled = false;
  editDialog.showModal();
  $('msg-edit-body').focus();
}
editDialog.addEventListener('close',() => {editingMessage = null;});
$('msg-edit-form').addEventListener('submit',async event => {
  event.preventDefault();
  const message = editingMessage, body = $('msg-edit-body').value.trim();
  if (!message || revoked || editDialog.dataset.busy === 'true' || !body || body.length > 4000) return;
  if (!canEditMessage(message)) {
    notice('msg-edit-status','The five-minute editing window has ended.',true);
    $('msg-edit-save').disabled = true;
    return;
  }
  if (body === message.body) {editDialog.close();return;}
  editDialog.dataset.busy = 'true';
  $('msg-edit-save').disabled = true;
  notice('msg-edit-status','Saving changes...');
  try {
    const {data,error} = await supabase.rpc('edit_supplier_message',{
      p_message_id:message.id,p_body:body,p_expected_body:message.body
    });
    if (revoked) return;
    if (error || data?.id !== message.id) {
      const known = error?.message;
      throw new Error(known === 'The five-minute editing window has ended.' ||
        known === 'This message has changed. Close and reopen the editor.'
          ? known : 'Could not save your changes. Please try again.');
    }
    applyMessageEdit(data);
    editDialog.close();
    void loadInbox();
  } catch (error) {
    if (!revoked) notice('msg-edit-status',error.message,true);
  } finally {
    editDialog.dataset.busy = 'false';
    if (!revoked) $('msg-edit-save').disabled = false;
  }
});

const quoteDialog = makeFeatureDialog('msg-quote-dialog','Get a quote',
  '<form id="msg-quote-form"><p>Check your wedding details and make the message your own.</p><div class="msg-quote-fields"><div><label for="msg-quote-date">Wedding date</label><input id="msg-quote-date" type="date"></div><div><label for="msg-quote-guests">Guest estimate</label><input id="msg-quote-guests" type="number" min="1" max="100000" step="1"></div><div><label for="msg-quote-location">Wedding location</label><input id="msg-quote-location" maxlength="200" placeholder="Still deciding"></div></div><label for="msg-quote-body">Your message</label><textarea id="msg-quote-body" maxlength="3500" required></textarea><p id="msg-quote-status" class="msg-notice" role="status"></p><div class="msg-feature-footer"><button id="msg-quote-send" class="msg-primary" type="submit">Send quote request</button></div></form>');
let quoteConversation = null, quoteVersion = 0, quoteAttempt = null;
quoteButton.addEventListener('click',async () => {
  if (!selected || supplier || revoked || !ready || isClosed(selected) || quoteDialog.dataset.busy === 'true') return;
  quoteConversation = {...selected};
  quoteAttempt = null;
  const version = ++quoteVersion;
  $('msg-quote-form').reset();
  $('msg-quote-send').disabled = true;
  quoteDialog.querySelectorAll('input,textarea').forEach(el => {el.disabled = true;});
  notice('msg-quote-status','Loading your wedding details...');
  quoteDialog.showModal();
  try {
    const {data,error} = await supabase.from('couple_profiles')
      .select('wedding_date,wedding_location,guest_count')
      .eq('user_id',owner).maybeSingle();
    if (revoked || version !== quoteVersion || !quoteDialog.open) return;
    if (error) throw new Error();
    $('msg-quote-date').value = data?.wedding_date || '';
    $('msg-quote-location').value = data?.wedding_location || '';
    $('msg-quote-guests').value = data?.guest_count || '';
    $('msg-quote-body').value = 'Hi ' + quoteConversation.business_name +
      ',\n\nWe would love to hear more about your services for our wedding. Could you please let us know your availability and send us a quote?\n\nThank you!';
    notice('msg-quote-status','');
    quoteDialog.querySelectorAll('input,textarea').forEach(el => {el.disabled = false;});
    $('msg-quote-send').disabled = false;
  } catch {
    if (!revoked && version === quoteVersion) notice('msg-quote-status',
      'Could not load your wedding details. Close this window and try again.',true);
  }
});
quoteDialog.addEventListener('close',() => {quoteVersion++;quoteConversation = null;});
function formatWeddingDate(value) {
  if (!value) return 'Still deciding';
  return new Date(value + 'T12:00:00').toLocaleDateString('en-AU',
    {day:'numeric',month:'long',year:'numeric'});
}
$('msg-quote-form').addEventListener('submit',async event => {
  event.preventDefault();
  if (!quoteConversation || revoked || quoteDialog.dataset.busy === 'true') return;
  const message = $('msg-quote-body').value.trim();
  if (!message) return;
  const body = [
    'Quote request',
    'Wedding date: ' + formatWeddingDate($('msg-quote-date').value),
    'Wedding location: ' + ($('msg-quote-location').value.trim() || 'Still deciding'),
    'Guest estimate: ' + ($('msg-quote-guests').value || 'Still deciding'),
    '',message
  ].join('\n');
  if (body.length > 4000) {
    notice('msg-quote-status','Please shorten your message slightly before sending.',true);
    return;
  }
  const conversation = quoteConversation;
  if (quoteAttempt?.body !== body) quoteAttempt = {id:crypto.randomUUID(),body};
  const attempt = quoteAttempt;
  quoteDialog.dataset.busy = 'true';
  $('msg-quote-send').disabled = true;
  quoteDialog.querySelectorAll('input,textarea').forEach(el => {el.disabled = true;});
  notice('msg-quote-status','Sending your quote request...');
  try {
    const {data,error} = await supabase.rpc('send_supplier_message',{
      p_conversation_id:conversation.id,p_body:body,p_message_id:attempt.id
    });
    if (revoked) return;
    if (error || data !== attempt.id) throw new Error();
    quoteDialog.close();
    if (selected?.id === conversation.id) await loadMessages(false,true);
    void loadInbox();
  } catch {
    if (!revoked) notice('msg-quote-status',
      'Could not confirm sending. Your request is still here. Try again.',true);
  } finally {
    quoteDialog.dataset.busy = 'false';
    if (!revoked) {
      $('msg-quote-send').disabled = false;
      quoteDialog.querySelectorAll('input,textarea').forEach(el => {el.disabled = false;});
    }
  }
});
function closeFeatureDialogs() {
  if (editDialog.open) editDialog.close();
  if (quoteDialog.open) quoteDialog.close();
  if (closeDialog.open) closeDialog.close();
}
setInterval(() => {
  if (revoked || !visible()) return;
  for (const edit of root.querySelectorAll('button.msg-edit')) {
    if (Date.now() >= Number(edit.dataset.expires)) edit.remove();
  }
  if (editingMessage && editDialog.open && editDialog.dataset.busy !== 'true' &&
      !canEditMessage(editingMessage)) {
    $('msg-edit-save').disabled = true;
    notice('msg-edit-status','The five-minute editing window has ended.',true);
  }
},1000);


// Conversation management and read tracking.
let inboxMeta = {all_total:0,categories:[],unread_total:0};
const filters = node('div',null,'msg-filters');
filters.innerHTML =
  '<div><label for="msg-status-filter">Show chats</label><select id="msg-status-filter"><option value="open">Open</option><option value="closed">Closed</option><option value="all">All chats</option></select></div>' +
  '<div><label for="msg-category-filter">Supplier category</label><select id="msg-category-filter"><option value="">All categories</option></select></div>';
$('msg-inbox-status').before(filters);
const statusFilter = $('msg-status-filter'), categoryFilter = $('msg-category-filter');
let categorySignature = '';
const managementStyle = document.createElement('style');
managementStyle.textContent = [
  '#messages-root .msg-filters{display:grid;gap:12px;margin:16px 0}',
  '#messages-root .msg-filters label{display:block;font-size:13px;margin-bottom:5px}',
  '#messages-root .msg-filters select{display:block;box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #bdc8be;border-radius:8px;background:#fff;color:#213e34;font:14px/1.5 var(--sans)}',
  '#messages-root .msg-filters select:focus-visible{outline:3px solid #ad7542;outline-offset:2px}',
  '#messages-root .msg-closed-note{padding:12px 15px;background:#f8f4eb;border-radius:8px;color:#59645d}',
  '#messages-root button.msg-close-chat{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:44px;min-height:44px;padding:8px;border:0;border-radius:0;box-shadow:none;background:transparent;color:#59645d;text-decoration:none}',
  '#messages-root button.msg-close-chat:hover{color:#213e34;background:transparent}',
  '#messages-root .msg-close-chat svg{width:22px;height:22px;flex:none}',
  '#messages-root .msg-close-chat span{font-size:13px}'
].join('\n');
document.head.append(managementStyle);
const closeChatButton = node('button',null,'msg-close-chat');
closeChatButton.type = 'button';
closeChatButton.hidden = true;
threadActions.append(closeChatButton);
const closedNote = node('p',supplier
  ? 'This chat is closed. The couple can reopen it whenever they are ready.'
  : 'This chat is closed. Reopen it whenever you are ready to chat again.','msg-closed-note');
closedNote.hidden = true;
threadHeading.after(closedNote);
const closeDialog = makeFeatureDialog('msg-close-dialog','Close this chat?',
  '<p id="msg-close-description"></p><p>This moves the conversation to Closed and pauses new messages. You can reopen it whenever you need.</p><p id="msg-close-status" class="msg-notice" role="status"></p><div class="msg-feature-footer"><button id="msg-confirm-close" class="msg-primary" type="button">Close chat</button></div>');
let closingId = null;
const reopeningChats = new Set();
const readWatermarks = new Map(), readsInFlight = new Set();
let readTimer = null;
let pendingConversationId = new URL(location.href).searchParams.get('conversation');
let openingRequestedThread = !!(pendingConversationId || new URL(location.href).searchParams.get('vendor'));

function isClosed(row) { return row?.enquiry_status === 'closed'; }
function syncClosedChatActions() {
  const closed = isClosed(selected);
  closeChatButton.hidden = supplier || !selected;
  closeChatButton.disabled = !ready || !selected || sending.has(selected.id) || reopeningChats.has(selected.id);
  const mode = closed ? 'reopen' : 'close';
  if (closeChatButton.dataset.mode !== mode) {
    closeChatButton.dataset.mode = mode;
    closeChatButton.title = closed ? 'Reopen chat' : 'Close chat';
    closeChatButton.setAttribute('aria-label',closeChatButton.title);
    closeChatButton.innerHTML = closed ? reopenChatIcon + '<span>Reopen chat</span>' : archiveChatIcon;
  }
  quoteButton.hidden = supplier || closed;
  quoteButton.disabled = !selected || !ready || closed;
  closedNote.hidden = !selected || !closed;
}
function updateCategoryOptions(categories) {
  const values = [...new Set(categories.filter(value => typeof value === 'string' && value))].sort();
  if (categoryFilter.value && !values.includes(categoryFilter.value)) values.push(categoryFilter.value);
  const signature = JSON.stringify(values);
  if (signature === categorySignature) return;
  categorySignature = signature;
  const previous = categoryFilter.value;
  const all = node('option','All categories'); all.value = '';
  const options = values.map(value => {const option=node('option',value);option.value=value;return option;});
  categoryFilter.replaceChildren(all,...options);
  categoryFilter.value = previous;
}
function clearSelectedConversation() {
  closeFeatureDialogs();
  if (selected && !isClosed(selected)) drafts.set(selected.id,editor.value);
  threadVersion++;
  threadBusy = false;
  selected = null;messages = [];ready = false;hasEarlier = false;historySignature = '';
  editor.value = '';
  $('msg-history').replaceChildren();
  $('msg-detail').hidden = true;
  $('msg-earlier').hidden = true;
  $('msg-welcome').hidden = false;
  $('msg-welcome').textContent = 'Choose a conversation to read.';
  syncComposer();
}
function applyInboxFilters() {
  inboxVersion++;
  inboxBusy = false;
  inboxPage = 0;
  clearSelectedConversation();
  inboxSignature = '';
  void loadInbox();
}
statusFilter.addEventListener('change',applyInboxFilters);
categoryFilter.addEventListener('change',applyInboxFilters);

closeChatButton.addEventListener('click',() => {
  if (supplier || !selected || reopeningChats.has(selected.id) || closeDialog.dataset.busy === 'true') return;
  if (isClosed(selected)) {void reopenConversation();return;}
  closingId = selected.id;
  $('msg-close-description').textContent = 'Close your conversation with ' + nameOf(selected) + '?';
  notice('msg-close-status','');
  $('msg-confirm-close').disabled = false;
  closeDialog.showModal();
});
closeDialog.addEventListener('close',() => {closingId = null;});
$('msg-confirm-close').addEventListener('click',async () => {
  if (!closingId || revoked || closeDialog.dataset.busy === 'true') return;
  const id = closingId;
  closeDialog.dataset.busy = 'true';
  $('msg-confirm-close').disabled = true;
  notice('msg-close-status','Closing chat...');
  try {
    const {data,error} = await supabase.rpc('close_supplier_conversation',{p_conversation_id:id});
    if (revoked) return;
    if (error || data !== true) throw new Error();
    if (selected?.id === id) selected.enquiry_status = 'closed';
    drafts.delete(id);attempts.delete(id);notices.delete(id);
    closeDialog.close();
    clearSelectedConversation();
    inboxPage = 0;
    // Invalidate a background inbox fetch that started before this close.
    inboxVersion++; inboxBusy = false;
    await loadInbox();
    window.dispatchEvent(new CustomEvent('wedsparks:messages-changed'));
  } catch {
    if (!revoked) notice('msg-close-status','Could not close this chat. Please try again.',true);
  } finally {
    closeDialog.dataset.busy = 'false';
    if (!revoked) $('msg-confirm-close').disabled = false;
  }
});
function scheduleRead() {
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {readTimer=null;void markReadIfVisible();},180);
}
async function markReadIfVisible() {
  if (!selected || !ready || revoked || !visible() || threadBusy) return;
  const scroll = $('msg-scroll');
  if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight > 45) return;
  const last = messages.at(-1), id = selected.id;
  if (!last || readsInFlight.has(id) || readWatermarks.get(id) === last.id) return;
  const liveOwner = owner;
  readsInFlight.add(id);
  let success = false;
  try {
    const {data,error} = await supabase.rpc('mark_supplier_conversation_read',{
      p_conversation_id:id,p_through_message_id:last.id
    });
    if (revoked || owner !== liveOwner || error || data !== true) return;
    success = true;
    readWatermarks.set(id,last.id);
    window.dispatchEvent(new CustomEvent('wedsparks:messages-changed'));
    void loadInbox();
  } catch {} finally {
    readsInFlight.delete(id);
    if (success && !revoked && selected?.id === id &&
        messages.at(-1)?.id !== last.id) scheduleRead();
  }
}
$('msg-scroll').addEventListener('scroll',scheduleRead);
window.addEventListener('focus',scheduleRead);
document.addEventListener('visibilitychange',scheduleRead);

async function openRequestedConversation() {
  if (!pendingConversationId || !owner || revoked) return;
  const id = pendingConversationId;
  pendingConversationId = null;
  const url = new URL(location.href);
  url.searchParams.delete('conversation');
  history.replaceState(history.state,'',url.pathname + url.search + url.hash);
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return;
  try {
    const {data,error} = await supabase.rpc('get_message_thread',{p_conversation_id:id});
    if (revoked) return;
    if (error || !data?.id) throw new Error();
    statusFilter.value = isClosed(data) ? 'closed' : 'open';
    categoryFilter.value = '';
    inboxPage = 0;
    selectConversation(data);
    inboxVersion++;inboxBusy = false;
    void loadInbox();
  } catch {
    if (!revoked) notice('msg-inbox-status','This conversation is unavailable.',true);
  }
}


const archiveChatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6"/></svg>';
const reopenChatIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L3 10M3 4v6h6"/></svg>';

async function reopenConversation() {
  if (supplier || !selected || !isClosed(selected) || revoked ||
      reopeningChats.has(selected.id)) return;
  const id = selected.id;
  reopeningChats.add(id);
  syncClosedChatActions();
  notice('msg-thread-status','Reopening chat...');
  try {
    const {data,error} = await supabase.rpc('reopen_supplier_conversation',{p_conversation_id:id});
    if (revoked) return;
    if (error || !['new','in_discussion','booked'].includes(data)) throw new Error();
    if (selected?.id === id) {
      selected.enquiry_status = data;
      statusFilter.value = 'open';
      inboxPage = 0;
      // Ignore background responses that still describe the chat as closed.
      inboxVersion++;inboxBusy = false;
      threadVersion++;threadBusy = false;
      renderThreadHeading();
      syncComposer();
      await Promise.all([loadInbox(),loadMessages()]);
    } else {
      inboxVersion++;inboxBusy = false;
      void loadInbox();
    }
    window.dispatchEvent(new CustomEvent('wedsparks:messages-changed'));
  } catch {
    if (!revoked && selected?.id === id) notice('msg-thread-status',
      'Could not reopen this chat. Please try again.',true);
  } finally {
    reopeningChats.delete(id);
    if (!revoked) syncClosedChatActions();
  }
}

void start();
