// Find current official URLs for stale/wrong links in the ScholarGlobe DB.
// Usage: z-ai function via script — node scripts/find-urls.mjs
import ZAI from "z-ai-web-dev-sdk";

const TARGETS = [
  { slug: "ampere-ens-lyon", q: "ENS Lyon Ampere scholarships of excellence official application site ens-lyon.fr" },
  { slug: "berea-college", q: "Berea College international admissions apply official site berea.edu" },
  { slug: "bowdoin-college", q: "Bowdoin College admission apply first-year international official" },
  { slug: "camerino-university", q: "University of Camerino unicam international admission apply" },
  { slug: "deutschlandstipendium", q: "Deutschlandstipendium official English information federal ministry education" },
  { slug: "ghent-bof", q: "Ghent University BOF doctoral researcher scholarship funding official" },
  { slug: "gks", q: "Global Korea Scholarship GKS 2027 graduate official studyinkorea apply" },
  { slug: "goi-ies", q: "Government of Ireland International Education Scholarships 2027 official HEA apply" },
  { slug: "grenoble-alpes", q: "Universite Grenoble Alpes official English international admissions site" },
  { slug: "helsinki-scholarship", q: "University of Helsinki scholarship international master official" },
  { slug: "khalifa-university", q: "Khalifa University graduate admissions apply scholarship official" },
  { slug: "ntnu", q: "NTNU Norwegian University Science Technology international admissions apply free tuition official" },
  { slug: "saarland-university", q: "Saarland University international students application official uni-saarland.de" },
  { slug: "sapienza-rome", q: "Sapienza University Rome international admission apply English official" },
  { slug: "uct-cape-town", q: "University of Cape Town how to apply international official uct.ac.za" },
  { slug: "universiti-malaya", q: "Universiti Malaya international admissions how to apply official" },
  { slug: "university-iceland", q: "University of Iceland international students admission application English" },
  { slug: "wits-university", q: "University of the Witwatersrand Wits apply admission official undergraduate" },
  { slug: "vanier", q: "Vanier Canada Graduate Scholarships official vanier.gc.ca nominate" },
  { slug: "aims-masters", q: "AIMS African Institute for Mathematical Sciences masters structured graduate program apply" },
  { slug: "csc", q: "Chinese Government Scholarship CSC campuschina official application 2027" },
  { slug: "daad-epos", q: "DAAD EPOS development-related postgraduate courses scholarship official list" },
  { slug: "elithp", q: "Eiffel Excellence scholarship official Campus France application" },
  { slug: "vlir-uos", q: "VLIR-UOS scholarships official application icp connect" },
  { slug: "ku-leuven", q: "KU Leuven admissions international students application official wms kuleuven" },
  { slug: "elte-budapest", q: "ELTE Eotvos Lorand University Budapest international admission official" },
  { slug: "invest-your-talent", q: "Invest Your Talent in Italy official application investyourtalent" },
  { slug: "madinah-university", q: "Islamic University of Madinah admission international apply official" },
  { slug: "mis-malaysia", q: "Malaysia International Scholarship MIS official MOHE apply" },
  { slug: "mtcp", q: "Malaysian Technical Cooperation Programme MTCP scholarship official apply" },
  { slug: "open-doors", q: "Open Doors Russian Scholarship Project official olympiad global education" },
  { slug: "pan-african-university", q: "Pan African University PAU scholarship application official apply" },
  { slug: "reed-college", q: "Reed College admission international financial aid official" },
  { slug: "uba-argentina", q: "Universidad de Buenos Aires UBA international students admission official" },
  { slug: "rotary-peace", q: "Rotary Peace Fellowship official application rotary.org" },
];

const zai = await ZAI.create();

for (const t of TARGETS) {
  try {
    const res = await zai.functions.invoke("web_search", { query: t.q, num: 5 });
    const top = (res || []).slice(0, 5).map((r) => `${r.url}  ||  ${r.name?.slice(0, 60)}`);
    console.log(`\n### ${t.slug}\n${top.join("\n")}`);
  } catch (e) {
    console.log(`\n### ${t.slug}\nERROR ${String(e).slice(0, 80)}`);
  }
  await new Promise((r) => setTimeout(r, 400));
}
