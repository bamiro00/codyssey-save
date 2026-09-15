const state = {
  catalog: [],
  selected: {
    foodA: null,
    foodB: null,
    foodC: null
  }
};

const speciesLabel = {
  dog: "강아지",
  cat: "고양이"
};

const concernLabel = {
  none: "특별한 고민 없음",
  weight: "체중 관리",
  palatability: "기호성",
  digestion: "소화",
  senior: "시니어 사료 선택"
};

const basisLabel = {
  guaranteed_analysis: "보장분석",
  dry_matter_average: "Dry Matter 평균값",
  registered_analysis: "등록성분량"
};

const AI_TIMEOUT_MS = 75000;


/* =========================
   기본 유틸
========================= */

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/royal\s*canin/g, "royalcanin")
    .replace(/로얄\s*캐닌/g, "로얄캐닌")
    .replace(/[\s\-_&/·]+/g, "")
    .trim();
}

function currentSpecies() {
  return document.querySelector(
    'input[name="species"]:checked'
  ).value;
}

function qValue(n) {
  if (
    !n ||
    n.value === null ||
    n.value === undefined
  ) {
    return "미공시";
  }

  if (n.qualifier === "min") {
    return `≥ ${n.value}%`;
  }

  if (n.qualifier === "max") {
    return `≤ ${n.value}%`;
  }

  return `${n.value}%`;
}


/* =========================
   제품 데이터
========================= */

async function loadCatalog() {

  if (
    window.PET_FOODS_DATA &&
    Array.isArray(window.PET_FOODS_DATA.products)
  ) {
    state.catalog =
      window.PET_FOODS_DATA.products;

    return;
  }

  const response =
    await fetch("./data/pet-foods.json");

  if (!response.ok) {
    throw new Error(
      "catalog fetch failed"
    );
  }

  const data =
    await response.json();

  state.catalog =
    data.products || [];
}


function ensureCatalog() {

  if (
    !state.catalog.length &&
    window.PET_FOODS_DATA &&
    Array.isArray(
      window.PET_FOODS_DATA.products
    )
  ) {
    state.catalog =
      window.PET_FOODS_DATA.products;
  }

  return state.catalog.length > 0;
}


/* =========================
   검색
========================= */

function searchableText(product) {

  return [
    ...(product.search_aliases || []),

    product.brand_ko,
    product.brand,

    product.product_name_ko,
    product.product_name,

    `${product.brand_ko || ""}${product.product_name_ko || ""}`,

    `${product.brand || ""}${product.product_name || ""}`

  ]
    .map(normalize)
    .join("|");
}


function searchProducts(query) {

  ensureCatalog();

  const q =
    normalize(query);

  const prefix =
    currentSpecies() === "dog"
      ? "D"
      : "C";

  /*
   한 글자부터 검색
  */
  if (!q) {
    return [];
  }

  return state.catalog
    .filter(product => {

      const correctSpecies =
        String(
          product.product_id || ""
        ).startsWith(prefix);

      const matches =
        searchableText(product)
          .includes(q);

      return (
        correctSpecies &&
        matches
      );
    })
    .slice(0, 10);
}


function categoryKo(product) {

  const categoryMap = {
    basic: "기본",
    senior: "시니어",
    weight_management: "체중관리"
  };

  return (
    categoryMap[
      product.category
    ] ||
    product.category ||
    ""
  );
}


/* =========================
   검색 자동완성
========================= */

function renderSuggestions(input) {

  const box =
    document.querySelector(
      `.suggestions[data-for="${input.id}"]`
    );

  if (!box) {
    return;
  }

  const value =
    input.value.trim();

  box.innerHTML = "";

  if (!value) {
    box.classList.remove("show");
    return;
  }

  const items =
    searchProducts(value);

  if (!items.length) {

    box.innerHTML = `
      <div class="suggestion-item">
        <div class="suggestion-title">
          검색 결과 없음
        </div>

        <div class="suggestion-meta">
          ‘제품 직접 추가하기’를 이용하세요.
        </div>
      </div>
    `;

    box.classList.add("show");

    return;
  }


  items.forEach(product => {

    const node =
      document.createElement("div");

    node.className =
      "suggestion-item";

    node.innerHTML = `
      <div class="suggestion-title">
        ${escapeHtml(
          product.display_brand ||
          product.brand_ko ||
          product.brand ||
          ""
        )}
      </div>

      <div class="suggestion-product">
        ${escapeHtml(
          product.display_name ||
          product.product_name_ko ||
          product.product_name ||
          ""
        )}
      </div>

      <div class="suggestion-meta">
        ${speciesLabel[currentSpecies()]}
        ·
        ${categoryKo(product)}
        ·
        ${escapeHtml(
          product.target_age ||
          product.life_stage ||
          ""
        )}
      </div>
    `;


    node.addEventListener(
      "click",
      () => {

        state.selected[
          input.id
        ] = product;

        input.value =
          `${product.brand_ko || product.brand} / ` +
          `${product.brand || product.brand_ko} · ` +
          `${product.product_name_ko || product.product_name} / ` +
          `${product.product_name || product.product_name_ko}`;

        box.classList.remove(
          "show"
        );
      }
    );


    box.appendChild(node);
  });


  box.classList.add("show");
}


