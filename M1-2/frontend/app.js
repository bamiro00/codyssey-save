const API_BASE_URL=(window.K_BEAUTY_API_URL||"http://127.0.0.1:8000").replace(/\/$/,"");
const sidebar=document.querySelector("#sidebar");
const menuButton=document.querySelector("#menuButton");
const themeToggle=document.querySelector("#themeToggle");
const navLinks=document.querySelectorAll(".nav-link");
const questionInput=document.querySelector("#questionInput");
const chatForm=document.querySelector("#chatForm");
const chatLoading=document.querySelector("#chatLoading");
const chatError=document.querySelector("#chatError");
const messageList=document.querySelector("#messageList");
const historyList=document.querySelector("#historyList");
const dataModal=document.querySelector("#dataModal");
const dataForm=document.querySelector("#dataForm");
const dataTableBody=document.querySelector("#dataTableBody");
const dataError=document.querySelector("#dataError");
const dataSearchInput=document.querySelector("#dataSearchInput");
const toast=document.querySelector("#toast");
const connectionBadge=document.querySelector("#connectionBadge");
const exportTrendChart=document.querySelector("#exportTrendChart");
const trendChartPeriod=document.querySelector("#trendChartPeriod");
const trendChartSummary=document.querySelector("#trendChartSummary");
const exportCsvButton=document.querySelector("#exportCsvButton");
const exportJsonButton=document.querySelector("#exportJsonButton");
let dataItems=[];
let conversationItems=[];
let activeConversationId=null;
let chartRange="all";
let toastTimer;

if(location.hash)history.replaceState(null,"",location.pathname);

