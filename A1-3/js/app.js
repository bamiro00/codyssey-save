const state={catalog:[],selected:{foodA:null,foodB:null,foodC:null}};
const speciesLabel={dog:"강아지",cat:"고양이"};
const concernLabel={none:"특별한 고민 없음",weight:"체중 관리",palatability:"기호성",digestion:"소화",senior:"시니어 사료 선택"};
const basisLabel={guaranteed_analysis:"보장분석",dry_matter_average:"Dry Matter 평균값",registered_analysis:"등록성분량"};
const AI_TIMEOUT_MS=75000;

function normalize(value){
  return String(value||"").toLowerCase()
    .replace(/[’']/g,"")
    .replace(/royal\s*canin/g,"royalcanin")
    .replace(/로얄\s*캐닌/g,"로얄캐닌")
    .replace(/[\s\-_&/·]+/g,"")
    .trim();
}
function currentSpecies(){return document.querySelector('input[name="species"]:checked').value}
function qValue(n){
  if(!n||n.value===null||n.value===undefined)return"미공시";
  if(n.qualifier==="min")return`≥ ${n.value}%`;
  if(n.qualifier==="max")return`≤ ${n.value}%`;
  return`${n.value}%`;
}
async function loadCatalog(){
  if(window.PET_FOODS_DATA?.products){state.catalog=window.PET_FOODS_DATA.products;return}
  const r=await fetch("./data/pet-foods.json");
  if(!r.ok)throw new Error("catalog fetch failed");
  state.catalog=(await r.json()).products;
}
function searchableText(p){
  return [
    ...(p.search_aliases||[]),p.brand_ko,p.brand,p.product_name_ko,p.product_name,
    `${p.brand_ko||""}${p.product_name_ko||""}`,`${p.brand||""}${p.product_name||""}`
  ].map(normalize).join("|");
}
function ensureCatalog(){
  if(!state.catalog.length&&window.PET_FOODS_DATA?.products){
    state.catalog=window.PET_FOODS_DATA.products;
  }
  return state.catalog.length>0;
}
function searchProducts(query){
  ensureCatalog();
  const q=normalize(query),prefix=currentSpecies()==="dog"?"D":"C";
  if(!q)return[];
  return state.catalog.filter(p=>p.product_id.startsWith(prefix)&&searchableText(p).includes(q)).slice(0,10);
}
function categoryKo(p){return({basic:"기본",senior:"시니어",weight_management:"체중관리"})[p.category]||p.category||""}
function renderSuggestions(input){
  const box=document.querySelector(`.suggestions[data-for="${input.id}"]`);
  if(!box)return;
  const items=searchProducts(input.value);box.innerHTML="";
  if(!input.value.trim()){box.classList.remove("show");return}
  if(!items.length){
    box.innerHTML='<div class="suggestion-item"><div class="suggestion-title">검색 결과 없음</div><div class="suggestion-meta">‘제품 직접 추가하기’를 이용하세요.</div></div>';
    box.classList.add("show");return;
  }
  items.forEach(p=>{
    const node=document.createElement("div");
    node.className="suggestion-item";
    node.innerHTML=`<div class="suggestion-title">${p.display_brand}</div>
      <div class="suggestion-product">${p.display_name}</div>
      <div class="suggestion-meta">${speciesLabel[currentSpecies()]} · ${categoryKo(p)} · ${p.target_age||p.life_stage||""}</div>`;
    node.onclick=()=>{
      state.selected[input.id]=p;
      input.value=`${p.brand_ko} / ${p.brand} · ${p.product_name_ko} / ${p.product_name}`;
      box.classList.remove("show");
    };
    box.appendChild(node);
  });
  box.classList.add("show");
}
function clearSelections(){
  state.selected={foodA:null,foodB:null,foodC:null};
  document.querySelectorAll(".food-search").forEach(x=>x.value="");
  document.querySelectorAll(".suggestions").forEach(x=>x.classList.remove("show"));
}
function makeCustomProduct(){
  const brand=document.getElementById("customBrand").value.trim(),name=document.getElementById("customName").value.trim(),life=document.getElementById("customLifeStage").value;
  if(!brand||!name||!life)return null;
  const n=id=>{const v=document.getElementById(id).value;return v===""?null:Number(v)};
  return{
    product_id:"USER_CUSTOM",brand_ko:brand,brand,product_name_ko:name,product_name:name,
    display_brand:`${brand} / 사용자 입력`,display_name:`${name} / User Provided`,
    category:"user_provided",life_stage:life,target_age:"사용자 입력",nutrition_basis:"registered_analysis",
    nutrients:{protein_pct:{value:n("customProtein"),qualifier:"min"},fat_pct:{value:n("customFat"),qualifier:"min"},fiber_pct:{value:n("customFiber"),qualifier:"max"},moisture_pct:{value:n("customMoisture"),qualifier:"max"}},
    energy:{kcal_kg:n("customKcal"),source_status:"user_provided"},
    manufacturer_evidence:{keywords_ko:[]},review_evidence:{positive_keywords:[],mixed_keywords:[],neutral_keywords:[],confidence:"none"}
  };
}
function toApiProduct(p){
  return{
    product_id:p.product_id,
    brand_ko:p.brand_ko||p.brand||"",
    brand:p.brand||p.brand_ko||"",
    product_name_ko:p.product_name_ko||p.product_name||"",
    product_name:p.product_name||p.product_name_ko||"",
    display_brand:p.display_brand,
    display_name:p.display_name,
    category:p.category,
    life_stage:p.life_stage,
    target_age:p.target_age,
    nutrition_basis:p.nutrition_basis,
    nutrients:p.nutrients,
    energy:p.energy,
    manufacturer_evidence:{keywords_ko:p.manufacturer_evidence?.keywords_ko||[]},
    review_evidence:{
      positive_keywords:p.review_evidence?.positive_keywords||[],
      mixed_keywords:p.review_evidence?.mixed_keywords||[],
      confidence:p.review_evidence?.confidence||"none"
    }
  };
}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function productNameParts(p){
  return{
    ko:p.product_name_ko||p.product_name||p.display_name||"",
    en:(p.product_name&&p.product_name!==p.product_name_ko)?p.product_name:""
  };
}
function productNameHtml(p,compact=false){
  const name=productNameParts(p);
  return `<span class="product-name-ko${compact?" compact":""}">${escapeHtml(name.ko)}</span>${name.en?`<span class="product-name-en">${escapeHtml(name.en)}</span>`:""}`;
}
function setAiMessage(message,className=""){
  const box=document.getElementById("aiExplanation");
  box.className=`ai-content ${className}`.trim();
  box.replaceChildren();
  const p=document.createElement("p");p.textContent=message;box.appendChild(p);
}
function appendAiInsight(parent,title,text,className){
  if(!text)return;
  const section=document.createElement("section");section.className=`ai-insight ${className}`;
  const heading=document.createElement("h4");heading.textContent=title;section.appendChild(heading);
  const paragraph=document.createElement("p");paragraph.textContent=text;section.appendChild(paragraph);
  parent.appendChild(section);
}
function renderAiResult(result){
  const box=document.getElementById("aiExplanation");
  box.className="ai-content ai-success";box.replaceChildren();

  const verdict=document.createElement("section");verdict.className="ai-verdict";
  const label=document.createElement("span");label.className="ai-verdict-label";label.textContent="현재 조건에서 1순위";verdict.appendChild(label);
  const title=document.createElement("h4");title.className="ai-verdict-title";title.textContent=result.verdict_title||"먼저 비교해볼 후보";verdict.appendChild(title);
  const product=document.createElement("div");product.className="ai-product-name";
  const productKo=document.createElement("strong");productKo.textContent=result.recommended_product_name||"";product.appendChild(productKo);
  if(result.recommended_product_name_en&&result.recommended_product_name_en!==result.recommended_product_name){
    const productEn=document.createElement("span");productEn.textContent=result.recommended_product_name_en;product.appendChild(productEn);
  }
  verdict.appendChild(product);
  const summary=document.createElement("p");summary.className="ai-verdict-copy";summary.textContent=result.verdict||"";verdict.appendChild(summary);
  box.appendChild(verdict);

  const grid=document.createElement("div");grid.className="ai-insight-grid";
  appendAiInsight(grid,"영양성분으로 보면",result.nutrition_analysis,"nutrition");
  appendAiInsight(grid,"제조사가 강조하는 점",result.manufacturer_analysis,"manufacturer");
  appendAiInsight(grid,"구매후기에서 보인 반응",result.review_analysis,"reviews");
  box.appendChild(grid);

  if(result.alternative_product_name&&result.alternative_tradeoff){
    const alternative=document.createElement("section");alternative.className="ai-alternative-card";
    const altHead=document.createElement("div");altHead.className="ai-alternative-head";altHead.textContent="이럴 땐 다른 후보";alternative.appendChild(altHead);
    const altName=document.createElement("strong");altName.textContent=result.alternative_product_name;alternative.appendChild(altName);
    if(result.alternative_product_name_en&&result.alternative_product_name_en!==result.alternative_product_name){
      const altEn=document.createElement("span");altEn.className="ai-alternative-en";altEn.textContent=result.alternative_product_name_en;alternative.appendChild(altEn);
    }
    const altText=document.createElement("p");altText.textContent=result.alternative_tradeoff;alternative.appendChild(altText);
    box.appendChild(alternative);
  }

  if(result.check_point){
    const check=document.createElement("section");check.className="ai-check-card";
    const checkTitle=document.createElement("strong");checkTitle.textContent="선택 전 한 가지 체크";check.appendChild(checkTitle);
    const checkText=document.createElement("p");checkText.textContent=result.check_point;check.appendChild(checkText);
    box.appendChild(check);
  }

  const disclaimer=document.createElement("small");disclaimer.className="ai-disclaimer";disclaimer.textContent=result.disclaimer;box.appendChild(disclaimer);
}
async function requestAiComparison(products,age,concern){
  setAiMessage("AI가 등록된 제품정보를 비교하고 있습니다…","ai-loading");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),AI_TIMEOUT_MS);
  try{
    const response=await fetch("/api/compare",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({species:currentSpecies(),age:Number(age),concern,products:products.map(toApiProduct)}),
      signal:controller.signal
    });
    let payload={};
    try{payload=await response.json()}catch{}
    if(!response.ok)throw new Error(payload.error||"AI 설명을 불러오지 못했습니다.");
    if(!payload.result)throw new Error("AI 응답 형식을 확인하지 못했습니다.");
    renderAiResult(payload.result);
  }catch(error){
    const message=error.name==="AbortError"
      ?"AI 응답이 늦어지고 있습니다. 잠시 후 다시 시도해주세요."
      :(error.message||"AI 설명을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    setAiMessage(message,"ai-error");
  }finally{clearTimeout(timer)}
}
function renderResult(products,age,concern){
  document.getElementById("resultContext").textContent=`${speciesLabel[currentSpecies()]} · ${age}살 · ${concernLabel[concern]}`;
  document.getElementById("selectedCards").innerHTML=products.map(p=>`
    <article class="selected-card"><span class="badge">${p.product_id==="USER_CUSTOM"?"사용자 입력 제품":"Seed Catalog"}</span>
    <div class="selected-brand">${escapeHtml(p.display_brand||p.brand_ko||p.brand||"")}</div>
    <div class="selected-product-name">${productNameHtml(p)}</div>
    <p>${escapeHtml(p.target_age||p.life_stage||"-")}</p></article>`).join("");
  const headers=["항목",...products.map(p=>productNameHtml(p,true))];
  const rows=[
    ["Life Stage",...products.map(p=>p.life_stage||"미공시")],
    ["대상 연령",...products.map(p=>p.target_age||"미공시")],
    ["열량 (kcal/kg)",...products.map(p=>p.energy?.kcal_kg??"공식 미공시")],
    ["단백질",...products.map(p=>qValue(p.nutrients?.protein_pct))],
    ["지방",...products.map(p=>qValue(p.nutrients?.fat_pct))],
    ["섬유",...products.map(p=>qValue(p.nutrients?.fiber_pct))],
    ["수분",...products.map(p=>qValue(p.nutrients?.moisture_pct))],
    ["영양표 기준",...products.map(p=>basisLabel[p.nutrition_basis]||p.nutrition_basis||"미공시")]
  ];
  document.querySelector("#compareTable thead").innerHTML=`<tr>${headers.map((x,i)=>`<th${i?` class="product-table-head"`:""}>${x}</th>`).join("")}</tr>`;
  document.querySelector("#compareTable tbody").innerHTML=rows.map(r=>`<tr>${r.map((x,i)=>i?`<td>${escapeHtml(x)}</td>`:`<th>${escapeHtml(x)}</th>`).join("")}</tr>`).join("");
  const bases=[...new Set(products.map(p=>p.nutrition_basis))];
  document.getElementById("basisNotice").textContent=bases.length>1
    ?"※ 제품별 영양성분 표시 기준이 달라 단백질·지방·섬유 수치를 단순 우열로 비교하지 않습니다."
    :"※ 선택한 제품은 같은 영양표 기준입니다. min/max/평균값 표시 방식도 함께 확인하세요.";
  document.getElementById("evidencePanels").innerHTML=products.map(p=>{
    const m=p.manufacturer_evidence?.keywords_ko||[],pos=p.review_evidence?.positive_keywords||[],mix=p.review_evidence?.mixed_keywords||[];
    const chips=(a,type)=>a.length?a.map(x=>`<span class="keyword keyword-${type}">${escapeHtml(x)}</span>`).join(""):`<span class="keyword keyword-empty">정보 없음</span>`;
    return`<article class="evidence-card">
      <div class="evidence-product-name">${productNameHtml(p,true)}</div>
      <div class="evidence-group evidence-manufacturer"><strong>제조사가 강조하는 특징</strong><div class="keyword-list">${chips(m,"manufacturer")}</div></div>
      <div class="evidence-group evidence-positive"><strong>구매후기 긍정 경험</strong><div class="keyword-list">${chips(pos,"positive")}</div></div>
      <div class="evidence-group evidence-mixed"><strong>호불호·주의 경험</strong><div class="keyword-list">${chips(mix,"mixed")}</div></div>
    </article>`;
  }).join("");
  setAiMessage("AI가 영양정보·제조사 강조점·구매후기를 함께 비교하고 있습니다…","ai-loading");
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("result").scrollIntoView({behavior:"smooth",block:"start"});
}
function bindSearchFallback(){
  const handle=input=>{
    if(!input?.classList?.contains("food-search"))return;
    state.selected[input.id]=null;
    renderSuggestions(input);
  };
  document.addEventListener("input",e=>handle(e.target));
  document.addEventListener("keyup",e=>handle(e.target));
  document.addEventListener("focusin",e=>handle(e.target));
}