/* =========================
   선택 초기화
========================= */

function clearSelections() {

  state.selected = {
    foodA: null,
    foodB: null,
    foodC: null
  };

  document
    .querySelectorAll(
      ".food-search"
    )
    .forEach(input => {
      input.value = "";
    });

  document
    .querySelectorAll(
      ".suggestions"
    )
    .forEach(box => {
      box.classList.remove(
        "show"
      );
    });
}


/* =========================
   직접 입력 제품
========================= */

function makeCustomProduct() {

  const brand =
    document
      .getElementById(
        "customBrand"
      )
      .value
      .trim();

  const name =
    document
      .getElementById(
        "customName"
      )
      .value
      .trim();

  const life =
    document
      .getElementById(
        "customLifeStage"
      )
      .value;


  if (
    !brand ||
    !name ||
    !life
  ) {
    return null;
  }


  const numberValue = id => {

    const value =
      document
        .getElementById(id)
        .value;

    return value === ""
      ? null
      : Number(value);
  };


  return {

    product_id:
      "USER_CUSTOM",

    brand_ko:
      brand,

    brand,

    product_name_ko:
      name,

    product_name:
      name,

    display_brand:
      `${brand} / 사용자 입력`,

    display_name:
      `${name} / User Provided`,

    category:
      "user_provided",

    life_stage:
      life,

    target_age:
      "사용자 입력",

    nutrition_basis:
      "registered_analysis",

    nutrients: {

      protein_pct: {
        value:
          numberValue(
            "customProtein"
          ),
        qualifier:
          "min"
      },

      fat_pct: {
        value:
          numberValue(
            "customFat"
          ),
        qualifier:
          "min"
      },

      fiber_pct: {
        value:
          numberValue(
            "customFiber"
          ),
        qualifier:
          "max"
      },

      moisture_pct: {
        value:
          numberValue(
            "customMoisture"
          ),
        qualifier:
          "max"
      }
    },

    energy: {

      kcal_kg:
        numberValue(
          "customKcal"
        ),

      source_status:
        "user_provided"
    },

    manufacturer_evidence: {
      keywords_ko: []
    },

    review_evidence: {
      positive_keywords: [],
      mixed_keywords: [],
      neutral_keywords: [],
      confidence: "none"
    }
  };
}


/* =========================
   API 전송용 데이터
========================= */

function toApiProduct(product) {

  return {

    product_id:
      product.product_id,

    brand_ko:
      product.brand_ko ||
      product.brand ||
      "",

    brand:
      product.brand ||
      product.brand_ko ||
      "",

    product_name_ko:
      product.product_name_ko ||
      product.product_name ||
      "",

    product_name:
      product.product_name ||
      product.product_name_ko ||
      "",

    display_brand:
      product.display_brand,

    display_name:
      product.display_name,

    category:
      product.category,

    life_stage:
      product.life_stage,

    target_age:
      product.target_age,

    nutrition_basis:
      product.nutrition_basis,

    nutrients:
      product.nutrients,

    energy:
      product.energy,

    manufacturer_evidence: {

      keywords_ko:
        product
          .manufacturer_evidence
          ?.keywords_ko || []
    },

    review_evidence: {

      positive_keywords:
        product
          .review_evidence
          ?.positive_keywords || [],

      mixed_keywords:
        product
          .review_evidence
          ?.mixed_keywords || [],

      confidence:
        product
          .review_evidence
          ?.confidence ||
        "none"
    }
  };
}


/* =========================
   HTML 안전 처리
========================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}


/* =========================
   제품명 한글 / 영어 분리
========================= */

function productNameParts(product) {

  return {

    ko:
      product.product_name_ko ||
      product.product_name ||
      product.display_name ||
      "",

    en:
      (
        product.product_name &&
        product.product_name !==
          product.product_name_ko
      )
        ? product.product_name
        : ""
  };
}


