// Round 2 — remaining stale URL lookups (slower to dodge rate limits)
import ZAI from "z-ai-web-dev-sdk";

const TARGETS = [
  { slug: "deutschlandstipendium", q: "Deutschlandstipendium official English page BMBF scholarship" },
  { slug: "wits-university", q: "Wits University apply admission official site wits.ac.za" },
  { slug: "universiti-malaya", q: "Universiti Malaya international student admission apply official um.edu.my" },
  { slug: "csc", q: "Chinese Government Scholarship campuschina.org official apply 2027" },
  { slug: "daad-epos", q: "DAAD EPOS scholarship official daad.de English development postgraduate" },
  { slug: "vlir-uos", q: "VLIR-UOS scholarships official vliruos.be apply ICP" },
  { slug: "ku-leuven", q: "KU Leuven admissions international degree students official kuleuven.be" },
  { slug: "elte-budapest", q: "ELTE Eötvös Loránd University official English international admission elte.hu" },
  { slug: "invest-your-talent", q: "Invest Your Talent in Italy official application site" },
  { slug: "madinah-university", q: "Islamic University Madinah admission official iu.edu.sa apply international" },
  { slug: "mis-malaysia", q: "Malaysia International Scholarship MIS official Ministry Higher Education apply" },
  { slug: "mtcp", q: "MTCP Malaysia Technical Cooperation scholarship official kln.gov.my apply 2027" },
  { slug: "open-doors", q: "Open Doors Russian scholarship olympiad official global-edu.ru" },
  { slug: "pan-african-university", q: "Pan African University official apply scholarship pau.au.int OR pau-au.com" },
  { slug: "reed-college", q: "Reed College admission apply official reed.edu" },
  { slug: "uba-argentina", q: "UBA Universidad Buenos Aires international admission officialuba" },
  { slug: "rotary-peace", q: "Rotary Peace Fellowship application official rotary.org" },
  { slug: "sapienza-rome", q: "Sapienza University Rome international admissions apply English uniroma1.it" },
  { slug: "saarland-university", q: "Saarland University international applicants apply official uni-saarland.de English" },
  { slug: "ntnu", q: "NTNU international master programmes admission apply ntnu.edu official" },
  { slug: "vanier", q: "Vanier Canada Graduate scholarship official site vanier.gc.ca" },
  { slug: "aims-masters", q: "AIMS master mathematical sciences Africa official apply aims.ac.rw OR aims.ac.org" },
  { slug: "grenoble-alpes", q: "Grenoble Alpes university English site international admission official" },
  { slug: "helsinki-scholarship", q: "University of Helsinki scholarship for international master students site:helsinki.fi" },
  { slug: "gks", q: "Global Korea Scholarship official website studyinkorea.go.kr apply 2027 graduate" },
  { slug: "goi-ies", q: "Government of Ireland International Education Scholarship official hea.ie call 2027" },
  { slug: "khalifa-university", q: "Khalifa University graduate admission official ku.ac.ae apply" },
  { slug: "ghent-bof", q: "Ghent University Special Research Fund BOF PhD scholarship official ugent.be" },
  { slug: "ampere-ens-lyon", q: "ENS Lyon Ampere excellence scholarship international apply official ens-lyon.fr" },
  { slug: "camerino-university", q: "University of Camerino international admission official unicam.it" },
  { slug: "berea-college", q: "Berea College admissions international students official apply" },
  { slug: "bowdoin-college", q: "Bowdoin College admissions official apply bowdoin.edu" },
];

const zai = await ZAI.create();

for (const t of TARGETS) {
  try {
    const res = await zai.functions.invoke("web_search", { query: t.q, num: 4 });
    const top = (res || []).slice(0, 4).map((r) => `${r.url}  ||  ${r.name?.slice(0, 55)}`);
    console.log(`\n### ${t.slug}\n${top.join("\n")}`);
  } catch {
    console.log(`\n### ${t.slug}\nRATE-LIMITED`);
    await new Promise((r) => setTimeout(r, 6000));
  }
  await new Promise((r) => setTimeout(r, 2500));
}