bindSearchFallback();

function setup(){
  const msg=document.getElementById("formMessage");
  msg.textContent=`제품 데이터 ${state.catalog.length}종을 불러왔습니다.`;
  document.querySelectorAll(".food-search").forEach(input=>{
    input.setAttribute("data-search-ready","true");
  });
  document.querySelectorAll('input[name="species"]').forEach(r=>r.addEventListener("change",()=>{clearSelections();msg.textContent=`${speciesLabel[currentSpecies()]} 사료를 검색할 수 있습니다.`}));
  document.getElementById("showCustom").onclick=()=>document.getElementById("customProduct").classList.toggle("hidden");
  document.getElementById("compareForm").addEventListener("submit",async e=>{
    e.preventDefault();msg.classList.remove("error");
    const age=document.getElementById("age").value,concern=document.getElementById("concern").value;
    let products=[state.selected.foodA,state.selected.foodB,state.selected.foodC].filter(Boolean);
    const custom=!document.getElementById("customProduct").classList.contains("hidden")?makeCustomProduct():null;
    if(custom)products.push(custom);
    products=[...new Map(products.map(p=>[(p.product_id||"")+p.display_name,p])).values()];
    if(!age){msg.textContent="나이를 입력해주세요.";msg.classList.add("error");return}
    if(products.length<2){msg.textContent="검색 결과에서 비교할 사료를 2개 이상 선택해주세요.";msg.classList.add("error");return}
    if(products.length>3){msg.textContent="사료는 최대 3개까지 비교할 수 있습니다.";msg.classList.add("error");return}
    msg.textContent="";
    renderResult(products,age,concern);
    const button=e.currentTarget.querySelector('.compare-btn');
    const originalText=button.textContent;button.disabled=true;button.textContent="AI 비교 중…";
    await requestAiComparison(products,age,concern);
    button.disabled=false;button.textContent=originalText;
  });
  document.addEventListener("click",e=>{if(!e.target.closest(".picker"))document.querySelectorAll(".suggestions").forEach(x=>x.classList.remove("show"))});
}
loadCatalog().then(()=>{
  ensureCatalog();
  setup();
}).catch(err=>{
  console.error(err);
  if(ensureCatalog()){
    setup();
    return;
  }
  const msg=document.getElementById("formMessage");msg.textContent="제품 데이터를 불러오지 못했습니다.";msg.classList.add("error");
});