function productNameHtml(
  product,
  compact = false
) {

  const name =
    productNameParts(product);

  return `
    <span class="product-name-ko${compact ? " compact" : ""}">
      ${escapeHtml(name.ko)}
    </span>

    ${
      name.en
        ? `
          <span class="product-name-en">
            ${escapeHtml(name.en)}
          </span>
        `
        : ""
    }
  `;
}


/* =========================
   AI 화면
========================= */

function setAiMessage(
  message,
  className = ""
) {

  const box =
    document.getElementById(
      "aiExplanation"
    );

  box.className =
    `ai-content ${className}`
      .trim();

  box.replaceChildren();

  const paragraph =
    document.createElement("p");

  paragraph.textContent =
    message;

  box.appendChild(
    paragraph
  );
}


function appendAiInsight(
  parent,
  title,
  text,
  className
) {

  if (!text) {
    return;
  }

  const section =
    document.createElement(
      "section"
    );

  section.className =
    `ai-insight ${className}`;


  const heading =
    document.createElement("h4");

  heading.textContent =
    title;


  const paragraph =
    document.createElement("p");

  paragraph.textContent =
    text;


  section.appendChild(
    heading
  );

  section.appendChild(
    paragraph
  );

  parent.appendChild(
    section
  );
}


/* =========================
   AI 결과 출력
========================= */

function renderAiResult(result) {

  const box =
    document.getElementById(
      "aiExplanation"
    );

  box.className =
    "ai-content ai-success";

  box.replaceChildren();


  /*
   최종 결론
  */

  const verdict =
    document.createElement(
      "section"
    );

  verdict.className =
    "ai-verdict";


  const label =
    document.createElement(
      "span"
    );

  label.className =
    "ai-verdict-label";

  label.textContent =
    "현재 조건에서 1순위";

  verdict.appendChild(label);


  const title =
    document.createElement(
      "h4"
    );

  title.className =
    "ai-verdict-title";

  title.textContent =
    result.verdict_title ||
    "먼저 비교해볼 후보";

  verdict.appendChild(title);


  const product =
    document.createElement(
      "div"
    );

  product.className =
    "ai-product-name";


  const productKo =
    document.createElement(
      "strong"
    );

  productKo.textContent =
    result
      .recommended_product_name ||
    "";

  product.appendChild(
    productKo
  );


  if (
    result
      .recommended_product_name_en &&
    result
      .recommended_product_name_en !==
      result
        .recommended_product_name
  ) {

    const productEn =
      document.createElement(
        "span"
      );

    productEn.textContent =
      result
        .recommended_product_name_en;

    product.appendChild(
      productEn
    );
  }


  verdict.appendChild(
    product
  );


  const summary =
    document.createElement(
      "p"
    );

  summary.className =
    "ai-verdict-copy";

  summary.textContent =
    result.verdict || "";

  verdict.appendChild(
    summary
  );


  box.appendChild(
    verdict
  );


  /*
   세부 근거
  */

  const grid =
    document.createElement(
      "div"
    );

  grid.className =
    "ai-insight-grid";


  appendAiInsight(
    grid,
    "영양성분으로 보면",
    result.nutrition_analysis,
    "nutrition"
  );


  appendAiInsight(
    grid,
    "제조사가 강조하는 점",
    result.manufacturer_analysis,
    "manufacturer"
  );


  appendAiInsight(
    grid,
    "구매후기에서 보인 반응",
    result.review_analysis,
    "reviews"
  );


  box.appendChild(
    grid
  );


  /*
   다른 후보
  */

  if (
    result
      .alternative_product_name &&
    result
      .alternative_tradeoff
  ) {

    const alternative =
      document.createElement(
        "section"
      );

    alternative.className =
      "ai-alternative-card";


    const alternativeHead =
      document.createElement(
        "div"
      );

    alternativeHead.className =
      "ai-alternative-head";

    alternativeHead.textContent =
      "이럴 땐 다른 후보";


    alternative.appendChild(
      alternativeHead
    );


    const alternativeName =
      document.createElement(
        "strong"
      );

    alternativeName.textContent =
      result
        .alternative_product_name;

    alternative.appendChild(
      alternativeName
    );


    if (
      result
        .alternative_product_name_en &&
      result
        .alternative_product_name_en !==
        result
          .alternative_product_name
    ) {

      const alternativeEn =
        document.createElement(
          "span"
        );

      alternativeEn.className =
        "ai-alternative-en";

      alternativeEn.textContent =
        result
          .alternative_product_name_en;

      alternative.appendChild(
        alternativeEn
      );
    }


    const alternativeText =
      document.createElement(
        "p"
      );

    alternativeText.textContent =
      result
        .alternative_tradeoff;

    alternative.appendChild(
      alternativeText
    );


    box.appendChild(
      alternative
    );
  }


  /*
   선택 전 체크
  */

  if (result.check_point) {

    const check =
      document.createElement(
        "section"
      );

    check.className =
      "ai-check-card";


    const checkTitle =
      document.createElement(
        "strong"
      );

    checkTitle.textContent =
      "선택 전 한 가지 체크";


    const checkText =
      document.createElement(
        "p"
      );

    checkText.textContent =
      result.check_point;


    check.appendChild(
      checkTitle
    );

    check.appendChild(
      checkText
    );


    box.appendChild(
      check
    );
  }


  /*
   안내문
  */

  const disclaimer =
    document.createElement(
      "small"
    );

  disclaimer.className =
    "ai-disclaimer";

  disclaimer.textContent =
    result.disclaimer || "";

  box.appendChild(
    disclaimer
  );
}


