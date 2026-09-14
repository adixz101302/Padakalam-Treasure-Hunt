import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for all rounds...");

  // Ensure public/images directory exists
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Create Morse Code SVG for Round 3
  const morseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%">
  <rect width="800" height="400" fill="#0B0F17" rx="16"/>
  <rect x="20" y="20" width="760" height="360" fill="none" stroke="#D97706" stroke-width="2" stroke-dasharray="6,6" rx="12"/>
  <text x="400" y="70" fill="#F59E0B" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle" letter-spacing="4">TOP SECRET // LOCATION CIPHER</text>
  <text x="400" y="105" fill="#64748B" font-family="sans-serif" font-size="14" text-anchor="middle">DECODE THE MORSE SEQUENCE TO DISCOVER YOUR PHYSICAL DESTINATION</text>
  <rect x="50" y="140" width="700" height="180" fill="#151D2A" rx="8" stroke="#334155" stroke-width="1"/>
  
  <!-- Line 1: CAMPUS ( -.-.  .-  --  .--.  ..-  ... ) -->
  <text x="400" y="200" fill="#FBBF24" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle" letter-spacing="6">-.-.   .-   --   .--.   ..-   ...</text>
  
  <!-- Line 2: GARDEN ( --.  .-  .-.  -..  .  -. ) -->
  <text x="400" y="270" fill="#FBBF24" font-family="monospace" font-size="28" font-weight="bold" text-anchor="middle" letter-spacing="6">--.   .-   .-.   -..   .   -.</text>
  
  <text x="400" y="355" fill="#94A3B8" font-family="monospace" font-size="12" text-anchor="middle">TARGET: CAMPUS GARDEN</text>
