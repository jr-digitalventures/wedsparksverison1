import { vendor as sampleVendor, couple as sampleCouple, getVendorPreset, comparisonSamples } from './data.js';
import { normaliseVendor, escapeHtml as e, money, dateLabel, priceLabel, reviewStats, reviewSources, quickFacts, shiftMonth, estimatePackage, budgetProjection, validateEnquiry, enquiryTypes } from './model.js';
import { renderProfile, renderMatch, renderAvailability, renderReviews, icon, button } from './view.js';

const storageKey = 'wedsparks.vendorProfile.demo.v1';
const readStorage = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { return {}; } };
const writeStorage = value => { try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* The prototype also works with storage disabled. */ } };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const stamp = () => new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(new Date());
const showPreviewControls = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || new URLSearchParams(location.search).get('preview') === '1';

// This is the future integration boundary: map a public table record into `vendor`, then mount it here.
export function mountVendorProfile(root, { vendor: inputVendor, couple: inputCouple, preset = 'florist' }) {
  let vendor = normaliseVendor(inputVendor), couple = structuredClone(inputCouple), stored = readStorage();
  if (!Array.isArray(stored.favourites)) stored.favourites = [];
  if (!Array.isArray(stored.budget)) stored.budget = [];
  if (!stored.drafts || typeof stored.drafts !== 'object') stored.drafts = {};
  if (!stored.chats || typeof stored.chats !== 'object') stored.chats = {};
  let selectedDate = couple.isLoggedIn ? couple.wedding?.date || '' : '';
  let month = selectedDate.slice(0, 7) || today().slice(0, 7), currentPreset = preset, reviewOrder = 'recent', reviewCount = 3;
  let dialog = null, dialogKind = '', returnFocus = null, pendingAction = null, currentDraft = null, gallery = null, activePackage = null, comparisonIds = new Set();
  let observer, galleryObserver, toastTimer;
  const events = [];
  const saved = () => stored.favourites.includes(vendor.id);
  const persist = () => writeStorage(stored);
  function track(name, detail = {}) {
    const event = { name, vendorId: vendor.id, detail, at: new Date().toISOString() };
    events.unshift(event); if (events.length > 25) events.pop();
    // Local hook only. No tracking requests or third-party analytics are loaded.
    root.dispatchEvent(new CustomEvent('vendor-profile:event', { bubbles: true, detail: event }));
    paintEventLog();
  }
  function toast(message) {
    clearTimeout(toastTimer); const node = document.querySelector('[data-vp-toast]');
    node.textContent = message; node.hidden = false; toastTimer = setTimeout(() => { node.hidden = true; }, 4800);
  }
  function syncSave() {
    root.querySelectorAll('[data-save-button]').forEach(node => { node.setAttribute('aria-pressed', String(saved())); node.querySelector('[data-save-label]').textContent = saved() ? 'Saved' : 'Save'; node.setAttribute('aria-label', saved() ? 'Remove from wedding favourites' : 'Save to wedding favourites'); });
  }
  function updateSeo() {
    const title = `${vendor.name} | ${vendor.categoryLabel || vendor.category} ${vendor.location.city} ${vendor.location.state}`;
    document.title = title;
    const actualUrl = new URL(location.href); actualUrl.hash = ''; actualUrl.search = '';
    const setMeta = (name, content, property = false) => { const attr = property ? 'property' : 'name'; let node = document.head.querySelector(`meta[${attr}="${name}"]`); if (!node) { node = document.createElement('meta'); node.setAttribute(attr, name); document.head.append(node); } node.content = content; };
    setMeta('description', vendor.summary || vendor.description[0] || vendor.name);
    for (const [name, value] of Object.entries({ title, description: vendor.summary, url: actualUrl.href, type: 'website', image: new URL(vendor.media.heroImage?.src || '../assets/wedding-garden.webp', location.href).href })) setMeta('og:' + name, value || '', true);
    setMeta('twitter:card', 'summary_large_image'); setMeta('twitter:title', title); setMeta('twitter:description', vendor.summary || '');
    document.querySelector('link[rel=canonical]').href = actualUrl.href;
    let json = document.querySelector('[data-vendor-seo]'); if (!json) { json = document.createElement('script'); json.type = 'application/ld+json'; json.dataset.vendorSeo = ''; document.head.append(json); }
    json.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description: vendor.summary, url: actualUrl.href, mainEntity: { '@type': 'LocalBusiness', name: vendor.name, description: vendor.summary, image: vendor.media.gallery.map(photo => new URL(photo.src, location.href).href), address: { '@type': 'PostalAddress', addressLocality: vendor.location.city, addressRegion: vendor.location.state, addressCountry: 'AU' }, areaServed: vendor.location.serviceAreas } });
    // Fictional sample feedback is intentionally omitted from review / rating schema.
  }
  function setupObservers() {
    observer?.disconnect(); galleryObserver?.disconnect();
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => { const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top); if (!visible.length) return; root.querySelectorAll('.vp-section-nav a').forEach(link => link.classList.toggle('is-active', link.hash === '#' + visible[0].target.id)); }, { rootMargin: '-70px 0px -60% 0px', threshold: 0 });
      root.querySelectorAll('.vp-section-nav a').forEach(link => { const section = root.querySelector(link.hash); if (section) observer.observe(section); });
      const strip = root.querySelector('[data-gallery-strip]');
      if (strip) { galleryObserver = new IntersectionObserver(entries => { const visible = entries.find(entry => entry.isIntersecting); if (visible) root.querySelector('[data-mobile-photo-count]').textContent = `${Number(visible.target.dataset.index) + 1} / ${vendor.media.gallery.length}`; }, { root: strip, threshold: .65 }); strip.querySelectorAll('button').forEach(photo => galleryObserver.observe(photo)); }
    }
  }
  function render() {
    root.innerHTML = renderProfile(vendor, couple, { selectedDate, month }); syncSave(); updateSeo(); setupObservers();
    if (showPreviewControls) renderTools();
  }
  function closeDialog({ restore = true } = {}) {
    if (!dialog) return;
    if (dialogKind === 'signin') pendingAction = null;
    dialog.close(); dialog.remove(); dialog = null; dialogKind = ''; gallery = null;
    document.body.style.overflow = '';
    if (restore) { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); else root.focus({ preventScroll: true }); }
  }
  function openDialog(title, content, { kind = '', cls = '', eyebrow = 'WEDSPARKS · PROFILE PREVIEW' } = {}) {
    if (!dialog) { returnFocus = document.activeElement; dialog = document.createElement('dialog'); document.body.append(dialog); dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }); dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) closeDialog(); }); }
    dialogKind = kind; if (kind !== 'gallery') gallery = null; dialog.className = `vp-dialog ${cls}`; dialog.setAttribute('aria-labelledby', 'vp-dialog-title');
    dialog.innerHTML = `<header class="vp-dialog-header"><div><p class="vp-eyebrow">${e(eyebrow)}</p><h2 id="vp-dialog-title" tabindex="-1">${e(title)}</h2></div>${button(icon('close'), 'close-dialog', 'vp-icon-button', 'aria-label="Close dialog"')}</header><div class="vp-dialog-body">${content}</div>`;
    if (!dialog.open) dialog.showModal(); document.body.style.overflow = 'hidden';
    dialog.querySelector('#vp-dialog-title').focus({ preventScroll: true });
    return dialog;
  }
  function signin(reason, action) {
    if (action) pendingAction = action;
    openDialog('Keep your wedding together.', `<p>${e(reason || 'Use the sample couple to explore favourites, wedding details and enquiry previews.')}</p><div class="vp-context"><strong>This is a demonstration sign-in.</strong>No real account is created. Your completed enquiry stays intact while you try the couple experience.</div>${button('Continue as the sample couple ' + icon('arrow'), 'simulate-login', 'vp-button')}<p class="vp-fine">Account integration will use the existing WedSparks login later.</p>`, { kind: 'signin' });
  }
  function requireCouple(reason, action) { if (couple.isLoggedIn) action(); else signin(reason, action); }
  function toggleSave() { requireCouple('Sign in to keep this vendor in your wedding favourites.', () => { stored.favourites = saved() ? stored.favourites.filter(id => id !== vendor.id) : [...stored.favourites, vendor.id]; persist(); syncSave(); track('favourite_toggled', { saved: saved() }); toast(saved() ? 'Added to this browser’s sample wedding favourites.' : 'Removed from sample favourites.'); }); }
  function completeLogin() {
    couple.isLoggedIn = true;
    if (!selectedDate) { selectedDate = couple.wedding?.date || ''; month = selectedDate.slice(0, 7) || month; }
    const next = pendingAction; pendingAction = null; closeDialog({ restore: false }); render();
    if (next) next(); else toast('Showing the sample couple experience.');
  }
  function openShare() {
    const url = new URL(location.href); url.hash = '';
    openDialog('Good things are worth sharing.', `<p>Share ${e(vendor.name)} with someone helping you plan.</p><label class="vp-field"><span>Profile link</span><input data-share-url readonly value="${e(url.href)}"></label><div class="vp-dialog-actions">${button(icon('share') + ' Copy link', 'copy-link', 'vp-button')}${typeof navigator.share === 'function' ? button('More sharing options', 'native-share', 'vp-outline-button') : ''}</div><p class="vp-fine" data-share-status role="status">Anyone with this link can view the public page.</p>`, { kind: 'share' }); track('share_opened');
  }
  async function copyLink() {
    const input = dialog.querySelector('[data-share-url]');
    try { await navigator.clipboard.writeText(input.value); dialog.querySelector('[data-share-status]').textContent = 'Link copied.'; track('share_action', { method: 'clipboard' }); }
    catch { input.focus(); input.select(); dialog.querySelector('[data-share-status]').textContent = 'Select and copy the link above using your device’s copy command.'; }
  }
  function openGallery(photos = vendor.media.gallery, index = 0, { title = vendor.name, credits = [], description = '', videos = [] } = {}) {
    if (!photos.length) return;
    openDialog(title, '<div data-lightbox></div>', { kind: 'gallery', cls: 'vp-gallery-dialog', eyebrow: 'A CLOSER LOOK' });
    gallery = { photos, index: Math.max(0, Math.min(index, photos.length - 1)), title, credits, description, videos };
    paintGallery(); track('gallery_opened', { collection: title });
  }
  function paintGallery() {
    const { photos, index, credits, description, videos } = gallery, photo = photos[index];
    dialog.querySelector('[data-lightbox]').innerHTML = `<div class="vp-lightbox-stage" data-swipe-stage><img src="${e(photo.src)}" alt="${e(photo.alt)}" width="1400" height="1000">${photos.length > 1 ? `${button(icon('chevron'), 'gallery-prev', 'vp-icon-button vp-prev', 'aria-label="Previous photo"')}${button(icon('chevron'), 'gallery-next', 'vp-icon-button', 'aria-label="Next photo"')}` : ''}</div><div class="vp-lightbox-caption"><span>${e(photo.caption || photo.alt)}</span><span aria-live="polite">${index + 1} / ${photos.length}</span></div><div class="vp-lightbox-thumbs" aria-label="Gallery thumbnails">${photos.map((p, i) => button(`<img src="${e(p.src)}" alt="" loading="lazy" width="64" height="50">`, 'gallery-index', '', `data-index="${i}" aria-label="View photo ${i + 1}" aria-pressed="${i === index}"`)).join('')}</div>${description || credits.length || videos.length ? `<div class="vp-gallery-credits">${description ? `<p>${e(description)}</p>` : ''}${credits.map(credit => `<div>${e(credit.role)}: ${e(credit.name)}</div>`).join('')}${videos.map((video, i) => button(icon('play') + ' ' + e(video.title), 'portfolio-video', 'vp-gallery-control', `data-video="${i}"`)).join('')}</div>` : ''}`;
    let startX = null, startY = null;
    const stage = dialog.querySelector('[data-swipe-stage]');
    stage.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; startY = event.changedTouches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', event => { const dx = event.changedTouches[0].clientX - startX, dy = event.changedTouches[0].clientY - startY; if (startX !== null && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) moveGallery(dx < 0 ? 1 : -1); }, { passive: true });
  }
  function moveGallery(amount, absolute = false) { if (!gallery) return; const focusAction = document.activeElement?.dataset?.action; gallery.index = absolute ? amount : (gallery.index + amount + gallery.photos.length) % gallery.photos.length; track('gallery_image_selected', { index: gallery.index }); paintGallery(); if (focusAction) dialog.querySelector(`[data-action="${focusAction}"]${focusAction === 'gallery-index' ? `[data-index="${gallery.index}"]` : ''}`)?.focus({ preventScroll: true }); }
  function openVideo(video) {
    if (!video) return;
    openDialog(video.title, `<video class="vp-video-player" controls playsinline preload="metadata" poster="${e(video.poster || '')}"><source src="${e(video.src)}" type="video/mp4">Your browser cannot play this video.</video><p class="vp-fine">${e(video.description || 'Illustrative portfolio video. No sound plays automatically.')}</p>`, { kind: 'video' });
    dialog.querySelector('video').addEventListener('play', () => track('video_played', { title: video.title }));
  }
  function refreshAvailability() {
    const box = root.querySelector('[data-availability]'); if (box) box.innerHTML = renderAvailability(vendor, selectedDate, month);
    const sidebar = root.querySelector('[data-sidebar-date]'); if (sidebar) sidebar.value = selectedDate;
  }
  function defaultDraft(type, pkgId = '', consultId = '') {
    const wedding = couple.isLoggedIn ? couple.wedding || {} : {};
    const consultation = vendor.consultations.find(option => option.id === consultId);
    const messages = { general: 'Hi, we would love to hear more about your approach and explore what might work for our wedding.', quote: 'Hi, we are putting together our wedding plans and would love an itemised proposal. Our priorities are…', package: 'Hi, we would love to learn more about this collection and how we could adapt it for our day.', guide: 'Hi, could we please see your pricing guide? We would love to understand the options before planning the details.', availability: 'Hi, could you please let us know whether you can work with us on our wedding date?', consultation: 'Hi, we would love to arrange a conversation about our wedding. These are the ideas we have so far…' };
    return { type, name: couple.isLoggedIn ? couple.names || '' : '', email: '', date: selectedDate || wedding.date || '', location: wedding.city ? `${wedding.city}, ${wedding.state || ''}` : '', venue: wedding.venue || '', guestCount: wedding.guestCount || '', message: '', suggestedMessage: messages[type], requirements: [], packageId: pkgId || '', consultationId: consultId || vendor.consultations[0]?.id || '', consultationMode: consultation?.modes[0] || '', consultationDate: '', consultationTime: '', dateStatus: 'unknown' };
  }
  const draftKey = type => `${vendor.id}:${type}`;
  function saveDraft() { if (!currentDraft) return; stored.drafts[draftKey(currentDraft.type)] = { ...currentDraft }; persist(); }
  function openEnquiry(type = 'general', pkgId = '', consultId = '') {
    if (!enquiryTypes[type]) type = 'general';
    if (currentDraft) saveDraft();
    currentDraft = { ...defaultDraft(type, pkgId, consultId), ...(stored.drafts[draftKey(type)] || {}) };
    if (pkgId) currentDraft.packageId = pkgId; if (consultId) currentDraft.consultationId = consultId;
    if (type === 'availability' && selectedDate) currentDraft.date = selectedDate;
    if (type === 'package' && !currentDraft.packageId && vendor.packages.length) currentDraft.packageId = vendor.packages[0].id;
    saveDraft(); paintEnquiry(); track(type === 'guide' ? 'pricing_guide_requested' : type === 'consultation' ? 'consultation_request_started' : 'enquiry_started', { type, packageId: pkgId });
  }
  function field(label, name, { type = 'text', required = false, placeholder = '', value = currentDraft[name] || '', min = '', maxLength = 200 } = {}) {
    return `<label class="vp-field"><span id="label-${name}">${e(label)}${required ? ' *' : ''}</span><input name="${name}" aria-labelledby="label-${name}" type="${type}" value="${e(value)}" ${required ? 'required' : ''} ${min ? `min="${min}"` : ''} maxlength="${maxLength}" placeholder="${e(placeholder)}" autocomplete="${name === 'email' ? 'email' : name === 'name' ? 'name' : 'off'}"><span class="vp-form-error" id="error-${name}" data-error="${name}"></span></label>`;
  }
  function paintEnquiry() {
    const d = currentDraft, packageSelected = vendor.packages.find(pkg => pkg.id === d.packageId), consultation = vendor.consultations.find(option => option.id === d.consultationId) || vendor.consultations[0];
    const showWeddingDetails = !['guide', 'consultation'].includes(d.type), requireLocation = ['quote', 'package', 'availability'].includes(d.type);
    const options = Object.entries(enquiryTypes).filter(([key]) => (key !== 'guide' || vendor.pricing.pricingGuideAvailable) && (key !== 'package' || vendor.packages.length) && (key !== 'consultation' || vendor.consultations.length));
    const selectType = `<label class="vp-field"><span>What would you like to do?</span><select name="type" data-enquiry-type>${options.map(([key, label]) => `<option value="${key}"${d.type === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>`;
    let contextual = '';
    if (d.type === 'package') contextual += `<label class="vp-field"><span>Your collection *</span><select name="packageId" required>${vendor.packages.map(pkg => `<option value="${e(pkg.id)}"${d.packageId === pkg.id ? ' selected' : ''}>${e(pkg.name)} · ${e(priceLabel(pkg, vendor.pricing.currency))}</option>`).join('')}</select><span class="vp-form-error" data-error="packageId"></span></label>${packageSelected ? `<div class="vp-context"><strong>${e(packageSelected.name)}</strong>${e(packageSelected.conditions || 'Final scope and pricing are confirmed in a written quote.')}</div>` : ''}`;
    if (d.type === 'consultation' && consultation) contextual += `<label class="vp-field"><span>Consultation</span><select name="consultationId">${vendor.consultations.map(option => `<option value="${e(option.id)}"${option.id === consultation.id ? ' selected' : ''}>${e(option.name)}</option>`).join('')}</select></label><div class="vp-context"><strong>${e(consultation.name)}</strong>${e(consultation.duration)} · ${e(consultation.priceLabel)}<br>${e(consultation.description)}</div><label class="vp-field"><span>How would you like to meet?</span><select name="consultationMode">${consultation.modes.map(mode => `<option${d.consultationMode === mode ? ' selected' : ''}>${e(mode)}</option>`).join('')}</select></label><div class="vp-form-row">${field('Preferred consultation date', 'consultationDate', { type: 'date', required: true, min: today() })}${field('Preferred time (optional)', 'consultationTime', { type: 'time' })}</div>`;
    const weddingFields = showWeddingDetails ? `<div class="vp-form-row">${field('Wedding date' + (d.type === 'availability' ? '' : ' (optional)'), 'date', { type: 'date', required: d.type === 'availability', min: today() })}${field('Wedding city or region', 'location', { required: requireLocation, placeholder: 'e.g. Bowral, NSW' })}</div>${['quote', 'package', 'general'].includes(d.type) ? `<div class="vp-form-row">${field('Venue (optional)', 'venue')}${field('Guests (optional)', 'guestCount', { type: 'number', min: '1' })}</div>` : ''}` : '';
    const requirements = d.type === 'quote' && vendor.services.length ? `<fieldset class="vp-service-choices"><legend>What are you considering? (optional)</legend>${vendor.services.map((service, i) => `<label><input type="checkbox" name="requirements" value="${e(service)}"${d.requirements.includes(service) ? ' checked' : ''}> ${e(service)}</label>`).join('')}</fieldset>` : '';
    openDialog(`A conversation with ${vendor.name}.`, `<form class="vp-form" data-enquiry-form novalidate>${selectType}${contextual}<div class="vp-form-row">${field('Your name', 'name', { required: true })}${field('Email', 'email', { type: 'email', required: true, placeholder: 'you@example.com' })}</div>${weddingFields}${requirements}<label class="vp-field"><span>Your message *</span><textarea name="message" rows="5" required minlength="15" maxlength="4000" placeholder="${e(d.suggestedMessage)}">${e(d.message)}</textarea><span class="vp-form-error" id="error-message" data-error="message"></span></label>${button('Use the suggested opening', 'suggest-message', 'vp-text-button')}<div class="vp-dialog-note">Your draft stays in this browser. No enquiry, pricing guide or appointment request is sent from this preview.</div><button class="vp-button" type="submit">Review your enquiry ${icon('arrow')}</button><p class="vp-fine">${couple.isLoggedIn ? 'Using the sample couple account.' : 'You can write your enquiry now. Sign-in is demonstrated before review.'}</p></form>`, { kind: 'enquiry' });
  }
  function collectDraft() {
    const form = dialog?.querySelector('[data-enquiry-form]'); if (!form || !currentDraft) return;
    for (const [name, value] of new FormData(form)) { if (name !== 'requirements' && name !== 'type') currentDraft[name] = String(value); }
    currentDraft.requirements = [...form.querySelectorAll('[name=requirements]:checked')].map(input => input.value); saveDraft();
  }
  function submitEnquiry(event) {
    event.preventDefault(); collectDraft();
    const errors = validateEnquiry(currentDraft), form = dialog.querySelector('[data-enquiry-form]');
    for (const input of form.querySelectorAll('[aria-invalid]')) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    form.querySelectorAll('[data-error]').forEach(node => { node.textContent = ''; });
    for (const [key, message] of Object.entries(errors)) { const input = form.elements.namedItem(key), node = form.querySelector(`[data-error="${key}"]`); if (input instanceof HTMLElement) { input.setAttribute('aria-invalid', 'true'); if (node) { node.id ||= 'error-' + key; input.setAttribute('aria-describedby', node.id); node.textContent = message; } } }
    if (Object.keys(errors).length) { form.querySelector('[aria-invalid=true]')?.focus(); return; }
    track('enquiry_form_completed', { type: currentDraft.type });
    if (!couple.isLoggedIn) signin('Sign in to review and continue this enquiry. Your completed message and wedding details are preserved.', () => paintEnquiryPreview());
    else paintEnquiryPreview();
  }
  function draftSummary() {
    const d = currentDraft, pkg = vendor.packages.find(pkg => pkg.id === d.packageId), consultation = vendor.consultations.find(option => option.id === d.consultationId);
    const fields = [['Enquiry', enquiryTypes[d.type]], ['From', d.name], ['Email', d.email]];
    if (d.type === 'package' && pkg) fields.push(['Collection', pkg.name]);
    if (d.type === 'consultation') fields.push(['Consultation', consultation?.name], ['Preferred appointment', `${dateLabel(d.consultationDate)}${d.consultationTime ? ' · ' + d.consultationTime : ''}`], ['Meeting format', d.consultationMode]);
    if (!['guide', 'consultation'].includes(d.type)) { if (d.date) fields.push(['Wedding date', dateLabel(d.date)]); if (d.location) fields.push(['Wedding location', d.location]); if (d.venue && d.type !== 'availability') fields.push(['Venue', d.venue]); if (d.guestCount && d.type !== 'availability') fields.push(['Guests', d.guestCount]); }
    if (d.type === 'quote' && d.requirements.length) fields.push(['Services', d.requirements.join(', ')]);
    return `<dl class="vp-draft-summary">${fields.filter(([, value]) => value).map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>`;
  }
  function paintEnquiryPreview(complete = false) {
    saveDraft(); openDialog(complete ? 'Your enquiry preview is ready.' : 'A quick look before you continue.', `${complete ? '<div class="vp-dialog-note"><strong>Enquiry preview complete.</strong> Sending will be enabled when messaging is connected. Nothing has been delivered or booked.</div>' : '<p>Review the details below. You can edit anything before completing the preview.</p>'}${draftSummary()}<h3 class="vp-modal-subheading">Your message</h3><div class="vp-draft-message">${e(currentDraft.message)}</div><div class="vp-dialog-actions">${button('Edit enquiry', 'edit-enquiry', 'vp-outline-button')}${complete ? button(icon('message') + ' View conversation preview', 'conversation', 'vp-button') : button('Complete enquiry preview ' + icon('arrow'), 'complete-enquiry', 'vp-button')}</div>`, { kind: 'enquiry-preview' });
  }
  function openConversation() {
    if (!currentDraft) return openEnquiry();
    const messages = stored.chats[vendor.id] || [];
    openDialog(`You & ${vendor.name}`, `<p class="vp-message-sample">Fictional conversation · draft only · nothing is delivered.</p><label class="vp-field"><span>Illustrative conversation status</span><select data-conversation-status>${['Draft', 'Sent', 'Awaiting reply', 'Responded', 'Quote received', 'Booked', 'Closed'].map(status => `<option>${status}</option>`).join('')}</select></label><p class="vp-fine" data-conversation-note>Draft preview. This does not represent a real conversation.</p><div class="vp-context"><strong>${e(enquiryTypes[currentDraft.type])}</strong>${e(currentDraft.type === 'package' ? vendor.packages.find(pkg => pkg.id === currentDraft.packageId)?.name || '' : '')}${currentDraft.date ? `<br>${dateLabel(currentDraft.date)}` : ''}</div><div class="vp-message-thread" data-message-thread><div class="vp-message-bubble vp-message-own">${e(currentDraft.message)}<small>You · Draft preview</small></div><div class="vp-message-bubble">Thanks for sharing your plans. In a connected conversation, the vendor could ask about your priorities or attach a proposal here.<small>Illustrative vendor reply · 10:15 am</small></div>${messages.map(msg => `<div class="vp-message-bubble vp-message-own">${e(msg.text)}<small>You · ${e(msg.time)} · Local preview</small></div>`).join('')}</div><form class="vp-message-form" data-message-form><label class="vp-field"><span>Continue the conversation preview</span><textarea name="message" rows="3" minlength="1" maxlength="4000" required placeholder="Add a follow-up question…"></textarea></label><button type="submit" class="vp-button">Add message to preview ${icon('arrow')}</button></form>`, { kind: 'conversation' });
  }
  function openBudget(pkgId) {
    requireCouple('Sign in to add estimates to your wedding budget. This preview uses a browser-local sample budget.', () => {
      activePackage = vendor.packages.find(pkg => pkg.id === pkgId); if (!activePackage) return;
      const pkg = activePackage, entryId = `${vendor.id}:${pkg.id}`, existing = stored.budget.find(entry => entry.id === entryId), type = pkg.pricingType, quantity = existing?.quantity || (type === 'per_person' ? couple.wedding?.guestCount || pkg.minQuantity || 1 : type === 'per_item' ? pkg.minQuantity || 1 : 1), manual = existing?.amount || '';
      const allocated = couple.wedding?.categoryBudgets?.[vendor.category] || 0;
      openDialog('Make a little room in your budget.', `<div class="vp-context"><strong>${e(vendor.name)} · ${e(pkg.name)}</strong>${e(priceLabel(pkg, vendor.pricing.currency))}<br>Category: ${e(vendor.category)}<br>Pricing: ${e(type.replaceAll('_', ' '))}</div><form class="vp-form" data-budget-form>${['per_person', 'per_item'].includes(type) ? `<label class="vp-field"><span>${type === 'per_person' ? 'Guest count' : 'Item quantity'}</span><input type="number" name="quantity" value="${e(quantity)}" step="1" min="${pkg.minQuantity || 1}" ${pkg.maxQuantity ? `max="${pkg.maxQuantity}"` : ''} required></label>` : ''}${['custom_quote', 'pricing_guide'].includes(type) ? `<label class="vp-field"><span>Your estimate (${e(vendor.pricing.currency)})</span><input type="number" name="manual" min="1" max="10000000" step="1" required value="${e(manual)}" placeholder="Enter a planning estimate"></label>` : ''}<div class="vp-budget-values" data-budget-values></div><p class="vp-form-error" data-budget-error role="status"></p><div class="vp-dialog-note">This is a planning estimate${type !== 'fixed' ? ', based on a starting price' : ''}. Extras, installation, travel and final quantities may change it. Adding it does not book the vendor.</div><button class="vp-button" type="submit">${existing ? 'Update' : 'Add to'} sample wedding budget ${icon('plus')}</button><p class="vp-fine" data-budget-status role="status"></p></form><div data-local-budget-list></div>`, { kind: 'budget' });
      const form = dialog.querySelector('[data-budget-form]'); form.dataset.entry = entryId; form.dataset.allocated = allocated;
      updateBudget(); paintLocalBudget(); track('budget_opened', { packageId: pkg.id });
    });
  }
  function budgetValues() {
    const form = dialog.querySelector('[data-budget-form]'), pkg = activePackage;
    const quantity = Number(form.elements.namedItem('quantity')?.value || 1), manual = form.elements.namedItem('manual')?.value;
    const estimate = estimatePackage(pkg, { quantity, manual, currency: vendor.pricing.currency });
    const additions = stored.budget.filter(entry => entry.category === vendor.category && entry.id !== form.dataset.entry).reduce((sum, entry) => sum + entry.amount, 0);
    const committed = couple.wedding?.commitments?.[vendor.category] || 0, allocated = Number(form.dataset.allocated);
    return { ...estimate, quantity, additions, committed, allocated, ...budgetProjection({ allocated, committed, additions, estimate: estimate.amount || 0 }) };
  }
  function updateBudget() {
    const result = budgetValues();
    dialog.querySelector('[data-budget-values]').innerHTML = `<div><span>Allocated ${e(vendor.category.toLowerCase())} budget</span><strong>${money(result.allocated)}</strong></div><div><span>Existing sample commitments</span><strong>${money(result.committed)}</strong></div><div><span>Other local estimates</span><strong>${money(result.additions)}</strong></div><div><span>${result.isEstimate ? 'New package estimate' : 'Package price'}</span><strong>${result.amount === null ? 'Enter an estimate' : money(result.amount)}</strong></div><div class="${result.over ? 'is-over' : ''}"><span>${result.over ? 'Amount over budget' : 'Remaining budget'}</span><strong>${money(result.over || result.remaining)}</strong></div>`;
    dialog.querySelector('[data-budget-error]').textContent = result.error || ''; return result;
  }
  function paintLocalBudget() {
    const entries = stored.budget.filter(entry => entry.category === vendor.category);
    dialog.querySelector('[data-local-budget-list]').innerHTML = entries.length ? `<h3 class="vp-modal-subheading">In your local sample budget</h3><ul class="vp-budget-list">${entries.map(entry => `<li><span>${e(entry.vendorName)} · ${e(entry.packageName)}<br>${money(entry.amount)} · ${entry.isEstimate ? 'estimate' : 'sample package price'}</span>${button('Remove', 'remove-budget', 'vp-text-button', `data-entry="${e(entry.id)}"`)}</li>`).join('')}</ul>` : '';
  }
  function openComparison() {
    requireCouple('Sign in to compare this vendor with other fictional examples in the same category.', () => {
      const extras = comparisonSamples(vendor); if (!comparisonIds.size || !comparisonIds.has(vendor.id)) comparisonIds = new Set([vendor.id, extras[0].id]);
      openDialog('A clearer picture, side by side.', `<p>Compare ${e(vendor.category.toLowerCase())} details that matter to you. These are fictional examples, with unknown details left unfilled.</p><div class="vp-comparison-options">${extras.map(extra => `<label><input type="checkbox" data-compare-id="${e(extra.id)}"${comparisonIds.has(extra.id) ? ' checked' : ''}> ${e(extra.name)}</label>`).join('')}</div><p class="vp-fine" data-compare-status role="status">Choose one to three other vendors. Scroll the table horizontally on a small screen.</p><div data-comparison></div>`, { kind: 'comparison', cls: 'vp-compare-dialog' }); paintComparison(); track('comparison_opened');
    });
  }
  function paintComparison() {
    const stats = reviewStats(vendor.reviews);
    const current = { id: vendor.id, name: vendor.name, location: vendor.location.displayLocation, startingPrice: vendor.pricing.startingPrice, pricingType: vendor.pricing.startingPriceType, styles: vendor.styles, availability: vendor.availability.mode === 'request' ? 'On request' : vendor.availability.mode === 'live' ? 'Sample calendar' : 'Not published', inclusions: vendor.packages[0]?.inclusions || [], travel: vendor.location.travelNote, rating: stats.average, facts: Object.fromEntries(quickFacts(vendor).map(fact => [fact.key, fact.value])) };
    const selected = [current, ...comparisonSamples(vendor)].filter(entry => comparisonIds.has(entry.id));
    const rows = [['Location', entry => entry.location], ['Starting price', entry => priceLabel({ price: entry.startingPrice, pricingType: entry.pricingType })], ['Style', entry => entry.styles?.join(', ') || 'Not provided'], ['Availability', entry => entry.availability || 'Not provided'], ['Example inclusions', entry => entry.inclusions?.join(' · ') || 'Not provided'], ['Travel', entry => entry.travel || 'Not provided'], ['Review rating', entry => entry.rating ? `${entry.rating.toFixed(1)} / 5 · sample reviews` : 'Not provided'], ...quickFacts(vendor).map(fact => [fact.label, entry => entry.facts[fact.key] || 'Not provided'])];
    dialog.querySelector('[data-comparison]').innerHTML = `<div class="vp-comparison-scroll" tabindex="0" aria-label="Vendor comparison. Scroll horizontally for more vendors."><table class="vp-comparison-table"><caption class="vp-sr-only">${e(vendor.category)} comparison with fictional sample vendors</caption><thead><tr><th scope="col">The details</th>${selected.map(entry => `<th scope="col">${e(entry.name)}${entry.id === vendor.id ? '<br><small>This profile</small>' : ''}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, get]) => `<tr><th scope="row">${e(label)}</th>${selected.map(entry => `<td>${e(get(entry))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function openReview(id) {
    const review = vendor.reviews.find(entry => entry.id === id); if (!review) return;
    openDialog(review.title, `<article class="vp-review-expanded"><div class="vp-review-person"><span>${e(review.name[0])}</span><div><strong>${e(review.name)}</strong><small>${e(review.weddingLocation)}</small></div><span class="vp-review-stars">${icon('star')} ${review.rating}.0</span></div><p>${e(review.body)}</p><p class="vp-fine">${e(reviewSources[review.source] || 'Sample review')} · ${e(dateLabel(review.date))}</p>${review.photos?.length ? `<div class="vp-review-photos">${review.photos.map((photo, index) => button(`<img src="${e(photo.src)}" alt="${e(photo.alt)}" width="62" height="62">`, 'review-photo', 'vp-photo-button', `data-review="${e(review.id)}" data-index="${index}" aria-label="View review photograph"`)).join('')}</div>` : ''}${review.response ? `<div class="vp-review-response"><strong>From ${e(vendor.name)}</strong><p>${e(review.response)}</p></div>` : ''}</article>`, { kind: 'review' });
  }
  function openMap() {
    const coords = vendor.location.coordinates; if (!coords) return;
    const lat = vendor.location.showExactAddress ? coords.lat : Math.round(coords.lat * 100) / 100, lng = vendor.location.showExactAddress ? coords.lng : Math.round(coords.lng * 100) / 100;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - .12},${lat - .08},${lng + .12},${lat + .08}&layer=mapnik&marker=${lat},${lng}`;
    const box = root.querySelector('[data-map]'); box.innerHTML = `<iframe title="${e(vendor.location.mapLabel || 'Vendor operating area map')}" src="${e(url)}" loading="lazy" referrerpolicy="no-referrer"></iframe>`;
    toast('Showing the approximate sample operating area. No private address is used.');
  }
  function renderTools() {
    let tools = document.querySelector('[data-preview-tools]'); const wasOpen = tools?.open || false;
    if (!tools) { tools = document.createElement('details'); tools.dataset.previewTools = ''; tools.className = 'vp-preview-tools'; document.body.append(tools); }
    tools.innerHTML = `<summary>Profile preview</summary><div class="vp-preview-tools-panel"><h2>Try the possibilities.</h2><p>Development controls. These change only the fictional page data.</p><label>Viewing as<select data-preview-account><option value="couple"${couple.isLoggedIn ? ' selected' : ''}>Sample couple</option><option value="visitor"${couple.isLoggedIn ? '' : ' selected'}>Public visitor</option></select></label><label>Vendor example<select data-preview-preset>${[['florist', 'Florist · full profile'], ['venue', 'Venue · live calendar'], ['photographer', 'Photographer · no packages'], ['caterer', 'Caterer · per-guest pricing']].map(([value, label]) => `<option value="${value}"${value === currentPreset ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label>Availability display<select data-preview-availability>${[['request', 'On request'], ['live', 'Live sample calendar'], ['unpublished', 'No published calendar']].map(([value, label]) => `<option value="${value}"${vendor.availability.mode === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label>Date-enquiry response sample<select data-preview-response><option value="unknown">No response yet</option><option value="pending">Request pending</option><option value="available">Vendor confirmed available</option><option value="unavailable">Vendor unavailable</option><option value="more">More information required</option></select></label><p data-preview-response-note role="status">Response previews do not change public availability.</p><label>Sample wedding location<input data-preview-city value="${e(couple.wedding?.city || '')}"></label><label>Sample ${e(vendor.category.toLowerCase())} budget<input type="number" min="0" data-preview-budget value="${couple.wedding?.categoryBudgets?.[vendor.category] || 0}"></label><h3>Local interaction events</h3><ol class="vp-preview-log" data-preview-log></ol></div>`;
    tools.open = wasOpen; paintEventLog();
  }
  function paintEventLog() { const log = document.querySelector('[data-preview-log]'); if (log) log.innerHTML = events.slice(0, 12).map(event => `<li>${e(event.name)} · ${e(new Date(event.at).toLocaleTimeString('en-AU'))}</li>`).join(''); }

  const actions = {
    'close-dialog': () => closeDialog(), 'sign-in': () => signin(), 'simulate-login': completeLogin,
    save: toggleSave, share: openShare, 'copy-link': copyLink,
    'native-share': async () => { try { await navigator.share({ title: vendor.name, text: vendor.summary, url: dialog.querySelector('[data-share-url]').value }); track('share_action', { method: 'native' }); } catch (error) { if (error.name !== 'AbortError') toast('Sharing is unavailable here. You can copy the link instead.'); } },
    gallery: node => openGallery(vendor.media.gallery, Number(node.dataset.index || 0)),
    'gallery-prev': () => moveGallery(-1), 'gallery-next': () => moveGallery(1), 'gallery-index': node => moveGallery(Number(node.dataset.index), true),
    video: node => openVideo(vendor.media.videos[Number(node.dataset.video)]),
    'portfolio-video': node => { const video = gallery?.videos[Number(node.dataset.video)]; openVideo(video); },
    portfolio: node => { const collection = vendor.portfolioGalleries.find(item => item.id === node.dataset.collection); if (collection) openGallery(collection.photos, 0, { title: collection.title, credits: collection.credits || [], description: collection.description, videos: collection.videos || [] }); },
    enquire: node => { if (node.dataset.type === 'availability' && !selectedDate) { const date = root.querySelector('[data-availability-date]'); date?.focus(); date?.setCustomValidity('Choose your wedding date first.'); date?.reportValidity(); return; } if (node.dataset.type === 'availability') track('availability_checked', { date: selectedDate }); openEnquiry(node.dataset.type, node.dataset.package); },
    consultation: node => openEnquiry('consultation', '', node.dataset.consultation),
    'suggest-message': () => { const textarea = dialog.querySelector('[name=message]'); if (!textarea.value.trim()) { textarea.value = currentDraft.suggestedMessage; collectDraft(); } textarea.focus(); },
    'edit-enquiry': paintEnquiry,
    'complete-enquiry': () => { track('enquiry_preview_completed', { type: currentDraft.type }); paintEnquiryPreview(true); },
    conversation: openConversation, compare: openComparison, budget: node => openBudget(node.dataset.package),
    'remove-budget': node => { stored.budget = stored.budget.filter(entry => entry.id !== node.dataset.entry); persist(); updateBudget(); paintLocalBudget(); },
    'more-reviews': node => { reviewCount = vendor.reviews.length; root.querySelector('[data-reviews]').innerHTML = renderReviews(vendor, reviewOrder, reviewCount); node.hidden = true; },
    review: node => openReview(node.dataset.review),
    'review-photo': node => { const review = vendor.reviews.find(item => item.id === node.dataset.review); if (review) openGallery(review.photos, Number(node.dataset.index || 0), { title: `${review.name} · sample wedding photos` }); },
    map: openMap,
    month: node => { month = shiftMonth(month, Number(node.dataset.shift)); refreshAvailability(); root.querySelector(`[data-action=month][data-shift="${node.dataset.shift}"]`)?.focus({ preventScroll: true }); },
    'select-date': node => { selectedDate = node.dataset.date; refreshAvailability(); root.querySelector(`[data-date="${selectedDate}"]`)?.focus({ preventScroll: true }); track('availability_date_selected', { date: selectedDate }); }
  };
  function onClick(event) {
    const menuButton = event.target.closest('.vp-profile-site-header .mobile-menu-toggle');
    if (menuButton) { const menu = document.getElementById(menuButton.getAttribute('aria-controls')); menu.hidden = !menu.hidden; menuButton.setAttribute('aria-expanded', String(!menu.hidden)); return; }
    const node = event.target.closest('[data-action]'); if (!node || (!root.contains(node) && !dialog?.contains(node) && !node.closest('.vp-profile-site-header'))) return; const action = actions[node.dataset.action]; if (action) { event.preventDefault(); action(node); }
  }
  function onInput(event) {
    const node = event.target;
    if (dialog?.contains(node)) { if (node.closest('[data-enquiry-form]')) collectDraft(); if (node.closest('[data-budget-form]')) updateBudget(); }
  }
  function onChange(event) {
    const node = event.target;
    if (node.matches('[data-availability-date],[data-sidebar-date]')) { node.setCustomValidity(''); selectedDate = node.value; if (selectedDate) month = selectedDate.slice(0, 7); refreshAvailability(); }
    if (node.matches('[data-review-sort]')) { reviewOrder = node.value; root.querySelector('[data-reviews]').innerHTML = renderReviews(vendor, reviewOrder, reviewCount); }
    if (node.matches('[data-enquiry-type]')) { collectDraft(); openEnquiry(node.value); }
    if (node.matches('[name=consultationId]')) { collectDraft(); currentDraft.consultationMode = vendor.consultations.find(option => option.id === node.value)?.modes[0] || ''; saveDraft(); paintEnquiry(); }
    if (node.matches('[data-compare-id]')) { if (!node.checked && comparisonIds.size <= 2) { node.checked = true; dialog.querySelector('[data-compare-status]').textContent = 'Keep at least one other vendor selected.'; return; } if (node.checked) comparisonIds.add(node.dataset.compareId); else comparisonIds.delete(node.dataset.compareId); paintComparison(); }
    if (node.matches('[data-conversation-status]')) { dialog.querySelector('[data-conversation-note]').textContent = `Illustrative “${node.value}” state only. No message was delivered, no quote received and no booking created.`; }
    if (node.matches('[data-preview-account]')) { saveDraft(); couple.isLoggedIn = node.value === 'couple'; render(); }
    if (node.matches('[data-preview-preset]')) { saveDraft(); currentDraft = null; currentPreset = node.value; vendor = normaliseVendor(getVendorPreset(currentPreset)); comparisonIds.clear(); reviewCount = 3; reviewOrder = 'recent'; render(); track('profile_view', { preset: currentPreset }); }
    if (node.matches('[data-preview-availability]')) { vendor.availability.mode = node.value; refreshAvailability(); }
    if (node.matches('[data-preview-response]')) { const states = { unknown: 'No date-enquiry response yet.', pending: 'Sample: your date enquiry is awaiting a vendor response.', available: 'Sample: vendor confirmed this date is available. No booking is held.', unavailable: 'Sample: vendor cannot accommodate this date.', more: 'Sample: vendor needs your venue or service details before answering.' }; document.querySelector('[data-preview-response-note]').textContent = states[node.value]; toast(states[node.value]); }
    if (node.matches('[data-preview-city]')) { couple.wedding.city = node.value.trim(); root.querySelector('#wedding-match').innerHTML = renderMatch(vendor, couple); }
    if (node.matches('[data-preview-budget]')) { couple.wedding.categoryBudgets[vendor.category] = Math.max(0, Number(node.value)); root.querySelector('#wedding-match').innerHTML = renderMatch(vendor, couple); }
  }
  function onSubmit(event) {
    if (event.target.matches('[data-enquiry-form]')) submitEnquiry(event);
    if (event.target.matches('[data-message-form]')) { event.preventDefault(); const form = event.target, textarea = form.elements.namedItem('message'), text = textarea.value.trim(); if (!text) { textarea.setCustomValidity('Enter a message.'); textarea.reportValidity(); textarea.addEventListener('input', () => textarea.setCustomValidity(''), { once: true }); return; } const message = { text, time: stamp() }; stored.chats[vendor.id] ||= []; stored.chats[vendor.id].push(message); persist(); const bubble = document.createElement('div'); bubble.className = 'vp-message-bubble vp-message-own'; bubble.textContent = text; const small = document.createElement('small'); small.textContent = `You · ${message.time} · Local preview`; bubble.append(small); dialog.querySelector('[data-message-thread]').append(bubble); textarea.value = ''; toast('Message added to the local preview. Nothing was sent.'); track('message_preview_added'); }
    if (event.target.matches('[data-budget-form]')) { event.preventDefault(); if (!event.target.reportValidity()) return; const result = updateBudget(); if (result.amount === null || result.amount <= 0) { dialog.querySelector('[data-budget-error]').textContent = result.error || 'Enter a positive planning estimate.'; return; } const entry = { id: event.target.dataset.entry, vendorId: vendor.id, vendorName: vendor.name, packageId: activePackage.id, packageName: activePackage.name, category: vendor.category, amount: result.amount, quantity: result.quantity, isEstimate: result.isEstimate, currency: vendor.pricing.currency }; stored.budget = stored.budget.filter(item => item.id !== entry.id); stored.budget.push(entry); persist(); dialog.querySelector('[data-budget-status]').textContent = 'Included in this browser’s sample wedding budget. This is not a booking.'; paintLocalBudget(); track('budget_estimate_added', { packageId: entry.packageId, amount: entry.amount }); }
  }
  function onKeydown(event) { if (gallery && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); moveGallery(event.key === 'ArrowRight' ? 1 : -1); } if (event.key === 'Escape' && !dialog) { const menu = document.querySelector('.vp-profile-site-header .mobile-nav-panel'), toggle = document.querySelector('.vp-profile-site-header .mobile-menu-toggle'); if (menu && !menu.hidden) { menu.hidden = true; toggle?.setAttribute('aria-expanded', 'false'); toggle?.focus(); } } }
  function onToggle(event) { if (event.target.matches('details[data-package]') && event.target.open) track('package_viewed', { packageId: event.target.dataset.package }); if (event.target.matches('.vp-read-more')) event.target.querySelector('summary').innerHTML = (event.target.open ? 'Less about the studio ' : 'More about the studio ') + icon('plus'); }
  function onScroll() { if (root.querySelector('#wedding-match')?.getBoundingClientRect().top > 75) root.querySelectorAll('.vp-section-nav a').forEach((link, i) => link.classList.toggle('is-active', i === 0)); }
  document.addEventListener('click', onClick); document.addEventListener('input', onInput); document.addEventListener('change', onChange); document.addEventListener('submit', onSubmit); document.addEventListener('keydown', onKeydown); root.addEventListener('toggle', onToggle, true); window.addEventListener('scroll', onScroll, { passive: true });
  if (!document.querySelector('[data-vp-toast]')) { const node = document.createElement('div'); node.className = 'vp-toast'; node.dataset.vpToast = ''; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); node.hidden = true; document.body.append(node); }
  render(); track('profile_view');
  return { setVendor(next) { closeDialog(); saveDraft(); currentDraft = null; vendor = normaliseVendor(next); comparisonIds.clear(); render(); track('profile_view'); }, destroy() { saveDraft(); closeDialog(); observer?.disconnect(); galleryObserver?.disconnect(); document.removeEventListener('click', onClick); document.removeEventListener('input', onInput); document.removeEventListener('change', onChange); document.removeEventListener('submit', onSubmit); document.removeEventListener('keydown', onKeydown); root.removeEventListener('toggle', onToggle, true); window.removeEventListener('scroll', onScroll); clearTimeout(toastTimer); } };
}

const root = document.querySelector('#vendor-profile-root');
if (root) {
  const requested = new URLSearchParams(location.search).get('example');
  const preset = showPreviewControls && ['venue', 'photographer', 'caterer'].includes(requested) ? requested : 'florist';
  mountVendorProfile(root, { vendor: preset === 'florist' ? sampleVendor : getVendorPreset(preset), couple: sampleCouple, preset });
}