/* =========================
   Gemini 요청
========================= */

async function requestAiComparison(
  products,
  age,
  concern
) {

  setAiMessage(
    "AI가 등록된 제품정보를 비교하고 있습니다…",
    "ai-loading"
  );


  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () =>
        controller.abort(),
      AI_TIMEOUT_MS
    );


  try {

    const response =
      await fetch(
        "/api/compare",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              species:
                currentSpecies(),

              age:
                Number(age),

              concern,

              products:
                products.map(
                  toApiProduct
                )
            }),

          signal:
            controller.signal
        }
      );


    let payload = {};

    try {
      payload =
        await response.json();
    }
    catch {
      payload = {};
    }


    if (!response.ok) {

      throw new Error(
        payload.error ||
        "AI 설명을 불러오지 못했습니다."
      );
    }


    if (!payload.result) {

      throw new Error(
        "AI 응답 형식을 확인하지 못했습니다."
      );
    }


    renderAiResult(
      payload.result
    );
  }

  catch (error) {

    const message =
      error.name ===
      "AbortError"

        ? "AI 응답이 늦어지고 있습니다. 잠시 후 다시 시도해주세요."

        : (
          error.message ||
          "AI 설명을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
        );


    setAiMessage(
      message,
      "ai-error"
    );
  }

  finally {

    clearTimeout(timer);
  }
}


/* =========================
   비교 결과 출력
========================= */