</svg>`;

  fs.writeFileSync(path.join(imagesDir, "morse_r3.svg"), morseSvg);

  // Create Decoy / Hidden Anagram SVG for Round 4
  const decoySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#090D16"/>
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bgGlow)" rx="16"/>
  <rect x="15" y="15" width="770" height="470" fill="none" stroke="#F59E0B" stroke-width="2" rx="12"/>
  
  <!-- Decorative Grid & Blueprint Elements -->
  <line x1="100" y1="50" x2="700" y2="50" stroke="#334155" stroke-width="1"/>
  <line x1="100" y1="450" x2="700" y2="450" stroke="#334155" stroke-width="1"/>
  <circle cx="400" cy="250" r="140" fill="none" stroke="#D97706" stroke-width="1" stroke-dasharray="4,4"/>
  <circle cx="400" cy="250" r="80" fill="none" stroke="#334155" stroke-width="1"/>
  
  <text x="400" y="60" fill="#F59E0B" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle" letter-spacing="3">SECTOR 04 // ANOMALY ANALYSIS</text>
  <text x="400" y="90" fill="#94A3B8" font-family="sans-serif" font-size="13" text-anchor="middle">DO NOT TRUST THE LOCATION. SEARCH THE ARTIFACT ITSELF.</text>
  
  <!-- Hidden Anagram Letters subtly embedded across diagram coordinates -->
  <!-- T -->
  <g transform="translate(180, 180)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">T</text>
  </g>
  <!-- R -->
  <g transform="translate(320, 150)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">R</text>
  </g>
  <!-- E -->
  <g transform="translate(480, 150)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">E</text>
  </g>
  <!-- A -->
  <g transform="translate(620, 180)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">A</text>
  </g>
  <!-- S -->
  <g transform="translate(240, 320)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">S</text>
  </g>
  <!-- U -->
  <g transform="translate(400, 360)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">U</text>
  </g>
  <!-- R -->
  <g transform="translate(560, 320)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#475569"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">R</text>
  </g>
  <!-- E -->
  <g transform="translate(400, 250)">
    <circle cx="0" cy="0" r="18" fill="#1E293B" stroke="#F59E0B" stroke-width="2"/>
    <text x="0" y="6" fill="#FBBF24" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">E</text>
  </g>

  <text x="400" y="440" fill="#64748B" font-family="monospace" font-size="12" text-anchor="middle">Letters scattered: [T, R, E, A, S, U, R, E] // Arrange into a single 8-letter master word</text>
</svg>`;

  fs.writeFileSync(path.join(imagesDir, "decoy_r4.svg"), decoySvg);

  // Clear existing database
  await prisma.winner.deleteMany();
  await prisma.finalist.deleteMany();
  await prisma.submissionAttempt.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.roundConfig.deleteMany();
  await prisma.finalKey.deleteMany();
  await prisma.teamProgress.deleteMany();
  await prisma.team.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.event.deleteMany();

  // Create Event Record
  await prisma.event.create({
    data: {
      name: "ANVESHIPIN KANDETHUM | PADAKALAM 2.0",
      status: "ACTIVE",
      isLocked: false,
    },
  });

  // Create Admin
  const adminPassHash = await bcrypt.hash("admin123", 10);
  await prisma.admin.create({
    data: {
      username: "admin",
      passwordHash: adminPassHash,
      role: "admin",
    },
  });
  console.log("✅ Admin account created: admin / admin123");

  // Create Master Round Configurations (Global Templates 0 to 5)
  await prisma.roundConfig.createMany({
    data: [
      {
        roundNumber: 0,
        title: "Qualifier: The Gatekeeper's Trial",
        clueType: "TEXT",
        clueText: "What is 15 × 4?",
        acceptedAnswers: JSON.stringify(["60", "sixty"]),
        hint: "Multiply 15 by 4 to enter the hunt.",
      },
      {
        roundNumber: 1,
        title: "Round 1: Direct Location Reconnaissance",
        clueType: "TEXT",
        locationText: "Go to the Main Entrance of the Central Auditorium.",
        locationAnswers: JSON.stringify(["auditorium", "central auditorium", "main entrance"]),
        clueText: "Locate the primary apparatus designed to measure environmental temperature.",
        acceptedAnswers: JSON.stringify(["thermometer", "temperature meter", "temperature gauge"]),
        hint: "Look near the entrance foyer wall mounted sensors.",
      },
      {
        roundNumber: 2,
        title: "Round 2: Numerical Cipher & Mirror Crypt",
        clueType: "NUMBER",
        encodedNumbers: "16 - 1 - 18 - 11",
        locationAnswers: JSON.stringify(["PARK", "park"]),
        clueText: "Find the metallic sundial facing the northern fountain.",
        clueTransform: "MIRRORED_JUMBLED",
        acceptedAnswers: JSON.stringify(["sundial", "sun dial", "metallic sundial"]),
        hint: "16=P, 1=A, 18=R, 11=K (PARK). Unjumble and reverse the clue words.",
      },
      {
        roundNumber: 3,
        title: "Round 3: Morse Code & Field Recon",
        clueType: "MORSE",
        encodedNumbers: "-.-. .- -- .--. ..- ...",
        locationText: "Decoded location revealed by morse",
        locationAnswers: JSON.stringify(["CAMPUS", "campus", "campus garden"]),
        subQuestions: JSON.stringify([
          {
            id: 1,
            question: "What text is inscribed on the wooden memorial bench?",
            acceptedAnswers: ["founding batch", "batch 2020", "alumni batch", "alumni"],
          },
          {
            id: 2,
            question: "How many stone lanterns line the eastern flower path?",
            acceptedAnswers: ["4", "four"],
          },
          {
            id: 3,
            question: "What color is the floral trellis entrance archway?",
            acceptedAnswers: ["emerald", "green", "dark green"],
          },
          {
            id: 4,
            question: "What 4-digit number is engraved on the bronze fountain plaque?",
            acceptedAnswers: ["2026", "1947", "9821"],
          },
        ]),
        acceptedAnswers: JSON.stringify(["all_subquestions_valid"]),
        hint: "Decode the morse to find the location, then inspect the surroundings.",
      },
      {
        roundNumber: 4,
        title: "Round 4: The Decoy Anomaly",
        clueType: "DECOY",
        imagePath: "/images/decoy_r4.svg",
        locationAnswers: JSON.stringify(["SECTOR 04", "sector 4", "sector 04", "anomaly"]),
        clueText: "Disregard the map coordinates. Extract the hidden glyphs embedded within the visual schematic and assemble the word.",
        acceptedAnswers: JSON.stringify(["TREASURE", "treasure"]),
        hint: "Anagram of the 8 embedded letters: T-R-E-A-S-U-R-E.",
      },
      {
        roundNumber: 5,
        title: "Final Round: The Golden Key Expedition",
        clueType: "TEXT",
        locationText: "Ascend to the Observatory Tower - Room 304",
        clueText: "Search behind the celestial globe inside the vault compartment to recover the physical key to the treasure chest!",
        acceptedAnswers: JSON.stringify(["GOLDEN_KEY_2026", "VICTORY"]),
        hint: "Physically sprint to Room 304, grab the key, and unlock the chest before any other finalist!",
      },
    ],
  });
  console.log("✅ Master Round Configurations (0 to 5) created.");

  // Teams Configuration with unique per-round puzzles
  const teamsData = [
    {
      teamId: "TEAM001",
      teamName: "Alpha Vanguard",
      pin: "1111",
      customQualifier: {
        question: "Solve: (24 / 3) + 12",
        answers: ["20", "twenty"],
      },
      customR1: {
        location: "Go to North Library Archive Section.",
        clue: "Find the rotating celestial globe on the reference desk.",
        answers: ["globe", "celestial globe"],
      },
      customR2: {
        numbers: "16 - 1 - 18 - 11", // PARK
        clue: "Find the metallic sundial facing the northern fountain.",
        answers: ["sundial", "sun dial"],
      },
    },
    {
      teamId: "TEAM002",
      teamName: "Shadow Strikers",
      pin: "2222",
      customQualifier: {
        question: "What has a head and a tail, but no body?",
        answers: ["coin", "a coin"],
      },
      customR1: {
        location: "Go to Science Complex Lab 2.",
        clue: "Find the triangular glass optical prism on the laser bench.",
        answers: ["prism", "glass prism", "optical prism"],
      },
      customR2: {
        numbers: "16 - 15 - 18 - 3 - 8", // PORCH
        clue: "Locate the antique bronze bell mounted on the stone arch.",
        answers: ["bell", "bronze bell"],
      },
    },
    {
      teamId: "TEAM003",
      teamName: "Phoenix Cyber",
      pin: "3333",
      customQualifier: {
        question: "Solve: (9 × 8) - 12",
        answers: ["60", "sixty"],
      },
      customR1: {
        location: "Go to Quadrangle Fountain.",
        clue: "Find the brass nautical compass mounted near the stone basin.",
        answers: ["compass", "brass compass", "nautical compass"],
      },
      customR2: {
        numbers: "1 - 20 - 20 - 9 - 3", // ATTIC
        clue: "Discover the wooden ship helm stored in the corner vault.",
        answers: ["helm", "ship helm", "wheel"],
      },
    },
    {
      teamId: "TEAM004",
      teamName: "Titan Force",
      pin: "4444",
      customQualifier: {
        question: "What gets wetter the more it dries?",
        answers: ["towel", "a towel"],
      },
      customR1: {
        location: "Go to the Clocktower Base.",
        clue: "Find the swinging brass pendulum inside the glass cabinet.",
        answers: ["pendulum", "clock pendulum"],
      },
      customR2: {
        numbers: "7 - 1 - 18 - 4 - 5 - 14", // GARDEN
        clue: "Find the carved stone gargoyle guardian watching the path.",
        answers: ["gargoyle", "stone gargoyle"],
      },
    },
    {
      teamId: "TEAM005",
      teamName: "Valkyrie Recon",
      pin: "5555",
      customQualifier: {
        question: "Solve: 50 - 18",
        answers: ["32", "thirty two", "thirty-two"],
      },
      customR1: {
        location: "Go to the Botanical Greenhouse.",
        clue: "Find the humidity meter (hygrometer) hanging near the orchids.",
        answers: ["hygrometer", "humidity meter"],
      },
      customR2: {
        numbers: "16 - 12 - 1 - 26 - 1", // PLAZA
        clue: "Locate the copper wind chime near the flagpole pedestal.",
        answers: ["wind chime", "chime", "windchime"],
      },
    },
    {
      teamId: "TEAM006",
      teamName: "Nexus Rangers",
      pin: "6666",
      customQualifier: {
        question: "What has keys but no locks, space but no room, you can enter but can't go outside?",
        answers: ["keyboard", "a keyboard"],
      },
      customR1: {
        location: "Go to Mechanical Workshop Bay A.",
        clue: "Find the digital vernier caliper on the workbench.",
        answers: ["caliper", "vernier caliper"],
      },
      customR2: {
        numbers: "2 - 18 - 9 - 4 - 7 - 5", // BRIDGE
        clue: "Find the brass padlock securing the chain barrier.",
        answers: ["padlock", "lock", "brass padlock"],
      },
    },
    {
      teamId: "TEAM007",
      teamName: "Specter Unit",
      pin: "7777",
      customQualifier: {
        question: "Solve: 12 × 12 - 44",
        answers: ["100", "one hundred"],
      },
      customR1: {
        location: "Go to Audio Studio Booth 3.",
        clue: "Find the vintage condenser microphone on the boom arm.",
        answers: ["microphone", "condenser microphone", "mic"],
      },
      customR2: {
        numbers: "20 - 15 - 23 - 5 - 18", // TOWER
        clue: "Locate the miniature brass spyglass in the observatory cabinet.",
        answers: ["spyglass", "telescope", "brass spyglass"],
      },
    },
    {
      teamId: "TEAM008",
      teamName: "Oracle Seekers",
      pin: "8888",
      customQualifier: {
        question: "What can travel around the world while staying in a corner?",
        answers: ["stamp", "a stamp", "postage stamp"],
      },
      customR1: {
        location: "Go to Sports Complex Pavilion.",
        clue: "Find the digital stopwatch on the referee desk.",
        answers: ["stopwatch", "digital stopwatch"],
      },
      customR2: {
        numbers: "1 - 18 - 3 - 8 - 9 - 22 - 5", // ARCHIVE
        clue: "Find the leather bound ledger stamped with the year 1920.",
        answers: ["ledger", "book", "leather ledger"],
      },
    },
    {
      teamId: "TEAM009",
      teamName: "Aegis Knights",
      pin: "9999",
      customQualifier: {
        question: "Solve: (100 / 4) + 15",
        answers: ["40", "forty"],
      },
      customR1: {
        location: "Go to Art Gallery Corridor.",
        clue: "Find the bronze sculpture of the winged Pegasus.",
        answers: ["pegasus", "sculpture", "bronze sculpture"],
      },
      customR2: {
        numbers: "22 - 1 - 21 - 12 - 20", // VAULT
        clue: "Discover the heavy steel combination safe in the recess.",
        answers: ["safe", "steel safe", "vault"],
      },
    },
    {
      teamId: "TEAM010",
      teamName: "Vanguard Elite",
      pin: "1010",
      customQualifier: {
        question: "The more of this there is, the less you see. What is it?",
        answers: ["darkness", "the dark", "fog"],
      },
      customR1: {
        location: "Go to Central Auditorium Balcony.",
        clue: "Find the theatrical spotlight fitted with the amber optical gel.",
        answers: ["spotlight", "amber gel", "light"],
      },
      customR2: {
        numbers: "8 - 1 - 12 - 12", // HALL
        clue: "Locate the ceremonial ceremonial gavel resting on the podium.",
        answers: ["gavel", "wooden gavel"],
      },
    },
  ];

  for (const t of teamsData) {
    const team = await prisma.team.create({
      data: {
        teamId: t.teamId,
        teamName: t.teamName,
        pin: t.pin,
        progress: {
          create: {
            state: "QUALIFIER_ACTIVE",
            currentRound: 0,
          },
        },
      },
    });

    // Qualifier Override
    if (t.customQualifier) {
      await prisma.roundConfig.create({
        data: {
          teamId: t.teamId,
          roundNumber: 0,
          title: `Qualifier: ${t.teamName} Special Trial`,
          clueType: "TEXT",
          clueText: t.customQualifier.question,
          acceptedAnswers: JSON.stringify(t.customQualifier.answers),
          hint: "Solve your team's assigned riddle/problem.",
        },
      });
    }

    // Round 1 Override
    if (t.customR1) {
      await prisma.roundConfig.create({
        data: {
          teamId: t.teamId,
          roundNumber: 1,
          title: `Round 1: ${t.teamName} Special Target`,
          clueType: "TEXT",
          locationText: t.customR1.location,
          clueText: t.customR1.clue,
          acceptedAnswers: JSON.stringify(t.customR1.answers),
          hint: "Navigate to your specific sector.",
        },
      });
    }

    // Round 2 Override
    if (t.customR2) {
      await prisma.roundConfig.create({
        data: {
          teamId: t.teamId,
          roundNumber: 2,
          title: `Round 2: ${t.teamName} Numerical Cipher & Mirror Crypt`,
          clueType: "NUMBER",
          encodedNumbers: t.customR2.numbers,
          clueText: t.customR2.clue,
          clueTransform: "MIRRORED_JUMBLED",
          acceptedAnswers: JSON.stringify(t.customR2.answers),
          hint: "Decode the number indices into letters, then unscramble the mirrored clue.",
        },
      });
    }

    console.log(`✅ Created Team: ${team.teamId} - ${team.teamName}`);
  }

  // Create Final Keys
  await prisma.finalKey.createMany({
    data: [
      {
        teamId: "TEAM001",
        keyCode: "ALPHA_KEY_981",
        clueText: "Alpha Final Key: Behind the antique telescope in Room 304",
        location: "Observatory Telescope Compartment",
      },
      {
        teamId: "TEAM002",
        keyCode: "BETA_KEY_442",
        clueText: "Beta Final Key: Beneath the star chart map table in Room 304",
        location: "Map Table Vault",
      },
      {
        teamId: null, // Shared fallback key
        keyCode: "MASTER_GOLDEN_KEY_777",
        clueText: "Master Golden Key: Inside the gilded iron lockbox on the central pedestal",
        location: "Central Pedestal in Room 304",
      },
    ],
  });

  console.log("🌱 Database seeding completed successfully for all rounds!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
