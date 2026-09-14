import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for 20 teams with custom Malayali clues & routes...");

  // Ensure public/images directory exists
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Create SVG placeholders if needed
  const morseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#0B0F17" rx="16"/>
  <rect x="20" y="20" width="760" height="360" fill="none" stroke="#D97706" stroke-width="2" stroke-dasharray="6,6" rx="12"/>
  <text x="400" y="70" fill="#F59E0B" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="4">TOP SECRET // LOCATION CIPHER</text>
  <text x="400" y="105" fill="#64748B" font-family="sans-serif" font-size="14" text-anchor="middle">DECODE THE MORSE SEQUENCE TO DISCOVER YOUR PHYSICAL DESTINATION</text>
  <rect x="50" y="140" width="700" height="180" fill="#151D2A" rx="8" stroke="#334155" stroke-width="1"/>
  <text x="400" y="220" fill="#FBBF24" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle" letter-spacing="6">-.-.   .-   --   .--.   ..-   ...</text>
</svg>`;

  fs.writeFileSync(path.join(imagesDir, "morse_r3.svg"), morseSvg);

  // 1. Create or Update Master Event Status
  await prisma.event.upsert({
    where: { id: "master_event" },
    create: {
      id: "master_event",
      name: "Anveshipin Kandethum 2026",
      status: "ACTIVE",
      isLocked: false,
    },
    update: {
      status: "ACTIVE",
      isLocked: false,
    },
  });

  // 2. Create Default Admin Credentials (admin / admin123) if not present
  const defaultAdminHash = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { username: "admin" },
    create: {
      username: "admin",
      passwordHash: defaultAdminHash,
      role: "admin",
    },
    update: {},
  });

  // 3. Clear existing TeamProgress, SubmissionAttempts, and RoundConfigs for clean seed
  console.log("🧹 Cleaning old progress & round configs...");
  await prisma.submissionAttempt.deleteMany();
  await prisma.teamProgress.deleteMany();
  await prisma.finalist.deleteMany();
  await prisma.winner.deleteMany();
  await prisma.roundConfig.deleteMany();
  await prisma.team.deleteMany();

  // 4. Detailed 20 Teams Configuration based on Handwritten Route Sheet & Malayalam Clues
  const teamsData = [
    // TEAM 1: MB -> GDN -> Tank -> PRP
    {
      teamId: "TEAM001",
      teamName: "Alpha Vanguard",
      r1: { loc: "Main Gate", ans: ["main gate", "mb", "gate"], clue: "Raavile varunnavar enne kaanum, Vaikunneram pokunnavar enne veendum kaanum. Njan vazhiyalla, paksha ella vazhiyudeyum thudakkam. Njan aaranu?" },
      r2: { loc: "GD Naidu Block", ans: ["gdn", "gd naidu"], clue: "Oru vashath chalanam, mattoru vashath pakarpp, naduvil oru cheriya idavela. Onninu enna venam, onninu mashi, matt onninu choodu vellam." },
      r3: { loc: "Library Tank", ans: ["tank", "libra tank", "library tank"], clue: "Oru kaalath enne kandhaal aalukal vazhi maattiyirunnirikkam. Innu enne kandhaal aalukal vazhi nirttivekkum. Orikkal ente munnil bhoomi thurannirunnu..." },
      r4: { loc: "PRP Block", ans: ["prp", "prp block"], clue: "Njaan nishchalanayi nilkkum, paksha enne nokkunnaavan orikkalum nishchalanalla. Njaan samsaarikkaarilla, ennittum ellaavarodum ore kaaryam parayum." },
    },
    // TEAM 2: Samsung -> ALM -> Balaji -> Darling
    {
      teamId: "TEAM002",
      teamName: "Shadow Strikers",
      r1: { loc: "Samsung Hub", ans: ["samsung", "samsung lab"], clue: "Kayyil pidichaal lokam cheruthaakum, paksha njaan pusthakamalla. Kann thurakkaathe thanne enne nokkaam, shabdhamillaathe njaan marupadi parayum." },
      r2: { loc: "ALM Basic Sciences", ans: ["alm", "dr alm"], clue: "Jeevan nilanirthaan raktham ozhukunnidath, rogam maaraan ariv valarunnidath. Vaidyathinte vazhiyiloode nadannupoya oraalude peru innum ivide nilanilkkunnu." },
      r3: { loc: "Balaji Store", ans: ["balaji", "balaji store"], clue: "Oru vashath circuitukalum, maruvashath vishramathinte lokavum; randinumaidayil marannupoya cheriya kaaryangalude avasana pratheeksha." },
      r4: { loc: "Darling Canteen", ans: ["darling", "darling canteen"], clue: "Enne kandethaan vishappu venam ennilla, paksha vishappullavarkku njan marakkan pattilla. Ente per oru bandham pole thonnikkum..." },
    },
    // TEAM 3: SMV -> GDN -> Opticals -> Dominos
    {
      teamId: "TEAM003",
      teamName: "Phoenix Cyber",
      r1: { loc: "SMV Block", ans: ["smv", "smv block"], clue: "Theneechaykku veedorukkaan vaasthushaasthriyude kai aavashyamilla. ‘Kalarippayattinte’ chuvadukal pole oro valavum krithyamaayidath..." },
      r2: { loc: "GD Naidu Block", ans: ["gdn", "gd naidu"], clue: "Pusthakathil maathram arivilla, chila arivukal irumbilum vayarukalilum olikkum. Chinthakal yanthrangalayi maarunnidath, adutha rahasyam ninne kaathirikkunnu." },
      r3: { loc: "Opticals", ans: ["opticals", "optical"], clue: "Ivide thirayendath oru vasthuvalla… oru kuravinte pariharam aanu. Kurav enthaanu ennu nee kandupidichaal, athinte veedu evide ennum nee kandupidikkum." },
      r4: { loc: "Dominos", ans: ["dominos", "dominos pizza"], clue: "Pal arum onnich ethum, paksha avasaanam ororutharum swantham bhaagam thedum. Choodum sugandhavum vazhikaattikalaakum..." },
    },
    // TEAM 4: Gandhi -> Dominos -> Lake -> Couples Corridor
    {
      teamId: "TEAM004",
      teamName: "Titan Force",
      r1: { loc: "Gandhi Block", ans: ["gandhi", "gandhi block"], clue: "Mathilukal enne adakkunnilla, avayude idayile shunyatha aanu enne azhakkunnath. Akathulla murikalekkal idayile idangal enne prathyekamakunnu." },
      r2: { loc: "Dominos", ans: ["dominos", "dominos pizza"], clue: "Ente peril veezhchakalude shabdamundu, ente meshayil pankidalinte shabdavum. Randu nirangalkkidayil thudangunnoru parichayam..." },
      r3: { loc: "VIT Lake", ans: ["lake", "vit lake"], clue: "Njan onnum sookshikkunnillennu thonnum, paksha aakaasham muthal marangal vare palathum ennil kaanam. Enikku swanthamaayi niramilla..." },
      r4: { loc: "Couples Corridor", ans: ["couples corridor", "couples"], clue: "Class kazhinju pokunna vazhiyalla njan. Pakshe ivide varunnavar samayam kurachu marakkunnu. Destination alla pradhanam, koode nadakkunna aal aanu." },
    },
    // TEAM 5: GDN -> Tank -> CBMR -> SJT petti kada
    {
      teamId: "TEAM005",
      teamName: "Valkyrie Recon",
      r1: { loc: "GD Naidu Block", ans: ["gdn", "gd naidu"], clue: "Yanthrangalkku jeevan nalkiya chinthakalude lokam, arivum kandupidithangalum koottukoodunnidam. ‘Oru perinte nizhal ivide vazhikaattiyaakum…’" },
      r2: { loc: "Library Tank", ans: ["tank", "libra tank"], clue: "Yudhathinte ormma njan perunnu, pakshe oru vedium ini pottilla. Chakrangal urulaathe nishchalam, thuppaakkiyude muna ippol shaantham." },
      r3: { loc: "CBMR Block", ans: ["cbmr", "cbmr block"], clue: "Shanthamaayi kidakkunna vellathinarikil puthuthaayi oru vazhi thurannu. Orikkal avide vazhiyillaayirunnu, inno munnottu maathram parayunnoru paatha." },
      r4: { loc: "SJT Petti Kada", ans: ["petti kada", "sjt petti kada"], clue: "Kaal noottaandinte ormmakal sookshikkunnidathinarikil, valiyathonnum thedenda… cheriyoru idath pala aavashyangalkkum pariharam kittum." },
    },
    // TEAM 6: CTS -> KC Lawn -> Basketball(tt) -> SJT
    {
      teamId: "TEAM006",
      teamName: "Nexus Rangers",
      r1: { loc: "CTS Lab", ans: ["cts", "cts lab"], clue: "Pusthakathil maathramalla, practical aayi padikkunna idam. Screeninte munnilum, machinesinte idayilum ideas jeevan nedunna sthalam." },
      r2: { loc: "KC Lawn", ans: ["kc lawn", "kc"], clue: "Pachappin puthappaninju njan nilkkum, chuttum kaattin thaalavum kaazhchayude melavum. Enne kaanaan palarum varum..." },
      r3: { loc: "TT Basketball Court", ans: ["basketball", "tt basketball"], clue: "Meenillatha vala, malsyathozhilaliyillatha kali, kaalukal odum, paksha lakshyam mukalilaanu." },
      r4: { loc: "SJT Block", ans: ["sjt", "sjt block"], clue: "Oru vashath hostel jeevitham, maruvashath kali; idayil ninnu lokathod samsaarikkunna oru shabdam. Puthiya ayalkkaaran varunnathin mumbe ivan ivide undayirunnu." },
    },
    // TEAM 7: CBMR(LH) -> CTS -> Foodys -> PRP Annex
    {
      teamId: "TEAM007",
      teamName: "Specter Unit",
      r1: { loc: "CBMR Block", ans: ["cbmr", "cbmr block"], clue: "Kaat vellathil cheriya varakal varaykkum, ivide cheriya chodyangal valiya utharangal aakum." },
      r2: { loc: "CTS Lab", ans: ["cts", "cts lab"], clue: "Classukal kadannu, oru different lokathekku vaa. Screensum machinesum, ideasum koode cherunna idam." },
      r3: { loc: "Foodys Canteen", ans: ["foodys", "foodys canteen"], clue: "Vediyalla, paksha kalaakaaranmar varum. Classsalla, paksha parisheelanam nadakkum." },
      r4: { loc: "PRP Annex", ans: ["prp annex", "prpa"], clue: "Randu lokangalkkidayil njaan oru cheriya paalam. Oru vashath padanathinte thirakku, maruvashath roopangalkk janmam." },
    },
    // TEAM 8: TT -> CS Hall -> KC Lawn -> Amazon
    {
      teamId: "TEAM008",
      teamName: "Vanguard Cyber",
      r1: { loc: "Technology Tower (TT)", ans: ["tt", "technology tower"], clue: "Oru vashath ezhuthinte ayudhangal kaathirikkunnu, mattoru vashath vishappinte marupadiyum. Ente munnilulla vazhi saadhaarana vazhiyalla..." },
      r2: { loc: "CS Hall", ans: ["cs hall", "chenna reddy hall"], clue: "Ayirangal irikkaan kazhiyunna oru sthalathinte aduthu, kurachu perude shabdam kaathirikkunna mattoru sthalam." },
      r3: { loc: "KC Lawn", ans: ["kc lawn", "kc"], clue: "Enikku naalu chuvarukalilla, enkilum athirukal ariyaam. Vediyilla, enkilum pala kathakalum ivide arangerum." },
      r4: { loc: "Amazon Counter", ans: ["amazon", "amazon locker"], clue: "Kaathirippu ente joli, kaimaattam ente avasaanam. Enikku labhikkunnath onnumentethaayi maarunnilla." },
    },
    // TEAM 9: DC -> Avins -> KC -> Opticals
    {
      teamId: "TEAM009",
      teamName: "Apex Strikers",
      r1: { loc: "DC Food Court", ans: ["dc", "dc food court"], clue: "Nagarathinte thirakkalla ivide, pachappinte nizhalaanu kaaval. Thalaykku mukalil aakaashamalla, pazhamayude melkkurayaanu." },
      r2: { loc: "Avins Juice Shop", ans: ["avins", "avin"], clue: "Oru blockinte aduthu oru cheriya choodulla rahasyam. Athine kudikkaam, pakse athu vellam alla." },
      r3: { loc: "KC Lawn", ans: ["kc lawn", "kc"], clue: "Swathanthryathinte arikil swapnangalkku chirakekiyum, arivinte munnil puthiya vazhikal thediyum…" },
      r4: { loc: "Opticals", ans: ["opticals", "optical"], clue: "Kaanaan vendi enne thedaruthu. Kaanaan pattathath enthukondaanennu chinthikku." },
    },
    // TEAM 10: KC Lawn -> TT -> Amazon -> Medical shop(LH)
    {
      teamId: "TEAM010",
      teamName: "Cipher Ops",
      r1: { loc: "KC Lawn", ans: ["kc lawn", "kc"], clue: "Kaalukalkku vazhi venda, pachappinidayiloode nadakkaam. Chuttum kettidangal undenkilum, thalaykku mukalil aakaasham maathram." },
      r2: { loc: "Technology Tower (TT)", ans: ["tt", "technology tower"], clue: "Irumbinte hridayamilla, ennaalum yanthrangalude kathakal ennil divasavum pirakkunnu." },
      r3: { loc: "Amazon Counter", ans: ["amazon", "amazon locker"], clue: "Oru vasthuvinu yaathrayundu, oru manushyanu kaathirippundu. Eva randum ore nimishathil kandumuttunnidath njan undaakum." },
      r4: { loc: "LH Medical Shop", ans: ["medical shop", "lh medical"], clue: "Hostel oru veedu aanenkil, njan athinte emergency shelf pole aanu. Ella divasavum enne aavashyamilla." },
    },
    // TEAM 11: SJT -> Basketball(tt) -> GDN -> Lassi Shop
    {
      teamId: "TEAM011",
      teamName: "Omega Force",
      r1: { loc: "SJT Block", ans: ["sjt", "sjt block"], clue: "Classinte vaathil adanjaal katha avide theerunnilla. Kurachu chuvadukalkkappuram chuvarukalillathoru vedi..." },
      r2: { loc: "TT Basketball Court", ans: ["basketball", "tt basketball"], clue: "Kaikalil ninnu parakkum, paksha pakshiyalla. Valayilekku pokum, paksha meenalla." },
      r3: { loc: "GD Naidu Block", ans: ["gdn", "gd naidu"], clue: "Ennangal aadyam varum, shabdangal pinne. Irumb idaykku swantham bhaasha samsaarikkum." },
      r4: { loc: "Lassi Shop", ans: ["lassi shop", "lassi"], clue: "Arivinte lokathinarikil choodil ninnu aashwasam nalkunna cheriya ruchi sthalam." },
    },
    // TEAM 12: PRP -> Lake -> Nescafe -> Foodys
    {
      teamId: "TEAM012",
      teamName: "Phantom Recon",
      r1: { loc: "PRP Block", ans: ["prp", "prp block"], clue: "Muthu thedunnavan kadalil pokenda… Vellathinu pakaram ivide arivinte thirakal aanu." },
      r2: { loc: "VIT Lake", ans: ["lake", "vit lake"], clue: "Aakaasham enne nokki nilkkunnilla, pakaram njan aakaashathe nokki nilkkunnu." },
      r3: { loc: "Nescafe Library", ans: ["nescafe", "nescafe library"], clue: "Ravile enne thedunnavar undu, raathriyil enne ozhivakkunnavarum undu. Enikku oru manam undu, oru chood undu..." },
      r4: { loc: "Foodys Canteen", ans: ["foodys", "foodys canteen"], clue: "Chila idangalkku vedhiyaakaan vedi venda, chila kathakalkku vaakkukalum venda." },
    },
    // TEAM 13: Balaji -> PRP Annex -> SJT Annex -> CBMR
    {
      teamId: "TEAM013",
      teamName: "Aero Strikers",
      r1: { loc: "Balaji Store", ans: ["balaji", "balaji store"], clue: "Arivu vaangaanaavilla, paksha athilekkulla pala vazhikalum ivide kittum." },
      r2: { loc: "PRP Annex", ans: ["prp annex", "prpa"], clue: "Pazhayoru nagarathinte ormmayum, pulariye unarthunna oru manavum." },
      r3: { loc: "SJT Annex", ans: ["sjt annex", "sjta"], clue: "Valiya kettidathinte nizhalil janichenkilum, athinte kathayil njaan veroru adhyayam." },
      r4: { loc: "CBMR Block", ans: ["cbmr", "cbmr block"], clue: "Shareerathinte rahasyangal charchayaakunnidam, gaveshanathinte paathakal thurakkunnidam." },
    },
    // TEAM 14: Parking -> Foodys -> Dominos -> Balaji
    {
      teamId: "TEAM014",
      teamName: "Storm Squad",
      r1: { loc: "Campus Parking", ans: ["parking", "car parking"], clue: "Ellavarum ivide varum, pakse aarum ivide nilkkaan varilla. Chilar enne vittittu nadakkum..." },
      r2: { loc: "Foodys Canteen", ans: ["foodys", "foodys canteen"], clue: "Oridam… Oraalkku parisheelanashaala, mattoraalkku vedi, mattoraalkku vishramasthalam..." },
      r3: { loc: "Dominos", ans: ["dominos", "dominos pizza"], clue: "Orikkal veezhchayude kali, mattorikkal vishappinte vazhi." },
      r4: { loc: "Balaji Store", ans: ["balaji", "balaji store"], clue: "Valiya kettidathinte nizhalil njan cheruthaanu. Pakshe valiya kaaryangal thudangaan venda pala cheriya kaaryangalum..." },
    },
    // TEAM 15: Couples corridor -> CBMR(LH) -> SJT -> TT
    {
      teamId: "TEAM015",
      teamName: "Hyperion Vanguard",
      r1: { loc: "Couples Corridor", ans: ["couples corridor", "couples"], clue: "Randu bindukkal undu. Ava thammilulla distance valare valuthalla. Pakshe ee randu bindukkal onnichal maathrame oru line poornamaakoo." },
      r2: { loc: "CBMR Block", ans: ["cbmr", "cbmr block"], clue: "Chodyangal ivide pusthakathil maathram nilkkilla. Kandum kettum pareekshichum padikkunnidam." },
      r3: { loc: "SJT Block", ans: ["sjt", "sjt block"], clue: "Thilangunna onnalla njan, ennaalum thilakkamulla oru peru enikkundu." },
      r4: { loc: "Technology Tower (TT)", ans: ["tt", "technology tower"], clue: "Oru aksharam enne ormmippikkunnath vivarangalude lokam. Mattoru aksharam enne uyarathilekku kondupokunnu." },
    },
    // TEAM 16: Dominos -> Opticals -> Couples corridor -> Foodys
    {
      teamId: "TEAM016",
      teamName: "Shadow Ops",
      r1: { loc: "Dominos", ans: ["dominos", "dominos pizza"], clue: "Kaliyile kallukal veezhaanalla ivide. Onnin pinnaale onnaayi nirannu nilkkum..." },
      r2: { loc: "Opticals", ans: ["opticals", "optical"], clue: "Akale ullath aduthakkanam ennu illa. Aduthullath vyakthamaakkanam ennu mathram." },
      r3: { loc: "Couples Corridor", ans: ["couples corridor", "couples"], clue: "Oru equation pole chinthikku: 1 + 1 ≠ 2. Mathematics-il ithu thettaanu." },
      r4: { loc: "Foodys Canteen", ans: ["foodys", "foodys canteen"], clue: "Chilar ivide kaal kondu kanakkukootum, chilar shabdam kondu ayalkkare ariyikkum..." },
    },
    // TEAM 17: Main Gate -> Balaji -> Greenos -> SJT Annex
    {
      teamId: "TEAM017",
      teamName: "Iron Legion",
      r1: { loc: "Main Gate", ans: ["main gate", "mb", "gate"], clue: "Raavile varunnavar enne kaanum, Vaikunneram pokunnavar enne veendum kaanum..." },
      r2: { loc: "Balaji Store", ans: ["balaji", "balaji store"], clue: "Enne thedivarunnavar ore kaaryam chodikkilla. Oraalkku varikal venam, mattoraalkku varaykkaan..." },
      r3: { loc: "Greenos", ans: ["greenos"], clue: "Pachayaya bhoomiyil, pachayaya manushyar, pachapidikunna kalakal prakadipikkunna idam." },
      r4: { loc: "SJT Annex", ans: ["sjt annex", "sjta"], clue: "Valiyoru perinte arikil cheriyoru thudarchayaayi njaan." },
    },
    // TEAM 18: LH Medical shop -> Gandhi -> SJTA -> PRP
    {
      teamId: "TEAM018",
      teamName: "Nova Syndicate",
      r1: { loc: "LH Medical Shop", ans: ["medical shop", "lh medical"], clue: "Oru vazhi undu, oru vashath penkuttykalude lokam. Nadannu pokumbol kaanaan marakkunna oru cheriya idam." },
      r2: { loc: "Gandhi Block", ans: ["gandhi", "gandhi block"], clue: "Chila frames-il kathakal undaakum, chila lines-il kettidangal." },
      r3: { loc: "SJT Annex", ans: ["sjt annex", "sjta"], clue: "Moonnu sahodharangal ore kudumbathil. Oraalkku classukal, oraalkku aaghoshangal..." },
      r4: { loc: "PRP Block", ans: ["prp", "prp block"], clue: "Ente perile aadya vaakku oru kadalinte sampath, randamatheth oru anveshanam..." },
    },
    // TEAM 19: Woodys -> SJT -> Gandhi -> TT Annex
    {
      teamId: "TEAM019",
      teamName: "Titanium Cyber",
      r1: { loc: "Woodys", ans: ["woodys"], clue: "Ente mel avakaasham parayaanaarum adhikakaalam nilkkarilla. Chilar varum, avarude paadukal maathram baakkivekkum..." },
      r2: { loc: "SJT Block", ans: ["sjt", "sjt block"], clue: "Enne ariyunnavar ente peru churukki vilikkum. Pakshe aa churukkapperinu pinniloru pazhaya kathayundu..." },
      r3: { loc: "Gandhi Block", ans: ["gandhi", "gandhi block"], clue: "Kaiyil aayudham illayirunnu, pakshe oru raajyathe maatti. Kallum cementum kondalla oru lokam paniyunnath..." },
      r4: { loc: "TT Annex", ans: ["tt annex"], clue: "Oru veetinu chilappol oru muri adhikamaayi venam. Oru kathaykku chilappol oru adhyayam koodi venam..." },
    },
    // TEAM 20: Darling(gate) -> DC -> SJT petti kada -> Lake
    {
      teamId: "TEAM020",
      teamName: "Zenith Recon",
      r1: { loc: "Darling Canteen", ans: ["darling", "darling canteen"], clue: "Pranayathil njan oru vilipperu, campusil njan oru destination. Vishappu enne vazhi kaanikkum..." },
      r2: { loc: "DC Food Court", ans: ["dc", "dc food court"], clue: "Classil kelkkaatha shabdangal, libraryil kittatha sugandhangal, pusthakathil kaanatha ruchikal..." },
      r3: { loc: "SJT Petti Kada", ans: ["petti kada", "sjt petti kada"], clue: "Irupathiyanchinte aaghosham theertha oru smarakaminarikil, arivalla ivide vilkkunnath..." },
      r4: { loc: "VIT Lake", ans: ["lake", "vit lake"], clue: "Oru nimisham polum nadakkathe orupadu kaazhchakal njan kaanum. Ente mukham maari maari varum..." },
    },
  ];

  for (const t of teamsData) {
    // Upsert Team
    const team = await prisma.team.upsert({
      where: { teamId: t.teamId },
      create: {
        teamId: t.teamId,
        teamName: t.teamName,
        isActive: true,
        progress: {
          create: {
            state: "QUALIFIER_ACTIVE",
            currentRound: 0,
            currentStep: 0,
          },
        },
      },
      update: {
        teamName: t.teamName,
        isActive: true,
      },
    });

    // Create Team Specific Round Configurations (Round 0 to 4)
    await prisma.roundConfig.createMany({
      data: [
        // Round 0 (Qualifier)
        {
          teamId: team.teamId,
          roundNumber: 0,
          title: "Qualifier: Gatekeeper's Trial",
          clueType: "TEXT",
          clueText: "What is 15 × 4?",
          acceptedAnswers: JSON.stringify(["60", "sixty"]),
        },
        // Round 1
        {
          teamId: team.teamId,
          roundNumber: 1,
          title: `Round 1: ${t.r1.loc}`,
          clueType: "TEXT",
          locationText: t.r1.clue,
          locationAnswers: JSON.stringify(t.r1.ans),
          clueText: "",
          acceptedAnswers: JSON.stringify(["key", "code", "valid"]),
        },
        // Round 2
        {
          teamId: team.teamId,
          roundNumber: 2,
          title: `Round 2: ${t.r2.loc}`,
          clueType: "TEXT",
          locationText: t.r2.clue,
          locationAnswers: JSON.stringify(t.r2.ans),
          clueText: "",
          acceptedAnswers: JSON.stringify(["key", "code", "valid"]),
        },
        // Round 3
        {
          teamId: team.teamId,
          roundNumber: 3,
          title: `Round 3: ${t.r3.loc}`,
          clueType: "TEXT",
          locationText: t.r3.clue,
          locationAnswers: JSON.stringify(t.r3.ans),
          clueText: "",
          subQuestions: JSON.stringify([
            { id: 1, question: "Inspect the primary physical monument/sign at this location.", acceptedAnswers: ["valid", "yes", "verified"] },
            { id: 2, question: "Identify the engraved code or key number.", acceptedAnswers: ["2026", "101", "valid"] },
          ]),
          acceptedAnswers: JSON.stringify(["all_subquestions_valid"]),
        },
        // Round 4
        {
          teamId: team.teamId,
          roundNumber: 4,
          title: `Round 4: ${t.r4.loc}`,
          clueType: "TEXT",
          locationText: t.r4.clue,
          locationAnswers: JSON.stringify(t.r4.ans),
          clueText: "",
          acceptedAnswers: JSON.stringify(["TREASURE", "treasure"]),
        },
      ],
    });
  }

  console.log("🎉 Successfully seeded 20 teams with custom Malayalam clues & unique paper destinations!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