function renderResult(
  products,
  age,
  concern
) {

  document
    .getElementById(
      "resultContext"
    )
    .textContent =
      `${speciesLabel[currentSpecies()]} · ` +
      `${age}살 · ` +
      `${concernLabel[concern]}`;


  /*
   제품 카드
  */

  document
    .getElementById(
      "selectedCards"
    )
    .innerHTML =
      products
        .map(
          product => `
            <article class="selected-card">

              <span class="badge">
                ${
                  product.product_id ===
                  "USER_CUSTOM"
                    ? "사용자 입력 제품"
                    : "Seed Catalog"
                }
              </span>

              <div class="selected-brand">
                ${escapeHtml(
                  product.display_brand ||
                  product.brand_ko ||
                  product.brand ||
                  ""
                )}
              </div>

              <div class="selected-product-name">
                ${productNameHtml(product)}
              </div>

              <p>
                ${escapeHtml(
                  product.target_age ||
                  product.life_stage ||
                  "-"
                )}
              </p>

            </article>
          `
        )
        .join("");


  /*
   비교표
  */

  const headers = [
    "항목",
    ...products.map(
      product =>
        productNameHtml(
          product,
          true
        )
    )
  ];


  const rows = [

    [
      "Life Stage",
      ...products.map(
        product =>
          product.life_stage ||
          "미공시"
      )
    ],

    [
      "대상 연령",
      ...products.map(
        product =>
          product.target_age ||
          "미공시"
      )
    ],

    [
      "열량 (kcal/kg)",
      ...products.map(
        product =>
          product.energy
            ?.kcal_kg ??
          "공식 미공시"
      )
    ],

    [
      "단백질",
      ...products.map(
        product =>
          qValue(
            product.nutrients
              ?.protein_pct
          )
      )
    ],

    [
      "지방",
      ...products.map(
        product =>
          qValue(
            product.nutrients
              ?.fat_pct
          )
      )
    ],

    [
      "섬유",
      ...products.map(
        product =>
          qValue(
            product.nutrients
              ?.fiber_pct
          )
      )
    ],

    [
      "수분",
      ...products.map(
        product =>
          qValue(
            product.nutrients
              ?.moisture_pct
          )
      )
    ],

    [
      "영양표 기준",
      ...products.map(
        product =>
          basisLabel[
            product
              .nutrition_basis
          ] ||
          product
            .nutrition_basis ||
          "미공시"
      )
    ]
  ];


  document
    .querySelector(
      "#compareTable thead"
    )
    .innerHTML =
      `
        <tr>
          ${
            headers
              .map(
                (value, index) =>
                  `
                    <th
                      ${
                        index
                          ? 'class="product-table-head"'
                          : ""
                      }
                    >
                      ${value}
                    </th>
                  `
              )
              .join("")
          }
        </tr>
      `;


  document
    .querySelector(
      "#compareTable tbody"
    )
    .innerHTML =
      rows
        .map(
          row => `
            <tr>

              ${
                row
                  .map(
                    (value, index) =>

                      index

                        ? `
                          <td>
                            ${escapeHtml(value)}
                          </td>
                        `

                        : `
                          <th>
                            ${escapeHtml(value)}
                          </th>
                        `
                  )
                  .join("")
              }

            </tr>
          `
        )
        .join("");


  /*
   영양표 기준 안내
  */

  const bases =
    [
      ...new Set(
        products.map(
          product =>
            product
              .nutrition_basis
        )
      )
    ];


  document
    .getElementById(
      "basisNotice"
    )
    .textContent =

      bases.length > 1

        ? "※ 제품별 영양성분 표시 기준이 달라 단백질·지방·섬유 수치를 단순 우열로 비교하지 않습니다."

        : "※ 선택한 제품은 같은 영양표 기준입니다. min/max/평균값 표시 방식도 함께 확인하세요.";


  /*
   제조사 / 후기 근거
  */

  document
    .getElementById(
      "evidencePanels"
    )
    .innerHTML =
      products
        .map(product => {

          const manufacturer =
            product
              .manufacturer_evidence
              ?.keywords_ko ||
            [];

          const positive =
            product
              .review_evidence
              ?.positive_keywords ||
            [];

          const mixed =
            product
              .review_evidence
              ?.mixed_keywords ||
            [];


          const chips =
            (items, type) => {

              if (!items.length) {

                return `
                  <span class="keyword keyword-empty">
                    정보 없음
                  </span>
                `;
              }


              return items
                .map(
                  item => `
                    <span class="keyword keyword-${type}">
                      ${escapeHtml(item)}
                    </span>
                  `
                )
                .join("");
            };


          return `
            <article class="evidence-card">

              <div class="evidence-product-name">
                ${productNameHtml(
                  product,
                  true
                )}
              </div>


              <div class="evidence-group evidence-manufacturer">

                <strong>
                  제조사가 강조하는 특징
                </strong>

                <div class="keyword-list">

                  ${chips(
                    manufacturer,
                    "manufacturer"
                  )}

                </div>

              </div>


              <div class="evidence-group evidence-positive">

                <strong>
                  구매후기 긍정 경험
                </strong>

                <div class="keyword-list">

                  ${chips(
                    positive,
                    "positive"
                  )}

                </div>

              </div>


              <div class="evidence-group evidence-mixed">

                <strong>
                  호불호·주의 경험
                </strong>

                <div class="keyword-list">

                  ${chips(
                    mixed,
                    "mixed"
                  )}

                </div>

              </div>

            </article>
          `;
        })
        .join("");


  setAiMessage(
    "AI가 영양정보·제조사 강조점·구매후기를 함께 비교하고 있습니다…",
    "ai-loading"
  );


  document
    .getElementById(
      "result"
    )
    .classList.remove(
      "hidden"
    );


  document
    .getElementById(
      "result"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


/* =========================
   검색창 이벤트
   한 글자 입력 즉시 검색
========================= */

function bindSearchFallback() {

  function handle(input) {

    if (
      !input ||
      !input.classList ||
      !input.classList.contains(
        "food-search"
      )
    ) {
      return;
    }


    /*
     입력을 다시 시작하면
     기존 선택값 해제
    */

    state.selected[
      input.id
    ] = null;


    renderSuggestions(
      input
    );
  }


  /*
   한 글자 입력부터 반응
  */

  document.addEventListener(
    "input",
    event => {

      handle(
        event.target
      );
    }
  );


  /*
   일부 브라우저 입력 보강
  */

  document.addEventListener(
    "keyup",
    event => {

      handle(
        event.target
      );
    }
  );


  /*
   기존 입력값이 있는 상태에서
   다시 검색창을 누른 경우
  */

  document.addEventListener(
    "focusin",
    event => {

      handle(
        event.target
      );
    }
  );
}


bindSearchFallback();


/* =========================
   초기화
========================= */

function setup() {

  const message =
    document.getElementById(
      "formMessage"
    );


  message.classList.remove(
    "error"
  );


  message.textContent =
    `제품 데이터 ${state.catalog.length}종을 불러왔습니다.`;


  /*
   검색창 준비
  */

  document
    .querySelectorAll(
      ".food-search"
    )
    .forEach(input => {

      input.setAttribute(
        "autocomplete",
        "off"
      );

      input.setAttribute(
        "data-search-ready",
        "true"
      );
    });


  /*
   강아지 / 고양이 변경
  */

  document
    .querySelectorAll(
      'input[name="species"]'
    )
    .forEach(radio => {

      radio.addEventListener(
        "change",
        () => {

          clearSelections();

          message.textContent =
            `${speciesLabel[currentSpecies()]} 사료를 검색할 수 있습니다.`;
        }
      );
    });


  /*
   직접 추가
  */

  const showCustom =
    document.getElementById(
      "showCustom"
    );


  if (showCustom) {

    showCustom.onclick =
      () => {

        document
          .getElementById(
            "customProduct"
          )
          .classList.toggle(
            "hidden"
          );
      };
  }


  /*
   비교하기
  */

  document
    .getElementById(
      "compareForm"
    )
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        message.classList.remove(
          "error"
        );


        const age =
          document
            .getElementById(
              "age"
            )
            .value;


        const concern =
          document
            .getElementById(
              "concern"
            )
            .value;


        let products = [

          state.selected.foodA,
          state.selected.foodB,
          state.selected.foodC

        ].filter(Boolean);


        const custom =
          !document
            .getElementById(
              "customProduct"
            )
            .classList.contains(
              "hidden"
            )

            ? makeCustomProduct()

            : null;


        if (custom) {

          products.push(
            custom
          );
        }


        /*
         중복 제거
        */

        products =
          [
            ...new Map(
              products.map(
                product => [

                  (
                    product.product_id ||
                    ""
                  ) +
                  (
                    product.display_name ||
                    ""
                  ),

                  product
                ]
              )
            ).values()
          ];


        if (!age) {

          message.textContent =
            "나이를 입력해주세요.";

          message.classList.add(
            "error"
          );

          return;
        }


        if (
          products.length < 2
        ) {

          message.textContent =
            "검색 결과에서 비교할 사료를 2개 이상 선택해주세요.";

          message.classList.add(
            "error"
          );

          return;
        }


        if (
          products.length > 3
        ) {

          message.textContent =
            "사료는 최대 3개까지 비교할 수 있습니다.";

          message.classList.add(
            "error"
          );

          return;
        }


        message.textContent =
          "";


        renderResult(
          products,
          age,
          concern
        );


        const button =
          event.currentTarget
            .querySelector(
              ".compare-btn"
            );


        const originalText =
          button.textContent;


        button.disabled =
          true;

        button.textContent =
          "AI 비교 중…";


        await requestAiComparison(
          products,
          age,
          concern
        );


        button.disabled =
          false;

        button.textContent =
          originalText;
      }
    );


  /*
   검색창 외 영역 클릭 시
   검색결과 닫기
  */

  document.addEventListener(
    "click",
    event => {

      if (
        !event.target.closest(
          ".picker"
        )
      ) {

        document
          .querySelectorAll(
            ".suggestions"
          )
          .forEach(
            box => {

              box.classList.remove(
                "show"
              );
            }
          );
      }
    }
  );
}


/* =========================
   시작
========================= */

loadCatalog()

  .then(() => {

    ensureCatalog();

    setup();
  })

  .catch(error => {

    console.error(error);


    /*
     JSON fetch가 실패해도
     JS 데이터가 있으면 사용
    */

    if (ensureCatalog()) {

      setup();

      return;
    }


    const message =
      document.getElementById(
        "formMessage"
      );


    message.textContent =
      "제품 데이터를 불러오지 못했습니다.";


    message.classList.add(
      "error"
    );
  });