function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]))}
function formatMessageContent(value){
  return escapeHtml(value)
    .replace(/^#{1,3}\s+(.+)$/gm,'<strong class="answer-heading">$1</strong>')
    .replace(/^(핵심 요약|데이터 근거|해석|활용 아이디어)\s*$/gm,'<strong class="answer-heading">$1</strong>')
    .replace(/^\d+[.)]\s+(.+)$/gm,'<strong class="answer-subheading">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm,'<span class="answer-bullet">• $1</span>')
    .replace(/^---+$/gm,'<hr class="answer-divider">')
    .replace(/\n/g,"<br>");
}
function formatMoney(value){return new Intl.NumberFormat("ko-KR").format(Number(value||0))}
function formatDateTime(value){if(!value)return "";const date=new Date(value);return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
function setConnection(connected){connectionBadge.classList.toggle("is-connected",connected);connectionBadge.innerHTML=`<i></i>${connected?"API 연결됨":"연결 오류"}`}
function showToast(message){clearTimeout(toastTimer);toast.textContent=message;toast.classList.add("is-visible");toastTimer=setTimeout(()=>toast.classList.remove("is-visible"),2800)}
function applyTheme(theme){
  const isDark=theme==="dark";
  document.documentElement.dataset.theme=isDark?"dark":"light";
  themeToggle.setAttribute("aria-pressed",String(isDark));
  themeToggle.setAttribute("aria-label",isDark?"라이트 모드로 전환":"다크 모드로 전환");
  themeToggle.querySelector("span").textContent=isDark?"☀":"☾";
}
function toggleTheme(){
  const nextTheme=document.documentElement.dataset.theme==="dark"?"light":"dark";
  try{localStorage.setItem("kbeauty-theme",nextTheme)}catch{}
  applyTheme(nextTheme);
  showToast(nextTheme==="dark"?"다크 모드로 전환했습니다.":"라이트 모드로 전환했습니다.");
}
function showError(element,message){element.textContent=message;element.hidden=false}
function clearError(element){element.textContent="";element.hidden=true}

async function api(path,options={}){
  const response=await fetch(`${API_BASE_URL}${path}`,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  let body={};
  try{body=await response.json()}catch{body={}}
  if(!response.ok)throw new Error(body.detail||`요청에 실패했습니다. (${response.status})`);
  return body;
}

async function loadSummary(){
  const summary=await api("/api/data/summary");
  document.querySelector("#summaryPeriod").textContent=`${summary.period.start} — ${summary.period.end}`;
  document.querySelector("#summaryCount").textContent=formatMoney(summary.count);
  document.querySelector("#summaryAverage").textContent=`$${formatMoney(summary.average)}`;
  document.querySelector("#summaryTrend").textContent=summary.recent_trend;
  const rate=Number(summary.recent_change_rate||0);
  document.querySelector("#summaryChangeRate").textContent=`최근 3개월 ${rate>0?"+":""}${rate.toFixed(2)}%`;
  const trendCard=document.querySelector(".trend-card");
  trendCard.classList.remove("trend-up","trend-down","trend-flat");
  trendCard.classList.add(summary.recent_trend==="증가"?"trend-up":summary.recent_trend==="감소"?"trend-down":"trend-flat");
  document.querySelector("#summaryMaximum").textContent=`$${formatMoney(summary.maximum.value)}`;
  document.querySelector("#summaryMaximumDate").textContent=summary.maximum.date;
  document.querySelector("#summaryMinimum").textContent=`$${formatMoney(summary.minimum.value)}`;
  document.querySelector("#summaryMinimumDate").textContent=summary.minimum.date;
  document.querySelector("#summaryLatest").textContent=`$${formatMoney(summary.latest.value)}`;
  document.querySelector("#summaryLatestDate").textContent=summary.latest.date;
  document.querySelector("#updatedAt").textContent=`${new Date().toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})} 갱신`;
}

function renderData(items){
  document.querySelector("#recordCount").textContent=`${items.length}개 항목`;
  if(!items.length){dataTableBody.innerHTML='<tr class="table-empty-row"><td colspan="5"><span>↗</span><strong>표시할 데이터가 없습니다</strong><small>검색어를 변경하거나 데이터를 추가해 주세요.</small></td></tr>';return}
  dataTableBody.innerHTML=items.map(item=>`<tr><td><strong>${escapeHtml(item.date)}</strong></td><td>$${formatMoney(item.value)}</td><td>${escapeHtml(item.unit||"US$")}</td><td>${escapeHtml(item.memo||"")}</td><td class="row-actions"><button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">수정</button><button type="button" data-action="delete" data-id="${escapeHtml(item.id)}">삭제</button></td></tr>`).join("");
}

function renderExportChart(items){
  const ordered=[...items].sort((a,b)=>a.date.localeCompare(b.date));
  const selected=chartRange==="all"?ordered:ordered.slice(-Number(chartRange));
  if(!selected.length){exportTrendChart.innerHTML="";trendChartSummary.innerHTML="";return}
  const width=1000,height=280,padding={top:24,right:28,bottom:45,left:78};
  const values=selected.map(item=>Number(item.value));
  const min=Math.min(...values),max=Math.max(...values),range=Math.max(max-min,1);
  const x=index=>padding.left+(index/Math.max(selected.length-1,1))*(width-padding.left-padding.right);
  const y=value=>padding.top+(1-(value-min)/range)*(height-padding.top-padding.bottom);
  const points=selected.map((item,index)=>`${x(index).toFixed(1)},${y(Number(item.value)).toFixed(1)}`).join(" ");
  const area=`M ${x(0).toFixed(1)} ${height-padding.bottom} L ${points.replaceAll(","," ")} L ${x(selected.length-1).toFixed(1)} ${height-padding.bottom} Z`;
  const grid=Array.from({length:5},(_,index)=>{
    const ratio=index/4;const gridY=padding.top+ratio*(height-padding.top-padding.bottom);const value=max-ratio*range;
    return `<g><line x1="${padding.left}" y1="${gridY}" x2="${width-padding.right}" y2="${gridY}"/><text x="${padding.left-14}" y="${gridY+4}" text-anchor="end">${(value/100000000).toFixed(1)}억</text></g>`;
  }).join("");
  const labelIndexes=[0,Math.floor((selected.length-1)/2),selected.length-1];
  const labels=labelIndexes.map(index=>`<text class="chart-x-label" x="${x(index)}" y="${height-15}" text-anchor="${index===0?"start":index===selected.length-1?"end":"middle"}">${escapeHtml(selected[index].date)}</text>`).join("");
  const latest=selected.at(-1);const latestX=x(selected.length-1);const latestY=y(Number(latest.value));
  exportTrendChart.innerHTML=`<g class="chart-grid">${grid}</g><path class="chart-area" d="${area}"/><polyline class="chart-line" points="${points}"/><circle class="chart-latest-halo" cx="${latestX}" cy="${latestY}" r="10"/><circle class="chart-latest" cx="${latestX}" cy="${latestY}" r="5"><title>${escapeHtml(latest.date)} · US$ ${formatMoney(latest.value)}</title></circle>${labels}`;
  const first=selected[0];const change=(Number(latest.value)-Number(first.value))/Math.max(Number(first.value),1)*100;
  const peak=selected.reduce((best,item)=>Number(item.value)>Number(best.value)?item:best,selected[0]);
  trendChartPeriod.textContent=`${first.date} — ${latest.date} · ${selected.length}개월`;
  trendChartSummary.innerHTML=`<span><small>구간 변화</small><strong class="${change>=0?"is-positive":"is-negative"}">${change>=0?"+":""}${change.toFixed(1)}%</strong></span><span><small>구간 최고</small><strong>${escapeHtml(peak.date)} · $${formatMoney(peak.value)}</strong></span><span><small>최근 값</small><strong>${escapeHtml(latest.date)} · $${formatMoney(latest.value)}</strong></span>`;
}

async function loadData(){
  clearError(dataError);
  try{const result=await api("/api/data");dataItems=(result.data||[]).sort((a,b)=>b.date.localeCompare(a.date));renderData(dataItems);renderExportChart(dataItems)}catch(error){showError(dataError,error.message);throw error}
}

function filterData(){const term=dataSearchInput.value.trim().toLowerCase();renderData(dataItems.filter(item=>!term||item.date.toLowerCase().includes(term)||String(item.memo||"").toLowerCase().includes(term)))}
function downloadExport(content,fileName,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download=fileName;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}
function getExportRows(){return [...dataItems].sort((a,b)=>b.date.localeCompare(a.date)).map(({date,value,unit,memo})=>({date,value:Number(value),unit:unit||"US$",memo:memo||""}))}
function exportCsv(){
  const rows=getExportRows();if(!rows.length){showToast("내보낼 데이터가 없습니다.");return}
  const quote=value=>`"${String(value??"").replaceAll('"','""')}"`;
  const csv=["기준월,수출금액,단위,메모",...rows.map(row=>[row.date,row.value,row.unit,row.memo].map(quote).join(","))].join("\r\n");
  downloadExport(`\uFEFF${csv}`,`kbeauty-export-${rows[0].date}.csv`,"text/csv;charset=utf-8");showToast("CSV 파일을 내려받았습니다.");
}
function exportJson(){
  const rows=getExportRows();if(!rows.length){showToast("내보낼 데이터가 없습니다.");return}
  const payload={source:"한국무역협회 K-stat",category:"화장품",mti_code:"2273",unit:"US$",count:rows.length,data:rows};
  downloadExport(JSON.stringify(payload,null,2),`kbeauty-export-${rows[0].date}.json`,"application/json;charset=utf-8");showToast("JSON 파일을 내려받았습니다.");
}
function openDataModal(item=null){
  dataForm.reset();
  document.querySelector("#dataId").value=item?.id||"";
  document.querySelector("#modalTitle").textContent=item?"데이터 수정":"새 데이터 추가";
  document.querySelector("#dataDate").value=item?.date||"";
  document.querySelector("#dataDate").disabled=Boolean(item);
  document.querySelector("#dataValue").value=item?.value??"";
  document.querySelector("#dataMemo").value=item?.memo||"";
  dataModal.hidden=false;document.body.style.overflow="hidden";
  setTimeout(()=>document.querySelector(item?"#dataValue":"#dataDate").focus(),0);
}
function closeDataModal(){dataModal.hidden=true;document.body.style.overflow="";document.querySelector("#dataDate").disabled=false;dataForm.reset()}

async function saveData(event){
  event.preventDefault();
  const id=document.querySelector("#dataId").value;
  const payload={date:document.querySelector("#dataDate").value,value:Number(document.querySelector("#dataValue").value),memo:document.querySelector("#dataMemo").value.trim(),unit:"US$"};
  const submitButton=dataForm.querySelector('button[type="submit"]');submitButton.disabled=true;submitButton.textContent="저장 중";
  try{await api(id?`/api/data/${encodeURIComponent(id)}`:"/api/data",{method:id?"PUT":"POST",body:JSON.stringify(payload)});closeDataModal();await Promise.all([loadData(),loadSummary()]);showToast(id?"데이터가 수정되었습니다.":"데이터가 추가되었습니다.")}
  catch(error){showToast(error.message)}finally{submitButton.disabled=false;submitButton.textContent="저장"}
}

async function deleteData(id){
  if(!confirm(`${id} 데이터를 삭제할까요?`))return;
  try{await api(`/api/data/${encodeURIComponent(id)}`,{method:"DELETE"});await Promise.all([loadData(),loadSummary()]);showToast("데이터가 삭제되었습니다.")}catch(error){showToast(error.message)}
}

function renderMessages(messages,{scrollToBottom=true}={}){
  if(!messages?.length){messageList.innerHTML='<div class="welcome-message"><span class="welcome-icon">✦</span><h3>수출 데이터에서 인사이트를 찾아보세요</h3><p>변화의 의미부터 실무 활용 아이디어까지 분석합니다.</p><div class="suggestion-list"><button type="button" data-question="최근 12개월 수출 흐름과 주목할 변화를 분석해줘">최근 흐름 분석</button><button type="button" data-question="수출액이 급증하거나 급감한 달을 찾아서 의미를 설명해줘">변곡점 찾기</button><button type="button" data-question="이 데이터에서 얻을 수 있는 K-뷰티 수출 전략 인사이트를 알려줘">전략 인사이트</button></div></div>';bindSuggestions();return}
  messageList.innerHTML=messages.map(message=>`<div class="chat-message ${message.role}"><span>${message.role==="user"?"나":"AI"}</span><div>${formatMessageContent(message.content)}</div></div>`).join("");
  messageList.scrollTop=scrollToBottom?messageList.scrollHeight:0;
}

function renderHistory(conversations){
  document.querySelector("#historyCount").textContent=`${conversations.length}개`;
  if(!conversations.length){historyList.innerHTML='<div class="empty-state"><span>⌁</span><strong>저장된 대화가 없습니다</strong><p>AI와 나눈 대화가 이곳에 표시됩니다.</p></div>';return}
  historyList.innerHTML=conversations.map(item=>`<article class="history-item${item.id===activeConversationId?" is-active":""}" data-id="${escapeHtml(item.id)}"><button class="history-open" type="button" data-action="open-conversation" data-id="${escapeHtml(item.id)}" title="${escapeHtml(item.title||"새 대화")}"><strong>${escapeHtml(item.title||"새 대화")}</strong><small>${formatDateTime(item.created_at)}</small></button><button class="history-delete" type="button" data-action="delete-conversation" data-id="${escapeHtml(item.id)}" aria-label="대화 삭제">×</button></article>`).join("");
}

async function loadHistory(){
  try{const result=await api("/api/conversations");conversationItems=result.conversations||[];renderHistory(conversationItems)}catch(error){document.querySelector("#historyCount").textContent="오류";historyList.innerHTML=`<div class="empty-state"><strong>대화를 불러오지 못했습니다</strong><p>${escapeHtml(error.message)}</p></div>`}
}
async function openConversation(id){try{const conversation=await api(`/api/conversations/${encodeURIComponent(id)}`);activeConversationId=id;renderHistory(conversationItems);renderMessages(conversation.messages||[],{scrollToBottom:false});document.querySelector("#assistant").scrollIntoView({behavior:"smooth"})}catch(error){showToast(error.message)}}
async function deleteConversation(id){if(!confirm("이 대화 기록을 삭제할까요?"))return;try{await api(`/api/conversations/${encodeURIComponent(id)}`,{method:"DELETE"});if(activeConversationId===id){activeConversationId=null;renderMessages([])}await loadHistory();showToast("대화 기록이 삭제되었습니다.")}catch(error){showToast(error.message)}}

async function sendQuestion(event){
  event.preventDefault();const question=questionInput.value.trim();if(!question){showToast("질문을 입력해 주세요.");return}
  clearError(chatError);renderMessages([{role:"user",content:question}]);questionInput.value="";questionInput.style.height="auto";chatLoading.hidden=false;chatForm.querySelector("button").disabled=true;
  try{const result=await api("/api/chat",{method:"POST",body:JSON.stringify({question})});activeConversationId=result.conversation_id;renderMessages([{role:"user",content:question},{role:"assistant",content:result.answer}]);await loadHistory()}
  catch(error){showError(chatError,error.message);renderMessages([{role:"user",content:question}])}
  finally{chatLoading.hidden=true;chatForm.querySelector("button").disabled=false}
}

function bindSuggestions(){document.querySelectorAll("[data-question]").forEach(button=>button.addEventListener("click",()=>{questionInput.value=button.dataset.question;questionInput.focus()}))}

applyTheme(document.documentElement.dataset.theme||"light");
themeToggle.addEventListener("click",toggleTheme);
menuButton.addEventListener("click",()=>{const open=sidebar.classList.toggle("is-open");menuButton.setAttribute("aria-expanded",String(open))});
navLinks.forEach(link=>link.addEventListener("click",event=>{event.preventDefault();navLinks.forEach(item=>item.classList.remove("is-active"));link.classList.add("is-active");document.querySelector(link.getAttribute("href")).scrollIntoView({behavior:"smooth"});history.replaceState(null,"",location.pathname);sidebar.classList.remove("is-open");menuButton.setAttribute("aria-expanded","false")}));
document.querySelector(".brand").addEventListener("click",event=>{event.preventDefault();document.querySelector("#overview").scrollIntoView({behavior:"smooth"});history.replaceState(null,"",location.pathname)});
document.querySelectorAll(".intro-actions a").forEach(link=>link.addEventListener("click",event=>{event.preventDefault();document.querySelector(link.getAttribute("href")).scrollIntoView({behavior:"smooth"})}));
bindSuggestions();
questionInput.addEventListener("input",()=>{questionInput.style.height="auto";questionInput.style.height=`${Math.min(questionInput.scrollHeight,120)}px`});
chatForm.addEventListener("submit",sendQuestion);
document.querySelector("#addDataButton").addEventListener("click",()=>openDataModal());
document.querySelector("#modalCloseButton").addEventListener("click",closeDataModal);
document.querySelector("#modalCancelButton").addEventListener("click",closeDataModal);
dataModal.addEventListener("click",event=>{if(event.target===dataModal)closeDataModal()});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!dataModal.hidden)closeDataModal()});
dataForm.addEventListener("submit",saveData);
dataSearchInput.addEventListener("input",filterData);
exportCsvButton.addEventListener("click",exportCsv);
exportJsonButton.addEventListener("click",exportJson);
document.querySelectorAll("[data-chart-range]").forEach(button=>button.addEventListener("click",()=>{chartRange=button.dataset.chartRange;document.querySelectorAll("[data-chart-range]").forEach(item=>item.classList.toggle("is-active",item===button));renderExportChart(dataItems)}));
dataTableBody.addEventListener("click",event=>{const button=event.target.closest("button[data-action]");if(!button)return;const item=dataItems.find(entry=>entry.id===button.dataset.id);if(button.dataset.action==="edit"&&item)openDataModal(item);if(button.dataset.action==="delete")deleteData(button.dataset.id)});
historyList.addEventListener("click",event=>{const button=event.target.closest("button[data-action]");if(!button)return;if(button.dataset.action==="open-conversation")openConversation(button.dataset.id);if(button.dataset.action==="delete-conversation")deleteConversation(button.dataset.id)});
document.querySelector("#refreshHistoryButton").addEventListener("click",async()=>{await loadHistory();showToast("대화 목록을 새로고침했습니다.")});
document.querySelector("#newConversationButton").addEventListener("click",()=>{activeConversationId=null;renderHistory(conversationItems);renderMessages([]);questionInput.focus();showToast("새 질문을 시작할 수 있습니다.")});

async function initialize(){
  const results=await Promise.allSettled([loadSummary(),loadData(),loadHistory()]);
  const connected=results.slice(0,2).some(result=>result.status==="fulfilled");setConnection(connected);
  if(!connected)showToast("API 서버에 연결할 수 없습니다. 서버 실행 상태를 확인해 주세요.");
}
initialize();
