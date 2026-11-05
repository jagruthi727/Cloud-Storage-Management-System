const PRICES = { Hot: 0.023, Warm: 0.0125, Cold: 0.004 };
const state = { files: [] };
const $ = (id) => document.getElementById(id);
const fileInput = $('fileInput');

function bytes(n) {
  if (!n) return '0 B';
  const units = ['B','KB','MB','GB','TB']; let i = 0, value = n;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++; }
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
}
function money(n) { return '$' + n.toFixed(4); }
function extension(name) { const p = name.split('.'); return p.length > 1 ? p.pop().toLowerCase() : 'file'; }
function accessLabel(pattern) { return ({frequent:'Frequent',occasional:'Occasional',rare:'Rare'})[pattern] || 'Auto'; }

function classify(file, pattern, days) {
  if (pattern === 'frequent') return 'Hot';
  if (pattern === 'occasional') return 'Warm';
  if (pattern === 'rare') return 'Cold';
  const ext = extension(file.name);
  const hotTypes = ['html','htm','css','js','jsx','ts','tsx','php','py','java','c','cpp','json','xml','sql'];
  const mediaTypes = ['mp4','mov','mkv','avi','mp3','wav','flac'];
  const archiveTypes = ['zip','rar','7z','tar','gz','bak'];
  // Transparent demo heuristic: age/access signal is weighted most; file type and size provide tie-breakers.
  if (days >= 90 || archiveTypes.includes(ext)) return 'Cold';
  if (days >= 30 || mediaTypes.includes(ext) || file.size >= 250 * 1024 * 1024) return 'Warm';
  if (days <= 14 || hotTypes.includes(ext) || file.size < 20 * 1024 * 1024) return 'Hot';
  return 'Warm';
}
function addFiles(fileList) {
  const pattern = $('accessPattern').value;
  const days = Math.max(0, Number($('lastAccess').value) || 0);
  let added = 0;
  [...fileList].forEach(file => {
    if (state.files.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) return;
    const tier = classify(file, pattern, days);
    state.files.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), name:file.name, size:file.size, ext:extension(file.name), lastModified:file.lastModified, tier, access: pattern === 'auto' ? (days >= 90 ? 'Rare' : days >= 30 ? 'Occasional' : 'Frequent') : accessLabel(pattern), days });
    added++;
  });
  render();
  if (added) toast(`${added} file${added===1?'':'s'} classified successfully`);
  else toast('Those files are already in your list');
  fileInput.value = '';
}
function render() {
  const files = state.files;
  const totals = {Hot:0,Warm:0,Cold:0}, counts = {Hot:0,Warm:0,Cold:0};
  let totalBytes = 0, cost = 0, hotBaseline = 0;
  files.forEach(f => { totals[f.tier] += f.size / (1024**3); counts[f.tier]++; totalBytes += f.size; cost += f.size/(1024**3)*PRICES[f.tier]; hotBaseline += f.size/(1024**3)*PRICES.Hot; });
  $('totalFiles').textContent = files.length;
  $('totalStorage').textContent = bytes(totalBytes);
  $('totalCost').textContent = '$' + cost.toFixed(2);
  $('savings').textContent = '$' + Math.max(0, hotBaseline-cost).toFixed(2);
  $('hotCount').textContent = counts.Hot; $('warmCount').textContent = counts.Warm; $('coldCount').textContent = counts.Cold; $('donutTotal').textContent = files.length;
  $('hotCost').textContent = '$' + (totals.Hot*PRICES.Hot).toFixed(4);
  $('warmCost').textContent = '$' + (totals.Warm*PRICES.Warm).toFixed(4);
  $('coldCost').textContent = '$' + (totals.Cold*PRICES.Cold).toFixed(4);
  $('breakdownTotal').textContent = '$' + cost.toFixed(4);
  const degHot = files.length ? counts.Hot/files.length*360 : 0, degWarm = files.length ? counts.Warm/files.length*360 : 0;
  $('distribution').querySelector('.donut').style.background = files.length
    ? `conic-gradient(var(--hot) 0deg ${degHot}deg,var(--warm) ${degHot}deg ${degHot+degWarm}deg,var(--cold) ${degHot+degWarm}deg 360deg)`
    : '#f0eff5';
  renderTable();
}
function renderTable() {
  const query = $('searchInput').value.toLowerCase(), filter = $('tierFilter').value;
  const visible = state.files.filter(f => f.name.toLowerCase().includes(query) && (filter==='all' || f.tier===filter));
  $('showingCount').textContent = `Showing ${visible.length} of ${state.files.length} files`;
  if (!visible.length) {
    $('fileTable').innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-icon">▤</div><b>${state.files.length ? 'No matching files' : 'No files yet'}</b><span>${state.files.length ? 'Try another search or tier filter.' : 'Upload files above to see classification results.'}</span></td></tr>`;
    return;
  }
  $('fileTable').innerHTML = visible.map(f => `<tr>
    <td><div class="file-cell"><span class="file-icon">${iconFor(f.ext)}</span><div><b title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</b><small>${f.ext.toUpperCase()} file</small></div></div></td>
    <td>${bytes(f.size)}</td><td>${f.ext.toUpperCase()}</td><td>${f.access} <small>(${f.days}d)</small></td>
    <td><span class="tier-pill ${f.tier}">${f.tier} storage</span></td><td class="cost-cell">${money(f.size/(1024**3)*PRICES[f.tier])}</td>
    <td><button class="row-actions" title="Change storage tier" data-cycle="${f.id}">↻</button> <button class="row-actions" title="Remove file" data-remove="${f.id}">×</button></td>
  </tr>`).join('');
}
function iconFor(ext) { if(['jpg','jpeg','png','gif','webp','svg'].includes(ext))return '▧';if(['pdf','doc','docx','txt'].includes(ext))return '▤';if(['mp4','mov','mkv'].includes(ext))return '▷';if(['zip','rar','7z'].includes(ext))return '▣';return '◫';}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(message) { const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600); }
function exportReport() {
  const rows = [['File name','Size bytes','Type','Access pattern','Days since access','Storage tier','Estimated monthly cost USD']];
  state.files.forEach(f => rows.push([f.name,f.size,f.ext,f.access,f.days,f.tier,(f.size/(1024**3)*PRICES[f.tier]).toFixed(6)]));
  const csv = rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='cloudtier-storage-report.csv';a.click();URL.revokeObjectURL(url);toast('CSV report exported');
}
$('chooseBtn').addEventListener('click',()=>fileInput.click());
$('topUploadBtn').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',e=>addFiles(e.target.files));
$('dropzone').addEventListener('dragover',e=>{e.preventDefault();$('dropzone').classList.add('dragover');});
$('dropzone').addEventListener('dragleave',()=>$('dropzone').classList.remove('dragover'));
$('dropzone').addEventListener('drop',e=>{e.preventDefault();$('dropzone').classList.remove('dragover');addFiles(e.dataTransfer.files);});
$('searchInput').addEventListener('input',renderTable);$('tierFilter').addEventListener('change',renderTable);
$('fileTable').addEventListener('click',e=>{
  const remove=e.target.closest('[data-remove]'),cycle=e.target.closest('[data-cycle]');
  if(remove){state.files=state.files.filter(f=>f.id!==remove.dataset.remove);render();toast('File removed from the demo inventory');}
  if(cycle){const f=state.files.find(x=>x.id===cycle.dataset.cycle);const order=['Hot','Warm','Cold'];f.tier=order[(order.indexOf(f.tier)+1)%3];render();toast(`${f.name} moved to ${f.tier} recommendation`);}
});
$('clearBtn').addEventListener('click',()=>{state.files=[];render();toast('File list cleared');});
$('exportBtn').addEventListener('click',exportReport);
render();
